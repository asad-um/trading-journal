-- 1. Create Portfolios table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT false,
  starting_balance numeric(15,2) DEFAULT 1000.00,
  current_balance numeric(15,2) DEFAULT 1000.00,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);

-- 2. Add portfolio_id to trades and account_events
ALTER TABLE public.trades ADD COLUMN portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE;
ALTER TABLE public.account_events ADD COLUMN portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- 3. RLS for portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own portfolios" ON portfolios FOR ALL USING (auth.uid() = user_id);

-- 4. Rewrite the new user trigger to create a default portfolio instead of relying on the profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, starting_balance, current_balance)
  VALUES (new.id, new.email, 1000.00, 1000.00);

  INSERT INTO public.portfolios (user_id, name, is_active, starting_balance, current_balance)
  VALUES (new.id, 'Main Account', true, 1000.00, 1000.00) RETURNING id INTO v_portfolio_id;

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

-- 5. Update recalculate_balance to target portfolios instead of profiles
CREATE OR REPLACE FUNCTION recalculate_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio_id uuid;
  v_start numeric(15,2);
  v_deposits numeric(15,2);
  v_withdrawals numeric(15,2);
  v_adjustments numeric(15,2);
  v_trade_pnl numeric(15,2);
BEGIN
  -- Determine which portfolio to update
  IF TG_OP = 'DELETE' THEN
    v_portfolio_id := OLD.portfolio_id;
  ELSE
    v_portfolio_id := NEW.portfolio_id;
  END IF;

  -- Only calculate if linked to a specific portfolio (backwards compatibility fallback)
  IF v_portfolio_id IS NOT NULL THEN
      SELECT starting_balance INTO v_start FROM portfolios WHERE id = v_portfolio_id;

      SELECT COALESCE(SUM(amount), 0) INTO v_deposits FROM account_events WHERE portfolio_id = v_portfolio_id AND event_type = 'deposit';
      SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals FROM account_events WHERE portfolio_id = v_portfolio_id AND event_type = 'withdrawal';
      SELECT COALESCE(SUM(amount), 0) INTO v_adjustments FROM account_events WHERE portfolio_id = v_portfolio_id AND (event_type = 'adjustment' OR event_type = 'reset');

      SELECT COALESCE(SUM(net_pnl), 0) INTO v_trade_pnl 
      FROM trades 
      WHERE portfolio_id = v_portfolio_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven');

      UPDATE portfolios 
      SET current_balance = v_start + v_deposits - v_withdrawals + v_adjustments + v_trade_pnl
      WHERE id = v_portfolio_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

