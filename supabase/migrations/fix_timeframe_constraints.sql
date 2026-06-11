-- Migration: Fix timeframe check constraints
-- Date: 2026-06-11
-- Purpose: Fix broken constraints that excluded valid timeframe values

-- The previous migration had incorrect constraint values:
-- - chk_analysis_timeframe did NOT include '4H'
-- - chk_entry_timeframe did NOT include '15M'
-- This caused "check constraint violated" errors when updating existing trades

-- Step 1: Drop the old incorrect constraints
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_highest_timeframe;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_analysis_timeframe;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS chk_entry_timeframe;

-- Step 2: Re-create with correct values (matching the UI dropdowns)
-- HTF Bias: Monthly, Weekly, Daily, 4H
ALTER TABLE trades 
  ADD CONSTRAINT chk_highest_timeframe 
  CHECK (highest_timeframe IS NULL OR highest_timeframe IN ('Monthly', 'Weekly', 'Daily', '4H'));

-- Analysis TF: 4H, 2H, 1H, 30M, 15M
ALTER TABLE trades 
  ADD CONSTRAINT chk_analysis_timeframe 
  CHECK (analysis_timeframe IS NULL OR analysis_timeframe IN ('4H', '2H', '1H', '30M', '15M'));

-- Entry TF: 15M, 5M, 1M, 30S, 15S, 5S
ALTER TABLE trades 
  ADD CONSTRAINT chk_entry_timeframe 
  CHECK (entry_timeframe IS NULL OR entry_timeframe IN ('15M', '5M', '1M', '30S', '15S', '5S'));

-- Step 3: Backfill any NULL columns with sensible defaults
UPDATE trades 
  SET highest_timeframe = COALESCE(highest_timeframe, 'Daily'),
      analysis_timeframe = COALESCE(analysis_timeframe, '1H'),
      entry_timeframe = COALESCE(entry_timeframe, '15M')
  WHERE highest_timeframe IS NULL 
     OR analysis_timeframe IS NULL 
     OR entry_timeframe IS NULL;

-- Verification query:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trades' AND column_name IN ('highest_timeframe', 'analysis_timeframe', 'entry_timeframe');
