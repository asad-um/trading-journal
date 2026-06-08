-- The issue with trade PnL not affecting the balance is because the incremental trigger 
-- is doing mathematically safe but overly strict checks, or the frontend isn't triggering it correctly.
-- Wait, if it worked locally but not for the user, it means the user's database doesn't have the updated trigger 
-- OR the trigger is completely broken.

-- Let's just create a completely brute-force, hyper-reliable Master Recalculation function that runs 
-- instantly whenever a trade or event occurs, instead of the buggy incremental logic.
-- O(N) is totally fine for thousands of trades since Postgres aggregates are insanely fast.

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
    UPDATE portfolios
    SET current_balance = starting_balance 
      + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
      - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = v_port_id AND event_type = 'withdrawal'), 0)
      + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = v_port_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven')), 0)
    WHERE id = v_port_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_account_events_balance_incremental ON account_events;
DROP TRIGGER IF EXISTS tr_trades_balance_incremental ON trades;

CREATE TRIGGER tr_account_events_master_sync
AFTER INSERT OR UPDATE OR DELETE ON account_events
FOR EACH ROW EXECUTE FUNCTION trigger_master_recalculate();

CREATE TRIGGER tr_trades_master_sync
AFTER INSERT OR UPDATE OR DELETE ON trades
FOR EACH ROW EXECUTE FUNCTION trigger_master_recalculate();

-- ALSO: The user requested the default account starting balance to be 0 instead of 1000.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, starting_balance, current_balance)
  VALUES (new.id, new.email, 0.00, 0.00);

  INSERT INTO public.portfolios (user_id, name, is_active, starting_balance, current_balance)
  VALUES (new.id, 'Main Account', true, 0.00, 0.00) RETURNING id INTO v_portfolio_id;

  INSERT INTO public.user_settings (
    user_id, 
    criteria_list, 
    entry_events_list, 
    asset_list, 
    mistake_categories_list, 
    broker_list, 
    execution_platforms_list
  ) VALUES (
    new.id,
    '[
      {"id":"1","label":"Fundamentals Aligned","order":1},
      {"id":"2","label":"Valid Schematic (Acc/Dist/Re-acc/Re-dist)","order":2},
      {"id":"3","label":"Manipulation Present","order":3},
      {"id":"4","label":"Volume Confluence","order":4},
      {"id":"5","label":"Absorption Identified","order":5},
      {"id":"6","label":"Divergence Present","order":6},
      {"id":"7","label":"Leader/Lagger Confluence","order":7},
      {"id":"8","label":"Time of Day / Session","order":8},
      {"id":"9","label":"ChoCh Valid","order":9},
      {"id":"10","label":"Demand/Supply Zone Entry","order":10},
      {"id":"11","label":"SOS / MSOW Confirmed","order":11},
      {"id":"12","label":"Correlating Asset Confluence","order":12}
    ]'::jsonb,
    '[
      {"id":"1","label":"Spring / Shakeout"},
      {"id":"2","label":"LPS (Last Point of Support)"},
      {"id":"3","label":"SOS (Sign of Strength)"},
      {"id":"4","label":"Test / Mitigation"},
      {"id":"5","label":"UTAD (Upthrust After Distribution)"},
      {"id":"6","label":"MSOW (Major Sign of Weakness)"},
      {"id":"7","label":"UPS (Upthrust)"},
      {"id":"8","label":"ChoCh Entry"},
      {"id":"9","label":"Re-accumulation Entry"},
      {"id":"10","label":"Re-distribution Entry"},
      {"id":"11","label":"Micro Structure Entry"},
      {"id":"12","label":"Back to Edge"}
    ]'::jsonb,
    '[
      {"symbol":"XAUUSD","asset_class":"Commodities","custom":false},
      {"symbol":"EURUSD","asset_class":"Forex","custom":false},
      {"symbol":"GBPUSD","asset_class":"Forex","custom":false},
      {"symbol":"US30","asset_class":"Indices","custom":false},
      {"symbol":"NAS100","asset_class":"Indices","custom":false},
      {"symbol":"BTCUSD","asset_class":"Crypto","custom":false}
    ]'::jsonb,
    '[
      {"id":"1","label":"Early Entry"},
      {"id":"2","label":"Late Entry"},
      {"id":"3","label":"Wrong Schematic Read"},
      {"id":"4","label":"Ignored Fundamentals"},
      {"id":"5","label":"Overtraded"},
      {"id":"6","label":"Revenge Trading"},
      {"id":"7","label":"Widened Stop Loss"},
      {"id":"8","label":"Closed Early (Fear)"},
      {"id":"9","label":"Missed Entry (Hesitation)"}
    ]'::jsonb,
    '[
      {"id":"1","name":"Fusion Markets"}
    ]'::jsonb,
    '[
      {"id":"1","name":"CTrader"},
      {"id":"2","name":"MetaTrader 5"}
    ]'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
