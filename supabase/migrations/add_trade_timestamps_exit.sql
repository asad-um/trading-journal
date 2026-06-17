-- ============================================================
-- BATCH 2 MIGRATION: Trade Open/Close Time + Exit Type
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Rename trade_time_utc → trade_open_time (add new column, copy data, keep old as alias)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_open_time time;
UPDATE trades SET trade_open_time = trade_time_utc::time WHERE trade_open_time IS NULL AND trade_time_utc IS NOT NULL;

-- 2. Add trade_close_time (nullable timestamptz — only set when trade is closed)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_close_time timestamptz;

-- 3. Add exit_type (nullable text — Final TP / Stop Loss / Breakeven / Adjusted SL)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_type text;
ALTER TABLE trades ADD CONSTRAINT chk_exit_type CHECK (
  exit_type IS NULL OR exit_type IN ('Final TP', 'Stop Loss', 'Breakeven', 'Adjusted SL')
);

-- 4. Add adjusted_sl_price (nullable numeric — only used when exit_type = 'Adjusted SL')
ALTER TABLE trades ADD COLUMN IF NOT EXISTS adjusted_sl_price numeric(20,8);

-- 5. Fix analysis_timeframe constraint to include 5M (used in form)
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_analysis_timeframe;
ALTER TABLE trades ADD CONSTRAINT chk_analysis_timeframe
  CHECK (analysis_timeframe IS NULL OR analysis_timeframe IN ('4H','2H','1H','30M','15M','5M'));

-- Done. All new columns are nullable so existing trades are unaffected.
