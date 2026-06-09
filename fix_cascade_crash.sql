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
        + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = v_port_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven')), 0)
      WHERE id = v_port_id;
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore cascade locks
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
