-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  starting_balance numeric(15,2) DEFAULT 1000.00,
  current_balance numeric(15,2) DEFAULT 1000.00,
  currency text DEFAULT 'USD',
  default_risk_percentage numeric(5,2) DEFAULT 0.5,
  theme text DEFAULT 'dark',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE: account_events
CREATE TABLE account_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text CHECK (event_type IN ('deposit', 'withdrawal', 'adjustment', 'reset')),
  amount numeric(15,2) NOT NULL,
  note text,
  event_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- TABLE: trades
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  trade_date date NOT NULL,
  trade_time_utc time NOT NULL,
  date_logged timestamptz DEFAULT now(),
  session text,
  analysis_timeframe text NOT NULL,
  entry_timeframe text NOT NULL,
  symbol text NOT NULL,
  asset_class text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('Long', 'Short')),
  schematic text NOT NULL,
  entry_event text NOT NULL,
  fundamental_bias text CHECK (fundamental_bias IN ('Bullish', 'Bearish', 'Neutral')),
  fundamental_aligned text CHECK (fundamental_aligned IN ('Yes', 'No', 'Partial')),
  fundamental_note text,
  criteria_checked jsonb DEFAULT '[]',
  entry_price numeric(15,5),
  stop_loss_price numeric(15,5),
  tp_levels jsonb DEFAULT '[]',
  num_tp_levels integer,
  risk_percentage numeric(5,2),
  risk_amount_usd numeric(15,2),
  weighted_avg_rr_planned numeric(10,4),
  actual_rr_achieved numeric(10,4),
  position_size numeric(15,5),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Partial', 'Closed - Win', 'Closed - Loss', 'Breakeven', 'Cancelled')),
  breakeven_price numeric(15,5),
  tps_hit jsonb DEFAULT '[]',
  gross_pnl numeric(15,2) DEFAULT 0,
  fee_type text CHECK (fee_type IN ('Spread', 'Commission', 'Swap', 'Spread + Commission', 'Other')),
  fee_amount numeric(15,2) DEFAULT 0,
  fee_in_pips boolean DEFAULT false,
  pip_value numeric(15,5),
  net_pnl numeric(15,2) DEFAULT 0,
  analysis_platform text DEFAULT 'TradingView',
  execution_platform text CHECK (execution_platform IN ('CTrader', 'MetaTrader 5', 'MetaTrader 4', 'Other')),
  broker text,
  plan_followed boolean,
  mistake_category text,
  confidence_level integer CHECK (confidence_level BETWEEN 1 AND 5),
  would_take_again boolean,
  pre_trade_reasoning text,
  post_trade_lesson text,
  pre_trade_images jsonb DEFAULT '[]',
  post_trade_images jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TABLE: user_settings
CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  criteria_list jsonb DEFAULT '[]',
  entry_events_list jsonb DEFAULT '[]',
  asset_list jsonb DEFAULT '[]',
  mistake_categories_list jsonb DEFAULT '[]',
  broker_list jsonb DEFAULT '[]',
  execution_platforms_list jsonb DEFAULT '[]',
  sessions_list jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Function and Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
BEFORE UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function and Trigger to recalculate current_balance
CREATE OR REPLACE FUNCTION recalculate_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_start numeric(15,2);
  v_deposits numeric(15,2);
  v_withdrawals numeric(15,2);
  v_adjustments numeric(15,2);
  v_trade_pnl numeric(15,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  SELECT starting_balance INTO v_start FROM profiles WHERE id = v_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_deposits FROM account_events WHERE user_id = v_user_id AND event_type = 'deposit';
  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals FROM account_events WHERE user_id = v_user_id AND event_type = 'withdrawal';
  SELECT COALESCE(SUM(amount), 0) INTO v_adjustments FROM account_events WHERE user_id = v_user_id AND (event_type = 'adjustment' OR event_type = 'reset');

  SELECT COALESCE(SUM(net_pnl), 0) INTO v_trade_pnl 
  FROM trades 
  WHERE user_id = v_user_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven');

  UPDATE profiles 
  SET current_balance = v_start + v_deposits - v_withdrawals + v_adjustments + v_trade_pnl
  WHERE id = v_user_id;

  RETURN NULL; -- For AFTER trigger, return doesn't matter much
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_account_events_balance
AFTER INSERT OR UPDATE OR DELETE ON account_events
FOR EACH ROW
EXECUTE FUNCTION recalculate_balance();

CREATE TRIGGER tr_trades_balance
AFTER INSERT OR UPDATE OR DELETE ON trades
FOR EACH ROW
EXECUTE FUNCTION recalculate_balance();

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- profile RLS
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- account_events RLS
CREATE POLICY "Users can view own account events" ON account_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own account events" ON account_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own account events" ON account_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own account events" ON account_events FOR DELETE USING (auth.uid() = user_id);

-- trades RLS
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON trades FOR DELETE USING (auth.uid() = user_id);

-- user_settings RLS
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to create profile and settings on user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, starting_balance, current_balance)
  VALUES (new.id, new.email, 1000.00, 1000.00);

  INSERT INTO public.user_settings (
    user_id, 
    criteria_list, 
    entry_events_list, 
    asset_list, 
    mistake_categories_list, 
    broker_list, 
    execution_platforms_list,
    sessions_list
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
      {"symbol":"XAGUSD","asset_class":"Commodities","custom":false},
      {"symbol":"USOIL","asset_class":"Commodities","custom":false},
      {"symbol":"UKOIL","asset_class":"Commodities","custom":false},
      {"symbol":"NATGAS","asset_class":"Commodities","custom":false},
      {"symbol":"COPPER","asset_class":"Commodities","custom":false},
      {"symbol":"EURUSD","asset_class":"Forex","custom":false},
      {"symbol":"GBPUSD","asset_class":"Forex","custom":false},
      {"symbol":"USDCAD","asset_class":"Forex","custom":false},
      {"symbol":"NZDUSD","asset_class":"Forex","custom":false},
      {"symbol":"USDCHF","asset_class":"Forex","custom":false},
      {"symbol":"GBPJPY","asset_class":"Forex","custom":false},
      {"symbol":"EURJPY","asset_class":"Forex","custom":false},
      {"symbol":"AUDUSD","asset_class":"Forex","custom":false},
      {"symbol":"USDJPY","asset_class":"Forex","custom":false},
      {"symbol":"AUDJPY","asset_class":"Forex","custom":false},
      {"symbol":"CADJPY","asset_class":"Forex","custom":false},
      {"symbol":"CHFJPY","asset_class":"Forex","custom":false},
      {"symbol":"EURAUD","asset_class":"Forex","custom":false},
      {"symbol":"EURCHF","asset_class":"Forex","custom":false},
      {"symbol":"EURGBP","asset_class":"Forex","custom":false},
      {"symbol":"GBPAUD","asset_class":"Forex","custom":false},
      {"symbol":"GBPCAD","asset_class":"Forex","custom":false},
      {"symbol":"NZDJPY","asset_class":"Forex","custom":false},
      {"symbol":"BTCUSD","asset_class":"Crypto","custom":false},
      {"symbol":"ETHUSD","asset_class":"Crypto","custom":false},
      {"symbol":"SOLUSD","asset_class":"Crypto","custom":false},
      {"symbol":"XRPUSD","asset_class":"Crypto","custom":false},
      {"symbol":"DOGEUSD","asset_class":"Crypto","custom":false},
      {"symbol":"ADAUSD","asset_class":"Crypto","custom":false},
      {"symbol":"AVAXUSD","asset_class":"Crypto","custom":false},
      {"symbol":"LINKUSD","asset_class":"Crypto","custom":false},
      {"symbol":"DOTUSD","asset_class":"Crypto","custom":false},
      {"symbol":"MATICUSD","asset_class":"Crypto","custom":false},
      {"symbol":"MSFT","asset_class":"Stocks","custom":false},
      {"symbol":"NVDA","asset_class":"Stocks","custom":false},
      {"symbol":"GOOGL","asset_class":"Stocks","custom":false},
      {"symbol":"AMZN","asset_class":"Stocks","custom":false},
      {"symbol":"TSLA","asset_class":"Stocks","custom":false},
      {"symbol":"AAPL","asset_class":"Stocks","custom":false},
      {"symbol":"META","asset_class":"Stocks","custom":false},
      {"symbol":"AMD","asset_class":"Stocks","custom":false},
      {"symbol":"NFLX","asset_class":"Stocks","custom":false},
      {"symbol":"CRM","asset_class":"Stocks","custom":false},
      {"symbol":"BABA","asset_class":"Stocks","custom":false},
      {"symbol":"UBER","asset_class":"Stocks","custom":false},
      {"symbol":"COIN","asset_class":"Stocks","custom":false},
      {"symbol":"PLTR","asset_class":"Stocks","custom":false},
      {"symbol":"YM1!","asset_class":"Futures","custom":false},
      {"symbol":"ES1!","asset_class":"Futures","custom":false},
      {"symbol":"NQ1!","asset_class":"Futures","custom":false},
      {"symbol":"MES1!","asset_class":"Futures","custom":false},
      {"symbol":"MYM1!","asset_class":"Futures","custom":false},
      {"symbol":"MNQ1!","asset_class":"Futures","custom":false},
      {"symbol":"RTY1!","asset_class":"Futures","custom":false},
      {"symbol":"M2K1!","asset_class":"Futures","custom":false},
      {"symbol":"CL1!","asset_class":"Futures","custom":false},
      {"symbol":"GC1!","asset_class":"Futures","custom":false},
      {"symbol":"SI1!","asset_class":"Futures","custom":false},
      {"symbol":"HG1!","asset_class":"Futures","custom":false},
      {"symbol":"ZB1!","asset_class":"Futures","custom":false},
      {"symbol":"ZN1!","asset_class":"Futures","custom":false},
      {"symbol":"DX1!","asset_class":"Futures","custom":false},
      {"symbol":"DXY","asset_class":"Indices","custom":false},
      {"symbol":"VIX","asset_class":"Indices","custom":false},
      {"symbol":"US30","asset_class":"Indices","custom":false},
      {"symbol":"US500","asset_class":"Indices","custom":false},
      {"symbol":"US100","asset_class":"Indices","custom":false},
      {"symbol":"DE40","asset_class":"Indices","custom":false},
      {"symbol":"UK100","asset_class":"Indices","custom":false},
      {"symbol":"JP225","asset_class":"Indices","custom":false},
      {"symbol":"AU200","asset_class":"Indices","custom":false},
      {"symbol":"FR40","asset_class":"Indices","custom":false},
      {"symbol":"EU50","asset_class":"Indices","custom":false}
    ]'::jsonb,
    '[
      {"id":"1","label":"Early Entry"},
      {"id":"2","label":"Late Entry"},
      {"id":"3","label":"Wrong Schematic Read"},
      {"id":"4","label":"Ignored Fundamentals"},
      {"id":"5","label":"Overtraded"},
      {"id":"6","label":"Entered After Hours (post 20:00)"},
      {"id":"7","label":"Widened Stop Loss"},
      {"id":"8","label":"Closed Early (Fear)"},
      {"id":"9","label":"Missed Entry (Hesitation)"},
      {"id":"10","label":"Wrong Direction"},
      {"id":"11","label":"No Manipulation Present"},
      {"id":"12","label":"None"}
    ]'::jsonb,
    '[
      {"id":"1","name":"Fusion Markets"}
    ]'::jsonb,
    '[
      {"id":"1","name":"CTrader"},
      {"id":"2","name":"MetaTrader 5"},
      {"id":"3","name":"MetaTrader 4"}
    ]'::jsonb,
    '[
      {"id":"asia","label":"Asia"},
      {"id":"london","label":"London"},
      {"id":"nyse","label":"NYSE"},
      {"id":"overlap","label":"London/NYSE Overlap"},
      {"id":"off-hours","label":"Off-Hours"}
    ]'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
