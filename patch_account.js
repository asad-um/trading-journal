const fs = require('fs');
let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// The user wants a clean SaaS-style layout for the Account page.
// Let's replace the content block with a beautiful tabbed/pill-based SaaS design.

const newAccountPage = `"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Profile, AccountEvent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ArrowUpRight, ArrowDownRight, RefreshCcw, CreditCard, History, Building } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrivacy } from "@/components/privacy-provider";

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<AccountEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStartingBalance, setNewStartingBalance] = useState("");
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("account_events").select("*").eq("user_id", user.id).order("event_date", { ascending: false })
    ]);

    if (profRes.data) {
      setProfile(profRes.data);
      setNewStartingBalance(profRes.data.starting_balance.toString());
    }
    if (eventsRes.data) setEvents(eventsRes.data);
    setIsLoading(false);
  }

  const handleUpdateStartingBalance = async () => {
    if (!confirm("Changing your starting balance will recalculate your entire performance history. Continue?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({ starting_balance: parseFloat(newStartingBalance) }).eq("id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Starting balance updated. All metrics recalculated." });
      fetchData(); // Refresh to get recalculated current_balance via trigger
    }
  };

  const handleAddEvent = async (type: 'deposit' | 'withdrawal' | 'adjustment') => {
    const amountStr = prompt(\`Enter amount for \${type}:\`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("account_events").insert({
      user_id: user.id,
      event_type: type,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Event added." });
      fetchData();
    }
  };

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20 w-full animate-in fade-in duration-500">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Capital Management</h1>
            <p className="text-text-muted mt-1">Manage your master portfolio balance and transaction history.</p>
          </div>
          
          <div className="flex bg-background-secondary p-1 rounded-lg border border-border/50">
            <Button size="sm" variant="ghost" className="text-win hover:bg-win/10 hover:text-win" onClick={() => handleAddEvent('deposit')}>
              <ArrowUpRight className="h-4 w-4 mr-2" /> Deposit
            </Button>
            <div className="w-[1px] bg-border my-1 mx-1"></div>
            <Button size="sm" variant="ghost" className="text-loss hover:bg-loss/10 hover:text-loss" onClick={() => handleAddEvent('withdrawal')}>
              <ArrowDownRight className="h-4 w-4 mr-2" /> Withdraw
            </Button>
          </div>
        </div>

        {/* Master Balance Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-secondary/50 via-background to-background relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-sm font-medium text-text-muted mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" /> 
                  Master Net Balance
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-bold font-mono tracking-tight text-foreground">
                    {blurMoney(profile?.current_balance)}
                  </h2>
                  <span className="text-xl text-text-muted font-mono">{profile?.currency || 'USD'}</span>
                </div>
              </div>

              <div className="bg-background-secondary/80 backdrop-blur-md p-4 rounded-xl border border-border/50 min-w-[240px]">
                <Label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Initial Starting Capital</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={newStartingBalance} 
                    onChange={(e) => setNewStartingBalance(e.target.value)} 
                    className="font-mono bg-background focus-visible:ring-primary/50"
                  />
                  <Button onClick={handleUpdateStartingBalance} variant="secondary">Update</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions & Ledgers */}
        <Tabs defaultValue="ledger" className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 space-x-6">
            <TabsTrigger value="ledger" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground">
              <History className="h-4 w-4 mr-2" /> Ledger History
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground" disabled>
              <CreditCard className="h-4 w-4 mr-2" /> Subscription (Pro)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="pt-6 outline-none">
            <Card className="border-border/50 shadow-sm bg-background overflow-hidden">
              <CardHeader className="bg-background-secondary/30 border-b border-border/50 pb-4">
                <CardTitle className="text-lg">Transaction Ledger</CardTitle>
                <CardDescription>A complete log of all deposits, withdrawals, and manual adjustments.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="text-center py-16 text-text-muted">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No transactions found.</p>
                    <p className="text-xs mt-1">Use the buttons above to log a deposit or withdrawal.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {events.map(ev => (
                      <div key={ev.id} className="flex justify-between items-center p-5 hover:bg-background-secondary/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={\`p-3 rounded-full \${
                            ev.event_type === 'deposit' ? 'bg-win/10 text-win' : 
                            ev.event_type === 'withdrawal' ? 'bg-loss/10 text-loss' : 'bg-primary/10 text-primary'
                          }\`}>
                            {ev.event_type === 'deposit' ? <ArrowUpRight className="h-5 w-5" /> : 
                             ev.event_type === 'withdrawal' ? <ArrowDownRight className="h-5 w-5" /> : <RefreshCcw className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold capitalize text-foreground">{ev.event_type}</p>
                            <p className="text-xs text-text-muted mt-0.5">{format(new Date(ev.event_date), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={\`font-mono text-lg font-bold \${
                            ev.event_type === 'deposit' ? 'text-win' : 
                            ev.event_type === 'withdrawal' ? 'text-loss' : 'text-foreground'
                          }\`}>
                            {ev.event_type === 'withdrawal' ? '-' : '+'}{blurMoney(ev.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
`;

fs.writeFileSync('src/app/account/page.tsx', newAccountPage);

