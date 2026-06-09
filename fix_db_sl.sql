-- Add the missing sl_hit column to trades table so we can correctly track partial stop outs
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS sl_hit boolean DEFAULT false;
