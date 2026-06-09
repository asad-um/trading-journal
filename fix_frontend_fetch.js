const fs = require('fs');

// We also need to harden the frontend. If `.single()` fails, we should gracefully fallback to `.limit(1)` 
// just in case, or catch the error and pick the first one.
// Let's replace `.single()` with `.limit(1).maybeSingle()` where applicable, or just handle the array.

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(
    `const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];`
);
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

let account = fs.readFileSync('src/app/account/page.tsx', 'utf8');
account = account.replace(
    `const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
    const activePortfolio = activePorts?.[0];`
);
fs.writeFileSync('src/app/account/page.tsx', account);

let trades = fs.readFileSync('src/app/trades/page.tsx', 'utf8');
trades = trades.replace(
    `const { data: activePortfolio } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePortfolio = activePorts?.[0];`
);
fs.writeFileSync('src/app/trades/page.tsx', trades);

let stats = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');
stats = stats.replace(
    `const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePortfolio = activePorts?.[0];`
);
fs.writeFileSync('src/app/statistics/page.tsx', stats);

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
form = form.replace(
    `const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];`
);
form = form.replace(
    `const { data: activePort } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();`,
    `const { data: activePorts } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];`
);
fs.writeFileSync('src/components/trades/trade-form.tsx', form);

console.log("Frontend hardened against multiple active accounts.");
