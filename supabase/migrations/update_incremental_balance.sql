-- ==========================================
-- PHASE 2: INCREMENTAL BALANCE RECALCULATION
-- ==========================================
-- We are replacing the heavy O(N) SUM() table scans with an O(1) incremental math approach.
-- This ensures the database never slows down, even at 100,000 trades.

CREATE OR REPLACE FUNCTION update_portfolio_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_delta numeric(15,2) := 0;
  v_portfolio_id uuid;
BEGIN
  -- 1. Handle Account Events (Deposits, Withdrawals, Adjustments)
  IF TG_TABLE_NAME = 'account_events' THEN
    
    -- INSERT EVENT
    IF TG_OP = 'INSERT' THEN
      v_portfolio_id := NEW.portfolio_id;
      IF NEW.event_type IN ('deposit', 'adjustment', 'reset') THEN
        v_balance_delta := NEW.amount;
      ELSIF NEW.event_type = 'withdrawal' THEN
        v_balance_delta := -NEW.amount;
      END IF;
    
    -- UPDATE EVENT
    ELSIF TG_OP = 'UPDATE' THEN
      v_portfolio_id := NEW.portfolio_id;
      
      -- Remove old value effect
      IF OLD.event_type IN ('deposit', 'adjustment', 'reset') THEN
        v_balance_delta := v_balance_delta - OLD.amount;
      ELSIF OLD.event_type = 'withdrawal' THEN
        v_balance_delta := v_balance_delta + OLD.amount;
      END IF;

      -- Add new value effect
      IF NEW.event_type IN ('deposit', 'adjustment', 'reset') THEN
        v_balance_delta := v_balance_delta + NEW.amount;
      ELSIF NEW.event_type = 'withdrawal' THEN
        v_balance_delta := v_balance_delta - NEW.amount;
      END IF;
      
    -- DELETE EVENT
    ELSIF TG_OP = 'DELETE' THEN
      v_portfolio_id := OLD.portfolio_id;
      IF OLD.event_type IN ('deposit', 'adjustment', 'reset') THEN
        v_balance_delta := -OLD.amount;
      ELSIF OLD.event_type = 'withdrawal' THEN
        v_balance_delta := OLD.amount;
      END IF;
    END IF;


  -- 2. Handle Trades (PnL changes)
  ELSIF TG_TABLE_NAME = 'trades' THEN
    
    -- INSERT TRADE
    IF TG_OP = 'INSERT' THEN
      v_portfolio_id := NEW.portfolio_id;
      IF NEW.status IN ('Closed - Win', 'Closed - Loss', 'Breakeven') THEN
        v_balance_delta := COALESCE(NEW.net_pnl, 0);
      END IF;

    -- UPDATE TRADE
    ELSIF TG_OP = 'UPDATE' THEN
      v_portfolio_id := NEW.portfolio_id;
      
      -- If it was closed before, reverse the old PnL
      IF OLD.status IN ('Closed - Win', 'Closed - Loss', 'Breakeven') THEN
        v_balance_delta := v_balance_delta - COALESCE(OLD.net_pnl, 0);
      END IF;
      
      -- If it is closed now, apply the new PnL
      IF NEW.status IN ('Closed - Win', 'Closed - Loss', 'Breakeven') THEN
        v_balance_delta := v_balance_delta + COALESCE(NEW.net_pnl, 0);
      END IF;

    -- DELETE TRADE
    ELSIF TG_OP = 'DELETE' THEN
      v_portfolio_id := OLD.portfolio_id;
      IF OLD.status IN ('Closed - Win', 'Closed - Loss', 'Breakeven') THEN
        v_balance_delta := -COALESCE(OLD.net_pnl, 0);
      END IF;
    END IF;
    
  END IF;

  -- 3. Apply the final calculated delta to the portfolio
  IF v_portfolio_id IS NOT NULL AND v_balance_delta != 0 THEN
    UPDATE portfolios 
    SET current_balance = current_balance + v_balance_delta
    WHERE id = v_portfolio_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop the old inefficient triggers
DROP TRIGGER IF EXISTS tr_account_events_balance ON account_events;
DROP TRIGGER IF EXISTS tr_trades_balance ON trades;

-- Attach the new highly optimized triggers
CREATE TRIGGER tr_account_events_balance_incremental
AFTER INSERT OR UPDATE OR DELETE ON account_events
FOR EACH ROW EXECUTE FUNCTION update_portfolio_balance();

CREATE TRIGGER tr_trades_balance_incremental
AFTER INSERT OR UPDATE OR DELETE ON trades
FOR EACH ROW EXECUTE FUNCTION update_portfolio_balance();

