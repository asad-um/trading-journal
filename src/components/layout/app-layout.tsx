"use client";

import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, BarChart2, Wallet, Camera, Settings, LogOut, Plus, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/components/privacy-provider";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Portfolio } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: BookOpen },
  { href: "/statistics", label: "Statistics", icon: BarChart2 },
  { href: "/playbook", label: "Playbook", icon: Camera },
  { href: "/account", label: "Account", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help / Guides", icon: HelpCircle },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const pathname = usePathname();
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Mobile: translucent floating logout icon that fades as user scrolls down
  const [logoutOpacity, setLogoutOpacity] = useState(0.85);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      const y = main.scrollTop;
      const direction = y > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = y;

      if (y < 30) {
        setLogoutOpacity(0.85);
        return;
      }
      if (direction === 'down') {
        setLogoutOpacity(0.2);
      } else {
        setLogoutOpacity(0.55);
      }
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSwitchPortfolio = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Perform operations safely sequentially
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id).neq('id', id);
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    setActivePortfolio(id);
    
    // Soft reload via Next.js router to preserve state and avoid full page refresh
    router.refresh();
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-background-secondary transition-all duration-300 ease-in-out relative",
          sidebarCollapsed ? "w-16 p-2" : "w-64 p-4"
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-6 bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-all z-50 hidden md:flex items-center justify-center"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <div className={cn("flex flex-col gap-4 mb-8", sidebarCollapsed && "items-center")}>
          <div className={cn("flex items-center justify-between", sidebarCollapsed ? "px-0 flex-col gap-2" : "px-2")}>
                {!sidebarCollapsed && <h1 className="text-xl font-bold text-foreground">T Pal</h1>}
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={togglePrivacy} className="text-text-secondary hover:text-foreground">
                {isPrivate ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
              </Button>
              {!sidebarCollapsed && <ThemeToggle />}
            </div>
          </div>
          
          {portfolios.length > 0 && !sidebarCollapsed && (
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
        
        <Link href="/trades/new" className={cn("mb-6", sidebarCollapsed && "flex justify-center")}>
          <Button 
            className={cn(
              "justify-start gap-2 hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95",
              sidebarCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full"
            )}
            title="New Trade"
          >
            <Plus className="h-4 w-4" />
            {!sidebarCollapsed && "New Trade"}
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
                  "flex items-center rounded-lg transition-all duration-200 relative group overflow-hidden",
                  sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                    : "text-text-secondary hover:text-foreground hover:bg-background-tertiary"
                )}
                title={item.label}
              >
                {isActive && <span className={cn("absolute top-0 bottom-0 w-1 bg-primary rounded-r-full", sidebarCollapsed ? "left-0" : "left-0")} />}
                <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                {!sidebarCollapsed && item.label}
                <span className="absolute inset-0 bg-foreground/5 opacity-0 group-active:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className={cn(
            "flex items-center text-text-secondary hover:text-loss hover:bg-loss/10 rounded-md transition-all mt-auto group",
            sidebarCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
          )}
          title="Log Out"
        >
          <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          {!sidebarCollapsed && "Log Out"}
        </button>
      </aside>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 relative bg-background">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background-secondary flex items-center justify-around px-2 z-50 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[3.5rem] w-full h-full transition-all duration-300 px-1",
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

      {/* Mobile Logout Button */}
      <button
        onClick={signOut}
        style={{ opacity: logoutOpacity }}
        className="md:hidden fixed top-4 right-4 z-50 p-2.5 rounded-full bg-background/60 backdrop-blur-md border border-border/50 shadow-sm text-text-secondary hover:text-loss active:scale-95 transition-opacity duration-300"
        title="Log Out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
