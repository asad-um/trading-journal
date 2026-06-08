const fs = require('fs');

let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

const oldFetch = `    const [profRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("account_events").select("*").eq("user_id", user.id).order("event_date", { ascending: false })
    ]);

    if (profRes.data) {
      setProfile(profRes.data);
      setNewStartingBalance(profRes.data.starting_balance.toString());
    }
    if (eventsRes.data) setEvents(eventsRes.data);`;

const newFetch = `    const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
    
    if (activePortfolio) {
      const { data: eventsRes } = await supabase.from("account_events").select("*").eq("portfolio_id", activePortfolio.id).order("event_date", { ascending: false });
      
      setProfile(activePortfolio as any); // Portfolio shape loosely matches profile for balance tracking
      setNewStartingBalance(activePortfolio.starting_balance.toString());
      if (eventsRes) setEvents(eventsRes);
    }`;

content = content.replace(oldFetch, newFetch);

const oldUpdate = `const { error } = await supabase.from("profiles").update({ starting_balance: parseFloat(newStartingBalance) }).eq("id", user.id);`;
const newUpdate = `const { data: active } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();
    if (!active) return;
    const { error } = await supabase.from("portfolios").update({ starting_balance: parseFloat(newStartingBalance) }).eq("id", active.id);`;

content = content.replace(oldUpdate, newUpdate);

const oldInsert = `user_id: user.id,
      event_type: dialogType,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),`;

const newInsert = `user_id: user.id,
      portfolio_id: profile?.id, // Profile ID is temporarily holding the active Portfolio ID from the fetch
      event_type: dialogType,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),`;

content = content.replace(oldInsert, newInsert);

// Add the ability to create a NEW account/portfolio directly in this manager!
const addPortfolioCode = `
  const handleCreatePortfolio = async () => {
    const name = prompt("Enter new account name (e.g. 'FTMO 100k', 'Personal Binance'):");
    if (!name || name.trim() === '') return;
    
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase.from('portfolios').insert({
      user_id: user.id,
      name: name.trim(),
      starting_balance: 0,
      current_balance: 0
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "New account created. You can switch to it in the sidebar." });
      window.location.reload();
    }
  };
`;

content = content.replace('const handleUpdateStartingBalance = async () => {', addPortfolioCode + '\n  const handleUpdateStartingBalance = async () => {');

const uiInjection = `<Button size="sm" variant="outline" onClick={handleCreatePortfolio} className="mr-4">
              <Plus className="h-4 w-4 mr-2" /> New Account
            </Button>`;
            
content = content.replace('<div className="flex bg-background-secondary p-1 rounded-lg border border-border/50">', uiInjection + '\n          <div className="flex bg-background-secondary p-1 rounded-lg border border-border/50">');

fs.writeFileSync('src/app/account/page.tsx', content);
