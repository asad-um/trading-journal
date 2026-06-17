"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { AccountEvent, Portfolio } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ArrowUpRight, ArrowDownRight, RefreshCcw, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { usePrivacy } from "@/components/privacy-provider";

export default function AccountPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [events, setEvents] = useState<AccountEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
  const [dialogAmount, setDialogAmount] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // New Account Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    
      fetchData();
      const channel = supabase.channel('realtime-account')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'account_events' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchData(true))
        .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData(silent: boolean = false) {
    if (!silent) setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }

    const { data: ports, error } = await supabase.from('portfolios').select('*').eq('user_id', user.id).order('created_at');
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (ports && ports.length > 0) {
      setPortfolios(ports);
      const active = ports.find(p => p.is_active) || ports[0];
      setActivePortfolio(active);

      const { data: eventsRes } = await supabase
        .from("account_events")
        .select("*")
        .eq("portfolio_id", active.id)
        .order("event_date", { ascending: false });
        
      if (eventsRes) setEvents(eventsRes);
    }
    setIsLoading(false);
  }

  const handleSwitchAccount = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setIsLoading(true);
    // Deactivate all others safely
    await supabase.from('portfolios').update({ is_active: false }).eq('user_id', user.id).neq('id', id);
    // Reactivate chosen safely
    await supabase.from('portfolios').update({ is_active: true }).eq('id', id);
    
    // Soft reload to preserve React state
    window.location.href = window.location.pathname;
  };

  const executeAddEvent = async () => {
    const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    if (dialogType === 'withdrawal' && activePortfolio && amount > activePortfolio.current_balance) {
      toast({ title: "Insufficient Funds", description: "You cannot withdraw more than your current balance.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activePortfolio) { setIsSubmittingEvent(false); return; }

    // If this is the first deposit on a zero-balance account, lock the
    // starting_balance to the deposit amount so the dashboard "Initial"
    // label and all statistics reflect the real funded amount.
    if (dialogType === 'deposit' && activePortfolio.starting_balance === 0) {
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .update({ starting_balance: amount })
        .eq('id', activePortfolio.id);

      if (portfolioError) {
        toast({ title: "Error", description: portfolioError.message, variant: "destructive" });
        setIsSubmittingEvent(false);
        return;
      }
    }

    const { error } = await supabase.from("account_events").insert({
      user_id: user.id,
      portfolio_id: activePortfolio.id,
      event_type: dialogType,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} recorded successfully.` });
      setIsDialogOpen(false);
      fetchData();
    }
    setIsSubmittingEvent(false);
  };

  
  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to permanently delete this account AND all of its trades/transactions? This cannot be undone.")) return;
    
    setIsLoading(true);
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Account permanently deleted." });
      if (activePortfolio?.id === id) setActivePortfolio(null); // Clear active if we just deleted it
      fetchData();
      // Soft reload to clear ghost data without full page crash
      window.location.href = window.location.pathname;
    }
    setIsLoading(false);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      toast({ title: "Invalid Name", description: "Account name is required.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSubmittingEvent(false); return; }

    // Create the account starting at $0. If an initial balance was provided,
    // record it as the first deposit so the trigger sets starting_balance
    // and current_balance automatically.
    const { data: newPortfolio, error: insertError } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        name: newAccountName.trim(),
        starting_balance: 0,
        current_balance: 0,
        is_active: false
      })
      .select('id')
      .single();

    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
      setIsSubmittingEvent(false);
      return;
    }

    const initialBalance = parseFloat(newAccountBalance);
    if (!isNaN(initialBalance) && initialBalance > 0 && newPortfolio) {
      // Set starting_balance and current_balance directly on the portfolio
      const { error: updateError } = await supabase
        .from('portfolios')
        .update({ starting_balance: initialBalance, current_balance: initialBalance })
        .eq('id', newPortfolio.id);

      if (updateError) {
        toast({ title: "Warning", description: "Account created but balance update failed: " + updateError.message, variant: "destructive" });
        setIsSubmittingEvent(false);
        return;
      }

      // Record the deposit event for ledger history
      const { error: eventError } = await supabase.from("account_events").insert({
        user_id: user.id,
        portfolio_id: newPortfolio.id,
        event_type: 'deposit',
        amount: initialBalance,
        event_date: format(new Date(), "yyyy-MM-dd"),
      });

      if (eventError) {
        toast({ title: "Warning", description: "Account created but deposit event failed: " + eventError.message, variant: "destructive" });
      }
    }

    toast({ title: "Success", description: "New live account created." });
    setIsCreateDialogOpen(false);
    setNewAccountName("");
    setNewAccountBalance("");
    fetchData();
    setIsSubmittingEvent(false);
  };

  const openDialog = (type: 'deposit' | 'withdrawal' | 'adjustment') => {
    setDialogType(type);
    setDialogAmount("");
    setIsDialogOpen(true);
  };

  if (isLoading && portfolios.length === 0) {
    return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 pb-20 w-full animate-in fade-in duration-500">
        
        {/* Trading Accounts Section (cTrader/SaaS Style) */}
        <section>
          <div className="flex flex-col space-y-1 mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Trading Accounts</h1>
            <p className="text-text-muted">Manage your live and simulated portfolios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {portfolios.map(p => (
              <Card 
                key={p.id} 
                className={`relative overflow-hidden transition-all duration-300 bg-background-secondary/50 ${
                  p.is_active 
                    ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.15)] ring-1 ring-primary/50' 
                    : 'border-border/60 hover:border-border'
                }`}
              >
                <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-win shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Live</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm px-2 py-1 bg-background rounded-md border border-border/50 shadow-sm">{p.name}</span>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem className="focus:bg-background-tertiary cursor-pointer" onClick={() => {
                              supabase.from('portfolios').update({ is_active: false }).eq('id', p.id).then(() => window.location.href = window.location.pathname);
                            }}>
                              Deactivate Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-loss focus:bg-loss/10 focus:text-loss cursor-pointer" onClick={() => handleDeleteAccount(p.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-4xl font-mono font-bold tracking-tight">{blurMoney(p.current_balance, '')}</h3>
                      <span className="text-sm font-semibold text-text-muted">{p.currency}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2 font-mono uppercase tracking-wider">Acc ID: {p.id.split('-')[0]}</p>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    {p.is_active ? (
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-win/10 text-win hover:bg-win/20 border border-win/20 hover:border-win/50 transition-all" onClick={() => openDialog('deposit')}>
                          <ArrowUpRight className="h-4 w-4 mr-2" /> Deposit
                        </Button>
                        <Button className="flex-1 bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 hover:border-loss/50 transition-all" onClick={() => openDialog('withdrawal')}>
                          <ArrowDownRight className="h-4 w-4 mr-2" /> Withdraw
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between font-semibold text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleSwitchAccount(p.id)}
                      >
                        Switch to Account <ArrowRight className="h-4 w-4"/>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Account Card */}
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-full min-h-[240px] w-full border-dashed border-2 border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-4 transition-all group rounded-xl"
            >
              <div className="p-4 bg-background-secondary rounded-full group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                <Plus className="h-6 w-6 text-text-muted group-hover:text-primary" />
              </div>
              <span className="font-semibold text-text-muted group-hover:text-foreground">Create New Live Account</span>
            </Button>
          </div>
        </section>

        {/* Ledger Section for Active Account */}
        {activePortfolio && (
          <section className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                Transactions
              </h2>
            </div>

            <Card className="border-border/50 shadow-sm bg-background overflow-hidden">
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="text-center py-16 text-text-muted">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No transactions found for this account.</p>
                    <p className="text-xs mt-1">Use the buttons above to log a deposit or withdrawal.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {events.map(ev => (
                      <div key={ev.id} className="flex justify-between items-center p-5 hover:bg-background-secondary/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${
                            ev.event_type === 'deposit' ? 'bg-win/10 text-win' : 
                            ev.event_type === 'withdrawal' ? 'bg-loss/10 text-loss' : 'bg-primary/10 text-primary'
                          }`}>
                            {ev.event_type === 'deposit' ? <ArrowUpRight className="h-5 w-5" /> : 
                             ev.event_type === 'withdrawal' ? <ArrowDownRight className="h-5 w-5" /> : <RefreshCcw className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold capitalize text-foreground">{ev.event_type}</p>
                            <p className="text-xs text-text-muted mt-0.5">{format(new Date(ev.event_date), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono text-lg font-bold ${
                            ev.event_type === 'deposit' ? 'text-win' : 
                            ev.event_type === 'withdrawal' ? 'text-loss' : 'text-foreground'
                          }`}>
                            {ev.event_type === 'withdrawal' ? '-' : '+'}{blurMoney(ev.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Action Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-background border-border">
            <DialogHeader>
              <DialogTitle className="capitalize text-xl flex items-center gap-2">
                {dialogType === 'deposit' ? <ArrowUpRight className="text-win h-5 w-5"/> : <ArrowDownRight className="text-loss h-5 w-5"/>}
                Log {dialogType}
              </DialogTitle>
              <DialogDescription>
                Enter the monetary amount to adjust the balance of <strong>{activePortfolio?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Label htmlFor="amount" className="text-xs uppercase tracking-wider text-text-muted mb-2 block">Amount ({activePortfolio?.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={dialogAmount}
                onChange={(e) => setDialogAmount(e.target.value)}
                placeholder="e.g. 500.00"
                className="font-mono text-lg h-12"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingEvent}>Cancel</Button>
              <Button onClick={executeAddEvent} disabled={isSubmittingEvent || !dialogAmount} className={dialogType === 'deposit' ? 'bg-win hover:bg-win/90 text-white' : 'bg-loss hover:bg-loss/90 text-white'}>
                {isSubmittingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm {dialogType}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Account Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Plus className="text-primary h-5 w-5"/>
                Create New Live Account
              </DialogTitle>
              <DialogDescription>
                Set up a new isolated portfolio to track trades separately.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="accName" className="text-xs uppercase tracking-wider text-text-muted mb-2 block">Account Name</Label>
                <Input
                  id="accName"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., FTMO 100k Challenge"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="accBal" className="text-xs uppercase tracking-wider text-text-muted mb-2 block">
                  Initial Balance <span className="text-text-muted font-normal normal-case">(optional)</span>
                </Label>
                <Input
                  id="accBal"
                  type="number"
                  step="0.01"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  placeholder="Leave blank to start at $0"
                  className="h-10 font-mono"
                />
                <p className="text-xs text-text-muted mt-1">If provided, this will be recorded as the account's first deposit.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmittingEvent}>Cancel</Button>
              <Button onClick={handleCreateAccount} disabled={isSubmittingEvent || !newAccountName}>
                {isSubmittingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}

