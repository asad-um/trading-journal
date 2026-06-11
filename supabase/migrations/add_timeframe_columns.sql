-- Migration: Add timeframe columns to trades table
-- Date: 2026-06-11
-- Purpose: Support three-tier timeframe analysis for statistical edge refinement

-- Add new columns to trades table
ALTER TABLE trades 
  ADD COLUMN IF NOT EXISTS highest_timeframe text,
  ADD COLUMN IF NOT EXISTS analysis_timeframe text,
  ADD COLUMN IF NOT EXISTS entry_timeframe text;

-- Add check constraints for valid timeframe values
ALTER TABLE trades 
  ADD CONSTRAINT chk_highest_timeframe 
  CHECK (highest_timeframe IS NULL OR highest_timeframe IN ('Monthly', 'Weekly', 'Daily', '4H'));

ALTER TABLE trades 
  ADD CONSTRAINT chk_analysis_timeframe 
  CHECK (analysis_timeframe IS NULL OR analysis_timeframe IN ('4H', '2H', '1H', '30M', '15M'));

ALTER TABLE trades 
  ADD CONSTRAINT chk_entry_timeframe 
  CHECK (entry_timeframe IS NULL OR entry_timeframe IN ('15M', '5M', '1M', '30S', '15S', '5S'));

-- Update existing trades to have sensible defaults based on current data
UPDATE trades 
  SET highest_timeframe = 'Daily',
      analysis_timeframe = '1H',
      entry_timeframe = '15M'
  WHERE highest_timeframe IS NULL;

-- Note: Run this in Supabase SQL Editor:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste and run this script
-- 4. Verify with: SELECT column_name FROM information_schema.columns WHERE table_name = 'trades';
