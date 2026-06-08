const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// The danger zone needs to perfectly "Factory Reset" the journal.
const oldDanger = `<Button variant="destructive" onClick={async () => {
                if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
                  // Delete the profile row. Because of ON DELETE CASCADE, this instantly wipes trades, events, portfolios, and settings.
                  await supabase.from('profiles').delete().eq('id', user.id);
                  
                  // Sign the user out of the dead Auth shell
                  await supabase.auth.signOut();
                  window.location.href = "/register";
                }
              }}>Delete Account</Button>`;

const newDanger = `<Button variant="destructive" onClick={async () => {
                if(confirm("Are you absolutely sure you want to Factory Reset your journal? All trades, portfolios, and history will be permanently deleted. You will start fresh with a default account.")) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;
                  
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
                    starting_balance: 1000,
                    current_balance: 1000
                  });
                  
                  toast({ title: "Factory Reset Complete", description: "Your journal has been completely wiped clean." });
                  window.location.href = "/dashboard";
                }
              }}>Factory Reset Journal</Button>`;

content = content.replace(oldDanger, newDanger);

content = content.replace(
  'Permanently delete your account, wiping all trade history, portfolio ledgers, and custom playbooks. This action cannot be undone.',
  'Perform a Factory Reset. This permanently deletes all your trades, custom portfolios, and ledger events, starting you fresh with a single default $1,000 account. Your login and strategies will remain.'
);

content = content.replace(
  '<CardTitle className="text-loss text-lg">Danger Zone</CardTitle>',
  '<CardTitle className="text-loss text-lg">Factory Reset</CardTitle>'
);

fs.writeFileSync('src/app/settings/page.tsx', content);

console.log("Factory reset logic patched.");
