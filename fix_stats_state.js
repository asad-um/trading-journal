const fs = require('fs');
let stats = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

const brokenFetch = `  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("user_id", user.id)
      ]);

      if (profRes.data) setProfile(profRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
      setIsLoading(false);
    }
    fetchData();
  }, []);`;

const fixedFetch = `  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePort) {
        setProfile(null);
        setTrades([]);
        setIsLoading(false);
        return;
      }

      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePort.id);

      setProfile(activePort as any);
      if (tradesRes) setTrades(tradesRes);
      
      setIsLoading(false);
    }
    fetchData();
  }, []);`;

if (stats.includes('const [profRes, tradesRes] = await Promise.all([')) {
    stats = stats.replace(brokenFetch, fixedFetch);
    fs.writeFileSync('src/app/statistics/page.tsx', stats);
    console.log("Stats fetch patched.");
}

