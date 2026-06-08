const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const oldFetch = `    const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      if (!activePortfolio) { setIsLoading(false); return; }

      const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("portfolio_id", activePortfolio.id)
          .order("trade_date", { ascending: true })
      ]);

      if (profRes.data) setProfile({ ...profRes.data, starting_balance: activePortfolio.starting_balance, current_balance: activePortfolio.current_balance });
      if (tradesRes.data) setTrades(tradesRes.data);
      setIsLoading(false);`;

const newFetch = `    const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      const { data: profRes } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      if (!activePortfolio) {
        if (profRes) setProfile(profRes as any);
        setTrades([]);
        setIsLoading(false); 
        return; 
      }

      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePortfolio.id).order("trade_date", { ascending: true });

      if (profRes) {
        setProfile({ ...profRes, starting_balance: activePortfolio.starting_balance, current_balance: activePortfolio.current_balance } as any);
      }
      if (tradesRes) setTrades(tradesRes);
      setIsLoading(false);`;

content = content.replace(oldFetch, newFetch);

// Update empty state handling
content = content.replace(
  '<h2 className="text-2xl font-bold text-loss">Profile Data Missing</h2>\n          <p className="text-text-muted max-w-md">\n            Your authentication was successful, but we couldn&apos;t find your profile data. This usually happens if the database trigger failed during sign-up, or if you created the user directly in the Supabase Dashboard without the SQL triggers active.\n          </p>\n          <Button variant="outline" onClick={() => window.location.href = \'/login\'}>Go Back to Login</Button>',
  '<h2 className="text-2xl font-bold text-loss">No Active Account</h2>\n          <p className="text-text-muted max-w-md">\n            You do not currently have an active trading account/portfolio selected. Head over to the Accounts page to create or activate one.\n          </p>\n          <Button variant="outline" onClick={() => window.location.href = \'/account\'}>Go to Account Manager</Button>'
);

fs.writeFileSync('src/app/dashboard/page.tsx', content);
