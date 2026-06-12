-- ============================================================
-- BATCH 6: Add customizable sessions_list to user_settings
-- Date: 2026-06-12
-- ============================================================

-- 1. Ensure sessions_list column exists
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sessions_list jsonb DEFAULT '[]';

-- 2. Seed default sessions for users with empty/null sessions_list
UPDATE user_settings
SET sessions_list = '[
  {"id":"asia","label":"Asia"},
  {"id":"london","label":"London"},
  {"id":"nyse","label":"NYSE"},
  {"id":"overlap","label":"London/NYSE Overlap"},
  {"id":"off-hours","label":"Off-Hours"}
]'::jsonb
WHERE sessions_list IS NULL OR jsonb_array_length(sessions_list) = 0;
