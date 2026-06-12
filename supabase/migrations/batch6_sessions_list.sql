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
  {"id":"asia","label":"Asia","start_time":"00:00","end_time":"06:00"},
  {"id":"london","label":"London","start_time":"06:00","end_time":"16:00"},
  {"id":"overlap","label":"London/NYSE Overlap","start_time":"14:30","end_time":"16:00"},
  {"id":"nyse","label":"NYSE","start_time":"16:00","end_time":"21:00"},
  {"id":"off-hours","label":"Off-Hours","start_time":"21:00","end_time":"23:59"}
]'::jsonb
WHERE sessions_list IS NULL OR jsonb_array_length(sessions_list) = 0;
