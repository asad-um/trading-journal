const fs = require('fs');
let content = fs.readFileSync('src/components/layout/app-layout.tsx', 'utf8');

// The user wants a way to switch between multiple internal accounts (portfolios) smoothly.
// This requires a new UI dropdown component in the sidebar to toggle active portfolios.

const newNav = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Portfolio } from "@/types";

const navItems = [`;

content = content.replace('const navItems = [', newNav);

const newSidebarHead = `
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolios() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('portfolios').select('*').eq('user_id', user.id);
      if (data && data.length > 0) {
        setPortfolios(data);
        const active = data.find(p => p.is_active);
        setActivePortfolio(active ? active.id : data[0].id);
      }
    }
    loadPortfolios();
  }, []);

  const handleSwitchPortfolio = async (id: string) => {
    setActivePortfolio(id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // First deactivate all
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id);
    // Reactivate the chosen one
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    // Refresh the page fully to reload all isolated data
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-background-secondary p-4">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between px-2">
            <h1 className="text-xl font-bold text-foreground">Trade Journal</h1>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-text-secondary hover:text-foreground">
                {isPrivate ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </Button>
              <ThemeToggle />
            </div>
          </div>
          
          {portfolios.length > 0 && (
            <Select value={activePortfolio || undefined} onValueChange={handleSwitchPortfolio}>
              <SelectTrigger className="h-10 bg-background/50 border-border/50">
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>`;

content = content.replace(
  /<aside className="hidden md:flex flex-col w-64 border-r border-border bg-background-secondary p-4">[\s\S]*?<div className="flex items-center justify-between mb-8 px-2">[\s\S]*?<\/div>/,
  newSidebarHead
);

fs.writeFileSync('src/components/layout/app-layout.tsx', content);

