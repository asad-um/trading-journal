-- This migration adds the strategy and sub_strategy columns to trades
-- and adds strategies_list to user_settings without destroying existing data.

ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS strategy text DEFAULT 'Wyckoff',
ADD COLUMN IF NOT EXISTS sub_strategy text;

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS strategies_list jsonb DEFAULT '[]';
