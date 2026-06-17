-- ============================================================
-- Master Sync & Fix Script — WJournal
-- Updated: 2026-06-17
-- Purpose: Run this ONCE to ensure all accounts, trades, and
--          new columns are perfectly aligned.
-- Instructions: Copy entire contents → Paste into Supabase SQL Editor → Run
-- ============================================================

-- ============================================================
-- STEP 1: Synchronize all portfolio balances to their ledgers
-- (includes Partial trades in PnL sum — they have realized gains)
-- ============================================================
WITH calculated_balances AS (
  SELECT 
    p.id as portfolio_id,
    p.starting_balance 
    + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
    - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type = 'withdrawal'), 0)
    + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = p.id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial')), 0) as exact_balance
  FROM portfolios p
)
UPDATE portfolios
SET current_balance = calculated_balances.exact_balance
FROM calculated_balances
WHERE portfolios.id = calculated_balances.portfolio_id;

-- ============================================================
-- STEP 2: Backfill trade_open_time from trade_time_utc
-- (for all trades created before Batch 2 migration)
-- ============================================================
UPDATE trades
SET trade_open_time = trade_time_utc::time
WHERE trade_open_time IS NULL
  AND trade_time_utc IS NOT NULL;

-- ============================================================
-- STEP 3: Ensure new Batch 2 columns exist (safe to re-run)
-- ============================================================
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_open_time time;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_close_time timestamptz;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_type text;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS adjusted_sl_price numeric(20,8);

-- Add exit_type constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_exit_type'
  ) THEN
    ALTER TABLE trades ADD CONSTRAINT chk_exit_type CHECK (
      exit_type IS NULL OR exit_type IN ('Final TP', 'Stop Loss', 'Breakeven', 'Adjusted SL')
    );
  END IF;
END
$$;

-- Fix analysis_timeframe constraint to include 5M
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_analysis_timeframe;
ALTER TABLE trades ADD CONSTRAINT chk_analysis_timeframe
  CHECK (analysis_timeframe IS NULL OR analysis_timeframe IN ('4H','2H','1H','30M','15M','5M'));

-- ============================================================
-- STEP 4: Verification queries (uncomment to check)
-- ============================================================
-- SELECT id, name, starting_balance, current_balance FROM portfolios;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'trades' AND column_name IN ('trade_open_time','trade_close_time','exit_type','adjusted_sl_price');
-- SELECT COUNT(*) as total_trades, status FROM trades GROUP BY status;
