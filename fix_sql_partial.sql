-- VULNERABILITY 3: The SQL Trigger ignores 'Partial' trades.
-- If a user hits TP1 and takes $50, but leaves the trade "Partial" to run to TP2,
-- that $50 is REALIZED in their broker account. The journal balance MUST reflect this immediately!
-- We need to update the trigger to include 'Partial' trades in the balance calculation.

CREATE OR REPLACE FUNCTION trigger_master_recalculate()
RETURNS TRIGGER AS $$
DECLARE
  v_port_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_port_id := OLD.portfolio_id;
  ELSE
    v_port_id := NEW.portfolio_id;
  END IF;

  IF v_port_id IS NOT NULL THEN
    BEGIN
      UPDATE portfolios
      SET current_balance = starting_balance 
        + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
        - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type = 'withdrawal'), 0)
        + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = v_port_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial')), 0)
      WHERE id = v_port_id;
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore cascade locks
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Also need to run the Master Sync one more time to catch any past partials!
WITH calculated_balances AS (
  SELECT 
    p.id as portfolio_id,
    p.starting_balance 
    + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
    - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type = 'withdrawal'), 0)
    + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = v_port_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial')), 0) as exact_balance
  FROM portfolios p
)
UPDATE portfolios
SET current_balance = calculated_balances.exact_balance
FROM calculated_balances
WHERE portfolios.id = calculated_balances.portfolio_id;

