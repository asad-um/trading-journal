-- Idempotent RLS policies for user_gamification table
-- This script can be run multiple times without errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Users can update own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Users can insert own gamification" ON user_gamification;

-- Recreate policies
CREATE POLICY "Users can read own gamification"
  ON user_gamification
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON user_gamification
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON user_gamification
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
