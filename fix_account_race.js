const fs = require('fs');

let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// I need to apply the exact same race-condition fix to the Account page that I applied to the layout sidebar earlier.
// If a user clicks "Switch to Account" on the Account page, it currently fires update(false) and update(true) simultaneously.

const oldSwitch = `  const handleSwitchAccount = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setIsLoading(true);
    // Deactivate all
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id);
    // Reactivate chosen
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    window.location.reload();
  };`;

const newSwitch = `  const handleSwitchAccount = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setIsLoading(true);
    // Deactivate all others safely
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id).neq('id', id);
    // Reactivate chosen safely
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    window.location.reload();
  };`;

content = content.replace(oldSwitch, newSwitch);

fs.writeFileSync('src/app/account/page.tsx', content);
