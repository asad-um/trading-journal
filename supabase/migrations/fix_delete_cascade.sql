-- We need to safely handle the Trigger firing when the parent portfolio is already deleted

CREATE OR REPLACE FUNCTION trigger_master_recalculate()
RETURNS TRIGGER AS $$
DECLARE
  v_port_id uuid;
  v_port_exists boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_port_id := OLD.portfolio_id;
  ELSE
    v_port_id := NEW.portfolio_id;
  END IF;

  IF v_port_id IS NOT NULL THEN
    -- Check if the portfolio actually still exists before trying to update it!
    -- This prevents the "Database error deleting user" crash during ON DELETE CASCADE wipes.
    SELECT EXISTS(SELECT 1 FROM portfolios WHERE id = v_port_id) INTO v_port_exists;
    
    IF v_port_exists THEN
      UPDATE portfolios
      SET current_balance = starting_balance 
        + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
        - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type = 'withdrawal'), 0)
        + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = v_port_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven')), 0)
      WHERE id = v_port_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
