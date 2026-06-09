-- We need to enforce database-level integrity to guarantee that only ONE portfolio can be active per user.
-- First, we fix the corrupted state by setting all but one portfolio per user to inactive.

UPDATE portfolios
SET is_active = false
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM portfolios
    WHERE is_active = true
  ) t
  WHERE t.rn = 1
);

-- Next, we create a Partial Unique Index. 
-- This guarantees at the strict PostgreSQL level that a user can never, ever have more than one active portfolio at the exact same time.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_portfolio_per_user 
ON portfolios (user_id) 
WHERE is_active = true;

