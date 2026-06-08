const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// 1. We need to add the missing "Notes" section (pre_trade_reasoning and post_trade_lesson).
// Let's insert it before the Submit button.
const submitButtonStr = `<Button type="submit" className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all" disabled={isSubmitting}>`;

const notesSection = `        {/* Section 6: Notes & Review */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded text-sm">6</span> 
              Trade Notes & Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="pre_trade_reasoning" render={({ field }) => (
              <FormItem>
                <FormLabel>Pre-Trade Reasoning</FormLabel>
                <FormControl>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" 
                    placeholder="Why are you taking this trade? What is your edge?" 
                    {...field} 
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="post_trade_lesson" render={({ field }) => (
              <FormItem>
                <FormLabel>Post-Trade Lesson</FormLabel>
                <FormControl>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" 
                    placeholder="What did you learn? Did you follow your plan?" 
                    {...field} 
                  />
                </FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        `;

content = content.replace(submitButtonStr, notesSection + submitButtonStr);

// 2. We need to securely block the form and use the Active Portfolio for the balance.
const initFunctionOld = `    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      
      const [profRes, setRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ]);
      
      if (profRes.data) {
        setProfile(profRes.data);
        if (!initialData) form.setValue('risk_percentage', profRes.data.default_risk_percentage);
      }
      
      if (setRes.data) {`;

const initFunctionNew = `    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      
      const { data: activePort } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePort) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const [profRes, setRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ]);
      
      if (profRes.data) {
        // We override the profile balance with the active portfolio balance so the Risk Calculator uses the right money!
        setProfile({ ...profRes.data, current_balance: activePort.current_balance, starting_balance: activePort.starting_balance });
        if (!initialData) form.setValue('risk_percentage', profRes.data.default_risk_percentage);
      }
      
      if (setRes.data) {`;

content = content.replace(initFunctionOld, initFunctionNew);

// 3. Make sure the submit function uses the active portfolio ID
const oldSubmitFetch = `const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");`;

const newSubmitFetch = `const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: activePort } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();
      if (!activePort) throw new Error("No active account selected. Please select one in the sidebar.");`;

content = content.replace(oldSubmitFetch, newSubmitFetch);

// Update tradeData payload
const oldTradeData = `const tradeData = {
        ...data,
        user_id: user.id,
        session: sessionDetected,
        risk_amount_usd: riskAmount,`;

const newTradeData = `const tradeData = {
        ...data,
        user_id: user.id,
        portfolio_id: activePort.id,
        session: sessionDetected,
        risk_amount_usd: riskAmount,`;

content = content.replace(oldTradeData, newTradeData);

// 4. Update the "No Active Account" UI fallback
const oldFallback = `  if (isLoading || !settings || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-text-muted">Loading framework...</p>
      </div>
    );
  }`;

const newFallback = `  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-text-muted">Loading framework...</p>
      </div>
    );
  }

  if (!profile || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <h2 className="text-2xl font-bold text-loss">No Active Account</h2>
        <p className="text-text-muted max-w-md">
          You do not currently have an active trading account. You cannot log a trade without selecting a portfolio first.
        </p>
        <Button variant="outline" onClick={() => router.push('/account')}>Go to Account Manager</Button>
      </div>
    );
  }`;

content = content.replace(oldFallback, newFallback);

// 5. Fix numeric inputs back to type="number" step="any"
// Earlier we changed them to text/decimal because of the UI glitch, but Zod requires numbers.
// type="number" step="any" allows proper native decimals like 4.35 to be typed.
content = content.replace(/type="text" inputMode="decimal"/g, 'type="number" step="any"');

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

