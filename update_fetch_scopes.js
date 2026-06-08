const fs = require('fs');

// We need to limit the dashboard, statistics, and trade logs to ONLY the active portfolio.

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Instead of querying `eq('user_id', user.id)`, we need to query the active portfolio.
    // Let's replace the dual Promise.all fetch to get the portfolio first.
    
    const oldFetch = `const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("user_id", user.id)`;
        
    const newFetch = `const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      if (!activePortfolio) { setIsLoading(false); return; }

      const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("portfolio_id", activePortfolio.id)`;
        
    content = content.replace(oldFetch, newFetch);
    
    // Overwrite the fake profile starting balance with the real portfolio balance
    content = content.replace(
        'if (profRes.data) setProfile(profRes.data);',
        'if (profRes.data) setProfile({ ...profRes.data, starting_balance: activePortfolio.starting_balance, current_balance: activePortfolio.current_balance });'
    );
    
    fs.writeFileSync(path, content);
}

try { updateFile('src/app/dashboard/page.tsx'); } catch(e){}
try { updateFile('src/app/statistics/page.tsx'); } catch(e){}

let tradesList = fs.readFileSync('src/app/trades/page.tsx', 'utf8');
tradesList = tradesList.replace(
    '.eq("user_id", user.id)',
    '.eq("user_id", user.id).eq("portfolio_id", (await supabase.from("portfolios").select("id").eq("user_id", user.id).eq("is_active", true).single()).data?.id)'
);
fs.writeFileSync('src/app/trades/page.tsx', tradesList);

let tradeForm = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
tradeForm = tradeForm.replace(
    'user_id: user.id,',
    'user_id: user.id,\n        portfolio_id: (await supabase.from("portfolios").select("id").eq("user_id", user.id).eq("is_active", true).single()).data?.id,'
);
fs.writeFileSync('src/components/trades/trade-form.tsx', tradeForm);

console.log("Multi-tenant portfolio scopes applied.");
