const fs = require('fs');

// We need to ensure that the Dashboard actually updates the "Stats" useMemo properly when the profile changes.
let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// I need to ensure the profile.current_balance is strictly pulled from the database, not calculated locally.
// Because if the user logs a trade, the db triggers the update, but the frontend needs to re-fetch the new balance.
// In the current setup, if they go to the trade form, log a trade, and redirect back to the dashboard, 
// the dashboard's `useEffect` WILL re-fire and fetch the new balance. This is correct.

// However, the issue might be that in `src/app/dashboard/page.tsx`, we are fetching `profRes` but setting `activePort as any`.
// Let's ensure the data mapping is crystal clear.

const oldFetch = `      const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      const { data: profRes } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      if (!activePort) {
        if (profRes) setProfile(profRes as any);
        setTrades([]);
        setIsLoading(false); 
        return; 
      }

      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePort.id).order("trade_date", { ascending: true });

      if (profRes) {
        setProfile({ ...profRes, starting_balance: activePort.starting_balance, current_balance: activePort.current_balance } as any);
      }
      if (tradesRes) setTrades(tradesRes);`;

const newFetch = `      const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePort) {
        setProfile(null);
        setTrades([]);
        setIsLoading(false); 
        return; 
      }

      const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("portfolio_id", activePort.id).order("trade_date", { ascending: true })
      ]);

      if (profRes.data) {
        // Crucial: We merge the Master Profile settings with the STRICT balance of the currently active portfolio!
        setProfile({ 
          ...profRes.data, 
          starting_balance: activePort.starting_balance, 
          current_balance: activePort.current_balance,
          currency: activePort.currency 
        } as any);
      }
      
      if (tradesRes.data) setTrades(tradesRes.data);`;

dashboard = dashboard.replace(oldFetch, newFetch);
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

// Now apply this exact same strict mapping to the Account Manager so the Master Balance card displays correctly!
let account = fs.readFileSync('src/app/account/page.tsx', 'utf8');

const oldAccountFetch = `    const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
    
    if (activePortfolio) {
      const { data: eventsRes } = await supabase.from("account_events").select("*").eq("portfolio_id", activePortfolio.id).order("event_date", { ascending: false });
      
      setProfile(activePortfolio as any); // Portfolio shape loosely matches profile for balance tracking
      setNewStartingBalance(activePortfolio.starting_balance.toString());
      if (eventsRes) setEvents(eventsRes);
    }`;

const newAccountFetch = `    const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
    
    if (activePortfolio) {
      const { data: eventsRes } = await supabase.from("account_events").select("*").eq("portfolio_id", activePortfolio.id).order("event_date", { ascending: false });
      
      // We must explicitly cast this so the Master Balance card pulls the exact current_balance of the portfolio
      setProfile(activePortfolio as any); 
      setNewStartingBalance(activePortfolio.starting_balance.toString());
      if (eventsRes) setEvents(eventsRes);
    } else {
      setProfile(null);
      setEvents([]);
    }`;

account = account.replace(oldAccountFetch, newAccountFetch);
fs.writeFileSync('src/app/account/page.tsx', account);

console.log("Strict balance mapping applied.");
