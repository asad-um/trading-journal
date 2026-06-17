-- Migration: Add tags column to trades table
-- Feature: Trade Notes Search & Tag System
-- Date: 2026-06-17

ALTER TABLE trades ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for fast tag searches
CREATE INDEX IF NOT EXISTS idx_trades_tags ON trades USING GIN(tags);

-- Comment
COMMENT ON COLUMN trades.tags IS 'User-defined tags for trade categorization (e.g. #fomo, #revenge, #patient)';
