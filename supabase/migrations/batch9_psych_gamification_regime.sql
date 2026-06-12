-- Batch 9B: Psychological Metrics, Gamification, Market Regime
-- Apply this migration to add support for market regime tagging and user gamification.

-- 1. Add market_regime column to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS market_regime text
CHECK (market_regime IN ('Trending', 'Choppy/Range', 'News-Driven', 'Breakout', 'Reversal', NULL));

-- 2. Create user_gamification table
CREATE TABLE IF NOT EXISTS public.user_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  quests_completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_quest_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification"
  ON public.user_gamification
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON public.user_gamification
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON public.user_gamification
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
