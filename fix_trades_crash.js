const fs = require('fs');

let content = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

// The UUID undefined crash is because we try to pass undefined into `.eq('portfolio_id', ...)`
const oldFetch = `      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
  
      const { data, error } = await supabase
        .from("trades")
        .select("id, trade_date, symbol, direction, schematic, entry_event, net_pnl, actual_rr_achieved, status, session, asset_class, strategy, sub_strategy")
        .eq("user_id", user.id).eq("portfolio_id", (await supabase.from("portfolios").select("id").eq("user_id", user.id).eq("is_active", true).single()).data?.id)
        .order("trade_date", { ascending: false })
        .limit(100); // Temporary limit until infinite scroll is added`;

const newFetch = `      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
  
      const { data: activePortfolio } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePortfolio) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("id, trade_date, symbol, direction, schematic, entry_event, net_pnl, actual_rr_achieved, status, session, asset_class, strategy, sub_strategy")
        .eq("user_id", user.id)
        .eq("portfolio_id", activePortfolio.id)
        .order("trade_date", { ascending: false })
        .limit(100);`;

content = content.replace(oldFetch, newFetch);
fs.writeFileSync('src/app/trades/page.tsx', content);

