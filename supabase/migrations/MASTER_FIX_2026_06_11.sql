-- ============================================================
-- MASTER FIX SCRIPT — WJournal Database
-- Date: 2026-06-11
-- Purpose: One script to fix ALL known database issues
-- Instructions: Copy entire contents → Paste into Supabase SQL Editor → Run
-- ============================================================

-- ============================================================
-- SECTION 0: Remove deprecated fee/commission columns
-- ============================================================

-- Fees/commissions/spreads are no longer tracked in the UI.
-- Remove columns to keep schema clean. They are safe to drop
-- even if they contain old data because the app no longer references them.
ALTER TABLE trades DROP COLUMN IF EXISTS commission;
ALTER TABLE trades DROP COLUMN IF EXISTS spread_cost;
ALTER TABLE trades DROP COLUMN IF EXISTS fee_amount;
ALTER TABLE trades DROP COLUMN IF EXISTS fee_in_pips;
ALTER TABLE trades DROP COLUMN IF EXISTS pip_value;
ALTER TABLE trades DROP COLUMN IF EXISTS fee_type;

-- ============================================================
-- SECTION 1: Fix daily_checkins table (missing updated_at)
-- ============================================================

-- 1a. Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_checkins' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE daily_checkins ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END
$$;

-- 1b. Drop existing trigger on daily_checkins (if any) to prevent conflicts
DROP TRIGGER IF EXISTS update_daily_checkins_updated_at ON daily_checkins;

-- 1c. Create trigger to auto-update updated_at on daily_checkins
CREATE TRIGGER update_daily_checkins_updated_at
  BEFORE UPDATE ON daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 1d. Ensure unique constraint exists for user_id + checkin_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'daily_checkins_user_id_checkin_date_key'
  ) THEN
    ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_user_id_checkin_date_key 
    UNIQUE (user_id, checkin_date);
  END IF;
END
$$;

-- ============================================================
-- SECTION 2: Fix recalculate_balance trigger (portfolio_id version)
-- ============================================================

-- Drop old buggy triggers first
DROP TRIGGER IF EXISTS tr_balance_calc ON trades;
DROP TRIGGER IF EXISTS tr_balance_calc ON account_events;

-- Drop portfolio-aware triggers before dropping the function they depend on
DROP TRIGGER IF EXISTS tr_trades_balance ON trades;
DROP TRIGGER IF EXISTS tr_account_events_balance ON account_events;
DROP FUNCTION IF EXISTS recalculate_balance_v2();

-- Create NEW portfolio-aware balance function
CREATE OR REPLACE FUNCTION recalculate_balance_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_portfolio_id uuid;
  v_start numeric(15,2);
  v_deposits numeric(15,2);
  v_withdrawals numeric(15,2);
  v_adjustments numeric(15,2);
  v_trade_pnl numeric(15,2);
BEGIN
  -- Determine user_id and portfolio_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_portfolio_id := OLD.portfolio_id;
  ELSE
    v_user_id := NEW.user_id;
    v_portfolio_id := NEW.portfolio_id;
  END IF;
  
  -- Exit if no portfolio_id
  IF v_portfolio_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the portfolio's starting balance
  SELECT starting_balance INTO v_start FROM portfolios WHERE id = v_portfolio_id;

  -- Sum account events for THIS portfolio
  SELECT COALESCE(SUM(amount), 0) INTO v_deposits 
  FROM account_events 
  WHERE portfolio_id = v_portfolio_id AND event_type = 'deposit';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawals 
  FROM account_events 
  WHERE portfolio_id = v_portfolio_id AND event_type = 'withdrawal';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_adjustments 
  FROM account_events 
  WHERE portfolio_id = v_portfolio_id AND (event_type = 'adjustment' OR event_type = 'reset');

  -- Sum net_pnl for THIS portfolio (only closed trades)
  SELECT COALESCE(SUM(net_pnl), 0) INTO v_trade_pnl 
  FROM trades 
  WHERE portfolio_id = v_portfolio_id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial');

  -- Update portfolio current_balance
  UPDATE portfolios 
  SET current_balance = COALESCE(v_start, 0) + v_deposits - v_withdrawals + v_adjustments + v_trade_pnl
  WHERE id = v_portfolio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers on trades and account_events
DROP TRIGGER IF EXISTS tr_trades_balance ON trades;
CREATE TRIGGER tr_trades_balance
  AFTER INSERT OR UPDATE OR DELETE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_balance_v2();

DROP TRIGGER IF EXISTS tr_account_events_balance ON account_events;
CREATE TRIGGER tr_account_events_balance
  AFTER INSERT OR UPDATE OR DELETE ON account_events
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_balance_v2();

-- ============================================================
-- SECTION 3: Fix timeframe check constraints
-- ============================================================

ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_highest_timeframe;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_analysis_timeframe;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_entry_timeframe;

ALTER TABLE trades 
  ADD CONSTRAINT chk_highest_timeframe 
  CHECK (highest_timeframe IS NULL OR highest_timeframe IN ('Monthly', 'Weekly', 'Daily', '4H'));

ALTER TABLE trades 
  ADD CONSTRAINT chk_analysis_timeframe 
  CHECK (analysis_timeframe IS NULL OR analysis_timeframe IN ('4H', '2H', '1H', '30M', '15M'));

ALTER TABLE trades 
  ADD CONSTRAINT chk_entry_timeframe 
  CHECK (entry_timeframe IS NULL OR entry_timeframe IN ('15M', '5M', '1M', '30S', '15S', '5S'));

-- ============================================================
-- SECTION 4: Add timeframe columns if they don't exist
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'highest_timeframe'
  ) THEN
    ALTER TABLE trades ADD COLUMN highest_timeframe text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'analysis_timeframe'
  ) THEN
    ALTER TABLE trades ADD COLUMN analysis_timeframe text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'entry_timeframe'
  ) THEN
    ALTER TABLE trades ADD COLUMN entry_timeframe text;
  END IF;
END
$$;

-- Backfill existing trades
UPDATE trades 
  SET highest_timeframe = COALESCE(highest_timeframe, 'Daily'),
      analysis_timeframe = COALESCE(analysis_timeframe, '1H'),
      entry_timeframe = COALESCE(entry_timeframe, '15M')
  WHERE highest_timeframe IS NULL 
     OR analysis_timeframe IS NULL 
     OR entry_timeframe IS NULL;

-- ============================================================
-- SECTION 5: Update existing users with expanded assets
-- ============================================================

-- Update all user_settings.asset_list with expanded defaults
UPDATE user_settings 
SET asset_list = '[
  {"symbol":"XAUUSD","asset_class":"Commodities","custom":false},
  {"symbol":"XAGUSD","asset_class":"Commodities","custom":false},
  {"symbol":"USOIL","asset_class":"Commodities","custom":false},
  {"symbol":"UKOIL","asset_class":"Commodities","custom":false},
  {"symbol":"NATGAS","asset_class":"Commodities","custom":false},
  {"symbol":"COPPER","asset_class":"Commodities","custom":false},
  {"symbol":"WTI","asset_class":"Commodities","custom":false},
  {"symbol":"BRENT","asset_class":"Commodities","custom":false},
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
  {"symbol":"EURNZD","asset_class":"Forex","custom":false},
  {"symbol":"AUDCHF","asset_class":"Forex","custom":false},
  {"symbol":"AUDNZD","asset_class":"Forex","custom":false},
  {"symbol":"CADCHF","asset_class":"Forex","custom":false},
  {"symbol":"GBPNZD","asset_class":"Forex","custom":false},
  {"symbol":"GBPCHF","asset_class":"Forex","custom":false},
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
  {"symbol":"LTCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BNBUSD","asset_class":"Crypto","custom":false},
  {"symbol":"UNIUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ATOMUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ICPUSD","asset_class":"Crypto","custom":false},
  {"symbol":"APTUSD","asset_class":"Crypto","custom":false},
  {"symbol":"NEARUSD","asset_class":"Crypto","custom":false},
  {"symbol":"FILUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ETCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"AAVEUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ALGOUSD","asset_class":"Crypto","custom":false},
  {"symbol":"THETAUSD","asset_class":"Crypto","custom":false},
  {"symbol":"XTZUSD","asset_class":"Crypto","custom":false},
  {"symbol":"FTMUSD","asset_class":"Crypto","custom":false},
  {"symbol":"SANDUSD","asset_class":"Crypto","custom":false},
  {"symbol":"MANAUSD","asset_class":"Crypto","custom":false},
  {"symbol":"AXSUSD","asset_class":"Crypto","custom":false},
  {"symbol":"FLOWUSD","asset_class":"Crypto","custom":false},
  {"symbol":"CHZUSD","asset_class":"Crypto","custom":false},
  {"symbol":"HBARUSD","asset_class":"Crypto","custom":false},
  {"symbol":"QNTUSD","asset_class":"Crypto","custom":false},
  {"symbol":"VETUSD","asset_class":"Crypto","custom":false},
  {"symbol":"IOTAUSD","asset_class":"Crypto","custom":false},
  {"symbol":"EGLDUSD","asset_class":"Crypto","custom":false},
  {"symbol":"XLMUSD","asset_class":"Crypto","custom":false},
  {"symbol":"TRXUSD","asset_class":"Crypto","custom":false},
  {"symbol":"EOSUSD","asset_class":"Crypto","custom":false},
  {"symbol":"DASHUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ZECUSD","asset_class":"Crypto","custom":false},
  {"symbol":"XMRUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BCHUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BSVUSD","asset_class":"Crypto","custom":false},
  {"symbol":"NEOUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ONTUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BATUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ENJUSD","asset_class":"Crypto","custom":false},
  {"symbol":"COMPUSD","asset_class":"Crypto","custom":false},
  {"symbol":"MKRUSD","asset_class":"Crypto","custom":false},
  {"symbol":"YFIUSD","asset_class":"Crypto","custom":false},
  {"symbol":"UMAUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BALUSD","asset_class":"Crypto","custom":false},
  {"symbol":"CRVUSD","asset_class":"Crypto","custom":false},
  {"symbol":"SUSHIUSD","asset_class":"Crypto","custom":false},
  {"symbol":"RENUSD","asset_class":"Crypto","custom":false},
  {"symbol":"LRCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"KNCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BANDUSD","asset_class":"Crypto","custom":false},
  {"symbol":"STORJUSD","asset_class":"Crypto","custom":false},
  {"symbol":"OXTUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ZRXUSD","asset_class":"Crypto","custom":false},
  {"symbol":"GRTUSD","asset_class":"Crypto","custom":false},
  {"symbol":"CELOUSD","asset_class":"Crypto","custom":false},
  {"symbol":"WAVESUSD","asset_class":"Crypto","custom":false},
  {"symbol":"SNXUSD","asset_class":"Crypto","custom":false},
  {"symbol":"KSMUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ARUSD","asset_class":"Crypto","custom":false},
  {"symbol":"RVNUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ZILUSD","asset_class":"Crypto","custom":false},
  {"symbol":"ONEUSD","asset_class":"Crypto","custom":false},
  {"symbol":"SKLUSD","asset_class":"Crypto","custom":false},
  {"symbol":"RLCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"SXPUSD","asset_class":"Crypto","custom":false},
  {"symbol":"COTIUSD","asset_class":"Crypto","custom":false},
  {"symbol":"KEEPUSD","asset_class":"Crypto","custom":false},
  {"symbol":"TUSD","asset_class":"Crypto","custom":false},
  {"symbol":"PAXUSD","asset_class":"Crypto","custom":false},
  {"symbol":"USDCUSD","asset_class":"Crypto","custom":false},
  {"symbol":"DAIUSD","asset_class":"Crypto","custom":false},
  {"symbol":"BUSDUSD","asset_class":"Crypto","custom":false},
  {"symbol":"USDTUSD","asset_class":"Crypto","custom":false},
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
  {"symbol":"INTC","asset_class":"Stocks","custom":false},
  {"symbol":"ADBE","asset_class":"Stocks","custom":false},
  {"symbol":"PYPL","asset_class":"Stocks","custom":false},
  {"symbol":"NKE","asset_class":"Stocks","custom":false},
  {"symbol":"DIS","asset_class":"Stocks","custom":false},
  {"symbol":"V","asset_class":"Stocks","custom":false},
  {"symbol":"MA","asset_class":"Stocks","custom":false},
  {"symbol":"JPM","asset_class":"Stocks","custom":false},
  {"symbol":"BAC","asset_class":"Stocks","custom":false},
  {"symbol":"WFC","asset_class":"Stocks","custom":false},
  {"symbol":"C","asset_class":"Stocks","custom":false},
  {"symbol":"GS","asset_class":"Stocks","custom":false},
  {"symbol":"MS","asset_class":"Stocks","custom":false},
  {"symbol":"BLK","asset_class":"Stocks","custom":false},
  {"symbol":"BRK.B","asset_class":"Stocks","custom":false},
  {"symbol":"KO","asset_class":"Stocks","custom":false},
  {"symbol":"PEP","asset_class":"Stocks","custom":false},
  {"symbol":"WMT","asset_class":"Stocks","custom":false},
  {"symbol":"COST","asset_class":"Stocks","custom":false},
  {"symbol":"HD","asset_class":"Stocks","custom":false},
  {"symbol":"LOW","asset_class":"Stocks","custom":false},
  {"symbol":"TGT","asset_class":"Stocks","custom":false},
  {"symbol":"MCD","asset_class":"Stocks","custom":false},
  {"symbol":"SBUX","asset_class":"Stocks","custom":false},
  {"symbol":"PFE","asset_class":"Stocks","custom":false},
  {"symbol":"JNJ","asset_class":"Stocks","custom":false},
  {"symbol":"UNH","asset_class":"Stocks","custom":false},
  {"symbol":"ABBV","asset_class":"Stocks","custom":false},
  {"symbol":"MRK","asset_class":"Stocks","custom":false},
  {"symbol":"LLY","asset_class":"Stocks","custom":false},
  {"symbol":"TMO","asset_class":"Stocks","custom":false},
  {"symbol":"ABT","asset_class":"Stocks","custom":false},
  {"symbol":"BMY","asset_class":"Stocks","custom":false},
  {"symbol":"XOM","asset_class":"Stocks","custom":false},
  {"symbol":"CVX","asset_class":"Stocks","custom":false},
  {"symbol":"COP","asset_class":"Stocks","custom":false},
  {"symbol":"OXY","asset_class":"Stocks","custom":false},
  {"symbol":"SLB","asset_class":"Stocks","custom":false},
  {"symbol":"HAL","asset_class":"Stocks","custom":false},
  {"symbol":"BP","asset_class":"Stocks","custom":false},
  {"symbol":"SHEL","asset_class":"Stocks","custom":false},
  {"symbol":"TTE","asset_class":"Stocks","custom":false},
  {"symbol":"BA","asset_class":"Stocks","custom":false},
  {"symbol":"LMT","asset_class":"Stocks","custom":false},
  {"symbol":"RTX","asset_class":"Stocks","custom":false},
  {"symbol":"NOC","asset_class":"Stocks","custom":false},
  {"symbol":"CAT","asset_class":"Stocks","custom":false},
  {"symbol":"DE","asset_class":"Stocks","custom":false},
  {"symbol":"GE","asset_class":"Stocks","custom":false},
  {"symbol":"HON","asset_class":"Stocks","custom":false},
  {"symbol":"UPS","asset_class":"Stocks","custom":false},
  {"symbol":"FDX","asset_class":"Stocks","custom":false},
  {"symbol":"DAL","asset_class":"Stocks","custom":false},
  {"symbol":"UAL","asset_class":"Stocks","custom":false},
  {"symbol":"AAL","asset_class":"Stocks","custom":false},
  {"symbol":"LUV","asset_class":"Stocks","custom":false},
  {"symbol":"TMUS","asset_class":"Stocks","custom":false},
  {"symbol":"VZ","asset_class":"Stocks","custom":false},
  {"symbol":"T","asset_class":"Stocks","custom":false},
  {"symbol":"CMCSA","asset_class":"Stocks","custom":false},
  {"symbol":"CHTR","asset_class":"Stocks","custom":false},
  {"symbol":"SPOT","asset_class":"Stocks","custom":false},
  {"symbol":"SNAP","asset_class":"Stocks","custom":false},
  {"symbol":"TWTR","asset_class":"Stocks","custom":false},
  {"symbol":"PINS","asset_class":"Stocks","custom":false},
  {"symbol":"ZM","asset_class":"Stocks","custom":false},
  {"symbol":"DOCU","asset_class":"Stocks","custom":false},
  {"symbol":"SQ","asset_class":"Stocks","custom":false},
  {"symbol":"SHOP","asset_class":"Stocks","custom":false},
  {"symbol":"SE","asset_class":"Stocks","custom":false},
  {"symbol":"MELI","asset_class":"Stocks","custom":false},
  {"symbol":"JD","asset_class":"Stocks","custom":false},
  {"symbol":"PDD","asset_class":"Stocks","custom":false},
  {"symbol":"BIDU","asset_class":"Stocks","custom":false},
  {"symbol":"TCEHY","asset_class":"Stocks","custom":false},
  {"symbol":"NTES","asset_class":"Stocks","custom":false},
  {"symbol":"ZM","asset_class":"Stocks","custom":false},
  {"symbol":"ROKU","asset_class":"Stocks","custom":false},
  {"symbol":"FSLY","asset_class":"Stocks","custom":false},
  {"symbol":"NET","asset_class":"Stocks","custom":false},
  {"symbol":"DDOG","asset_class":"Stocks","custom":false},
  {"symbol":"OKTA","asset_class":"Stocks","custom":false},
  {"symbol":"CRWD","asset_class":"Stocks","custom":false},
  {"symbol":"SPLK","asset_class":"Stocks","custom":false},
  {"symbol":"NOW","asset_class":"Stocks","custom":false},
  {"symbol":"TEAM","asset_class":"Stocks","custom":false},
  {"symbol":"ATLASSIAN","asset_class":"Stocks","custom":false},
  {"symbol":"ZM","asset_class":"Stocks","custom":false},
  {"symbol":"SNOW","asset_class":"Stocks","custom":false},
  {"symbol":"UPST","asset_class":"Stocks","custom":false},
  {"symbol":"SOFI","asset_class":"Stocks","custom":false},
  {"symbol":"RIVN","asset_class":"Stocks","custom":false},
  {"symbol":"LCID","asset_class":"Stocks","custom":false},
  {"symbol":"NIO","asset_class":"Stocks","custom":false},
  {"symbol":"XPEV","asset_class":"Stocks","custom":false},
  {"symbol":"LI","asset_class":"Stocks","custom":false},
  {"symbol":"DIDI","asset_class":"Stocks","custom":false},
  {"symbol":"BEKE","asset_class":"Stocks","custom":false},
  {"symbol":"IQ","asset_class":"Stocks","custom":false},
  {"symbol":"HUYA","asset_class":"Stocks","custom":false},
  {"symbol":"BILI","asset_class":"Stocks","custom":false},
  {"symbol":"IGG","asset_class":"Stocks","custom":false},
  {"symbol":"KWEB","asset_class":"Stocks","custom":false},
  {"symbol":"ARKK","asset_class":"Stocks","custom":false},
  {"symbol":"QQQ","asset_class":"Stocks","custom":false},
  {"symbol":"SPY","asset_class":"Stocks","custom":false},
  {"symbol":"VTI","asset_class":"Stocks","custom":false},
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
  {"symbol":"NG1!","asset_class":"Futures","custom":false},
  {"symbol":"RB1!","asset_class":"Futures","custom":false},
  {"symbol":"HO1!","asset_class":"Futures","custom":false},
  {"symbol":"KC1!","asset_class":"Futures","custom":false},
  {"symbol":"CT1!","asset_class":"Futures","custom":false},
  {"symbol":"SB1!","asset_class":"Futures","custom":false},
  {"symbol":"CC1!","asset_class":"Futures","custom":false},
  {"symbol":"LC1!","asset_class":"Futures","custom":false},
  {"symbol":"LH1!","asset_class":"Futures","custom":false},
  {"symbol":"ZW1!","asset_class":"Futures","custom":false},
  {"symbol":"ZC1!","asset_class":"Futures","custom":false},
  {"symbol":"ZS1!","asset_class":"Futures","custom":false},
  {"symbol":"ZM1!","asset_class":"Futures","custom":false},
  {"symbol":"ZL1!","asset_class":"Futures","custom":false},
  {"symbol":"KE1!","asset_class":"Futures","custom":false},
  {"symbol":"O1!","asset_class":"Futures","custom":false},
  {"symbol":"RR1!","asset_class":"Futures","custom":false},
  {"symbol":"DX1!","asset_class":"Futures","custom":false},
  {"symbol":"6E1!","asset_class":"Futures","custom":false},
  {"symbol":"6B1!","asset_class":"Futures","custom":false},
  {"symbol":"6J1!","asset_class":"Futures","custom":false},
  {"symbol":"6A1!","asset_class":"Futures","custom":false},
  {"symbol":"6C1!","asset_class":"Futures","custom":false},
  {"symbol":"6S1!","asset_class":"Futures","custom":false},
  {"symbol":"6N1!","asset_class":"Futures","custom":false},
  {"symbol":"6M1!","asset_class":"Futures","custom":false},
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
  {"symbol":"EU50","asset_class":"Indices","custom":false},
  {"symbol":"HK50","asset_class":"Indices","custom":false},
  {"symbol":"CN50","asset_class":"Indices","custom":false},
  {"symbol":"SG30","asset_class":"Indices","custom":false},
  {"symbol":"IN50","asset_class":"Indices","custom":false},
  {"symbol":"SA40","asset_class":"Indices","custom":false},
  {"symbol":"BR50","asset_class":"Indices","custom":false},
  {"symbol":"MX35","asset_class":"Indices","custom":false},
  {"symbol":"RUSS2000","asset_class":"Indices","custom":false},
  {"symbol":"SPX","asset_class":"Indices","custom":false},
  {"symbol":"NDX","asset_class":"Indices","custom":false},
  {"symbol":"DJI","asset_class":"Indices","custom":false},
  {"symbol":"FTSE","asset_class":"Indices","custom":false},
  {"symbol":"CAC","asset_class":"Indices","custom":false},
  {"symbol":"DAX","asset_class":"Indices","custom":false},
  {"symbol":"IBEX","asset_class":"Indices","custom":false},
  {"symbol":"MIB","asset_class":"Indices","custom":false},
  {"symbol":"AEX","asset_class":"Indices","custom":false},
  {"symbol":"SMI","asset_class":"Indices","custom":false},
  {"symbol":"OMXS30","asset_class":"Indices","custom":false},
  {"symbol":"OBX","asset_class":"Indices","custom":false},
  {"symbol":"WIG20","asset_class":"Indices","custom":false},
  {"symbol":"BUX","asset_class":"Indices","custom":false},
  {"symbol":"BET","asset_class":"Indices","custom":false},
  {"symbol":"PX","asset_class":"Indices","custom":false},
  {"symbol":"MOEX","asset_class":"Indices","custom":false},
  {"symbol":"RTS","asset_class":"Indices","custom":false},
  {"symbol":"TAIEX","asset_class":"Indices","custom":false},
  {"symbol":"KOSPI","asset_class":"Indices","custom":false},
  {"symbol":"N225","asset_class":"Indices","custom":false},
  {"symbol":"TOPIX","asset_class":"Indices","custom":false},
  {"symbol":"HSI","asset_class":"Indices","custom":false},
  {"symbol":"HSCEI","asset_class":"Indices","custom":false},
  {"symbol":"CSI300","asset_class":"Indices","custom":false},
  {"symbol":"SSE","asset_class":"Indices","custom":false},
  {"symbol":"SZSE","asset_class":"Indices","custom":false}
]'::jsonb
WHERE TRUE; -- Updates ALL existing users

-- ============================================================
-- Verification queries (run these after to check)
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_checkins';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'trades' AND column_name LIKE '%timeframe%';
-- SELECT COUNT(*) FROM user_settings;
-- SELECT * FROM pg_trigger WHERE tgname LIKE 'tr_%';
