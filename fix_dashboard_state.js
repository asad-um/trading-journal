const fs = require('fs');
let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// The dashboard is entirely broken regarding the active portfolio. I wrote the fix in `patch_dashboard_null.js` previously, 
// but it looks like the Vercel deployment blocked it or the regex failed to stick properly!
// Let's force-inject the correct fetch logic.

const brokenFetch = `  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [profileRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("user_id", user.id).order("trade_date", { ascending: true })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
      setIsLoading(false);
    }
    fetchData();
  }, []);`;

const fixedFetch = `  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      // 1. Get the currently active portfolio
      const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePort) {
        setProfile(null);
        setTrades([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch the trades strictly for that active portfolio
      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePort.id).order("trade_date", { ascending: true });

      // 3. Set the profile state completely using the Active Portfolio data (Not the generic profiles table)
      setProfile(activePort as any);
      if (tradesRes) setTrades(tradesRes);
      
      setIsLoading(false);
    }
    fetchData();
  }, []);`;

if (dashboard.includes('const [profileRes, tradesRes] = await Promise.all([')) {
    dashboard = dashboard.replace(brokenFetch, fixedFetch);
    fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);
    console.log("Dashboard fetch patched.");
} else {
    console.log("Dashboard fetch already patched or regex failed.");
}

