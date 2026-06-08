const fs = require('fs');

// We also need a master sync script for the user to run just to guarantee the Database is aligned
const sql = `-- Master Sync & Fix Script
-- Run this ONCE to ensure your accounts are perfectly aligned with their actual trades and events.

-- 1. Synchronize all portfolio balances exactly to their ledgers
WITH calculated_balances AS (
  SELECT 
    p.id as portfolio_id,
    p.starting_balance 
    + COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type IN ('deposit', 'adjustment', 'reset')), 0)
    - COALESCE((SELECT SUM(amount) FROM account_events WHERE portfolio_id = p.id AND event_type = 'withdrawal'), 0)
    + COALESCE((SELECT SUM(net_pnl) FROM trades WHERE portfolio_id = p.id AND status IN ('Closed - Win', 'Closed - Loss', 'Breakeven')), 0) as exact_balance
  FROM portfolios p
)
UPDATE portfolios
SET current_balance = calculated_balances.exact_balance
FROM calculated_balances
WHERE portfolios.id = calculated_balances.portfolio_id;
`;

fs.writeFileSync('supabase/migrations/master_sync.sql', sql);

console.log("SQL generated.");
