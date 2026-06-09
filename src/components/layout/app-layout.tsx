"use client";

import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart2, Wallet, Settings, LogOut, Plus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/components/privacy-provider";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Portfolio } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: BookOpen },
  { href: "/statistics", label: "Statistics", icon: BarChart2 },
  { href: "/account", label: "Account", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help / Guides", icon: HelpCircle },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const pathname = usePathname();

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Perform operations safely sequentially
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id).neq('id', id);
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    setActivePortfolio(id);
    
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
        </div>
        
        <Link href="/trades/new" className="mb-6">
          <Button className="w-full justify-start gap-2 hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" /> New Trade
          </Button>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                    : "text-text-secondary hover:text-foreground hover:bg-background-tertiary"
                )}
              >
                {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                {item.label}
                <span className="absolute inset-0 bg-foreground/5 opacity-0 group-active:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 text-text-secondary hover:text-loss hover:bg-loss/10 rounded-md transition-all mt-auto group"
        >
          <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Log Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 relative bg-background">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background-secondary flex items-center justify-around px-2 z-50">
        {navItems.filter(i => i.href !== '/help').map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-300",
                isActive ? "text-accent scale-110" : "text-text-secondary"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile FAB */}
      <Link href="/trades/new" className="md:hidden fixed bottom-20 right-4 z-50">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}