const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// The user noted that the "Danger Zone" account deletion tells them to contact admin.
// This is because we haven't wired up an actual Supabase edge function to delete the Auth user.
// In Supabase, standard client browsers (createBrowserClient) CANNOT delete the underlying Auth User for security reasons.
// They can only delete their public.profiles row. But because we have `ON DELETE CASCADE` setup on the foreign key,
// deleting the profile row WILL wipe their entire account, trades, portfolios, and settings, effectively deleting the account.

const oldDanger = `<Button variant="destructive" onClick={() => {
                if(confirm("Are you absolutely sure you want to permanently delete your account and all data?")) {
                  alert("Please contact admin to finalize deletion of database rows.");
                }
              }}>Delete Account</Button>`;

const newDanger = `<Button variant="destructive" onClick={async () => {
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

content = content.replace(oldDanger, newDanger);
fs.writeFileSync('src/app/settings/page.tsx', content);

