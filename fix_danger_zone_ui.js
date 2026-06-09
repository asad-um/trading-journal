const fs = require('fs');

let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// The user wants the Danger Zone to be "small" instead of "a big field". 
// "Let it be like 'delete account' and 'delete all data'. Like a small field."
// Currently it's a 2-column grid of massive Cards. Let's shrink it down to a sleek, compact list.

const oldDangerSection = `        {/* Detached Danger Zone */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col space-y-2 mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-loss">Danger Zone</h2>
            <p className="text-text-muted">Destructive actions for your account and data.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-loss/30 bg-loss/5">
              <CardHeader>
                <CardTitle className="text-loss text-lg">Factory Reset</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between gap-4 h-full">
                <p className="text-sm text-text-muted">
                  Permanently deletes all your trades, custom portfolios, and ledger events. Your login and settings will remain, and you will start fresh with a clean $0.00 Main Account.
                </p>
                <Button variant="outline" className="w-full text-loss border-loss/50 hover:bg-loss hover:text-white transition-all" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to Factory Reset your journal? This cannot be undone.")) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    // Fetch all trades to garbage collect Cloudinary images
                    const { data: trades } = await supabase.from('trades').select('pre_trade_images, post_trade_images').eq('user_id', user.id);
                    if (trades) {
                      const publicIds: string[] = [];
                      trades.forEach(t => {
                        (t.pre_trade_images || []).forEach((img: any) => img.public_id && publicIds.push(img.public_id));
                        (t.post_trade_images || []).forEach((img: any) => img.public_id && publicIds.push(img.public_id));
                      });
                      if (publicIds.length > 0) {
                        await fetch('/api/delete-images-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_ids: publicIds }) }).catch(console.error);
                      }
                    }

                    // Delete all sub-data
                    await Promise.all([
                      supabase.from('trades').delete().eq('user_id', user.id),
                      supabase.from('account_events').delete().eq('user_id', user.id),
                      supabase.from('portfolios').delete().eq('user_id', user.id)
                    ]);
                    
                    // Recreate default portfolio
                    await supabase.from('portfolios').insert({
                      user_id: user.id,
                      name: 'Main Account',
                      is_active: true,
                      starting_balance: 0,
                      current_balance: 0
                    });
                    
                    toast({ title: "Factory Reset Complete", description: "Your journal has been completely wiped clean." });
                    window.location.href = "/dashboard";
                  }
                }}>Factory Reset Journal</Button>
              </CardContent>
            </Card>

            <Card className="border-loss/50 bg-loss/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <CardHeader>
                <CardTitle className="text-loss text-lg">Delete Account</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between gap-4 h-full">
                <p className="text-sm text-text-muted">
                  Permanently deletes your entire account, wiping all trade history, portfolio ledgers, custom playbooks, and authentication records from our servers.
                </p>
                <Button variant="destructive" className="w-full shadow-lg hover:shadow-xl transition-all" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                    try {
                      const res = await fetch('/api/delete-account', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to delete account. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
                      
                      await supabase.auth.signOut();
                      window.location.href = "/register";
                    } catch (error: any) {
                      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
                    }
                  }
                }}>Permanently Delete Account</Button>
              </CardContent>
            </Card>
          </div>
        </div>`;

const newDangerSection = `        {/* Detached Danger Zone (Compact) */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <Card className="border-loss/30 bg-loss/5 overflow-hidden">
            <CardHeader className="bg-loss/10 border-b border-loss/20 pb-4">
              <CardTitle className="text-loss text-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-loss/20">
                {/* Reset Option */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-loss/5 transition-colors">
                  <div>
                    <h3 className="font-semibold text-foreground">Delete All Data (Factory Reset)</h3>
                    <p className="text-xs text-text-muted mt-1 max-w-md">Wipes all trades, portfolios, and ledger events. Your login and custom strategies remain intact.</p>
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto text-loss border-loss/50 hover:bg-loss hover:text-white transition-all whitespace-nowrap" onClick={async () => {
                    if(confirm("Are you absolutely sure you want to Factory Reset your journal? This cannot be undone.")) {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      
                      // Fetch all trades to garbage collect Cloudinary images
                      const { data: trades } = await supabase.from('trades').select('pre_trade_images, post_trade_images').eq('user_id', user.id);
                      if (trades) {
                        const publicIds: string[] = [];
                        trades.forEach(t => {
                          (t.pre_trade_images || []).forEach((img: any) => img.public_id && publicIds.push(img.public_id));
                          (t.post_trade_images || []).forEach((img: any) => img.public_id && publicIds.push(img.public_id));
                        });
                        if (publicIds.length > 0) {
                          await fetch('/api/delete-images-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_ids: publicIds }) }).catch(console.error);
                        }
                      }

                      // Delete all sub-data
                      await Promise.all([
                        supabase.from('trades').delete().eq('user_id', user.id),
                        supabase.from('account_events').delete().eq('user_id', user.id),
                        supabase.from('portfolios').delete().eq('user_id', user.id)
                      ]);
                      
                      // Recreate default portfolio
                      await supabase.from('portfolios').insert({
                        user_id: user.id,
                        name: 'Main Account',
                        is_active: true,
                        starting_balance: 0,
                        current_balance: 0
                      });
                      
                      toast({ title: "Factory Reset Complete", description: "Your journal has been completely wiped clean." });
                      window.location.href = "/dashboard";
                    }
                  }}>Reset Data</Button>
                </div>

                {/* Delete Account Option */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-loss/10 transition-colors">
                  <div>
                    <h3 className="font-semibold text-loss">Permanently Delete Account</h3>
                    <p className="text-xs text-text-muted mt-1 max-w-md">Deletes your login, authentication records, and wipes all data from our servers forever.</p>
                  </div>
                  <Button variant="destructive" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all whitespace-nowrap" onClick={async () => {
                    if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                      try {
                        const res = await fetch('/api/delete-account', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to delete account. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
                        
                        await supabase.auth.signOut();
                        window.location.href = "/register";
                      } catch (error: any) {
                        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
                      }
                    }
                  }}>Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>`;

settings = settings.replace(oldDangerSection, newDangerSection);
fs.writeFileSync('src/app/settings/page.tsx', settings);
