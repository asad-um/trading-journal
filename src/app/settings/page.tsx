"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Profile, UserSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Loader2, Download, Plus, Trash2, UploadCloud } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Temporary states for new list items
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [toast]);

  async function fetchData() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, setRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).single()
    ]);

    if (profRes.data) setProfile(profRes.data);
    if (setRes.data) setSettings(setRes.data);
    setIsLoading(false);
  }

  const handleUpdateProfile = async (field: keyof Profile, value: string | number) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", profile.id);
    if (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } else {
      setProfile({ ...profile, [field]: value as never });
      toast({ title: "Saved", description: "Profile setting updated successfully." });
    }
  };

  const handleUpdateList = async (listName: keyof UserSettings, newList: { id?: string; name?: string; label?: string; symbol?: string; asset_class?: string; custom?: boolean; [key: string]: unknown }[]) => {
    if (!settings) return;
    const { error } = await supabase.from("user_settings").update({ [listName]: newList }).eq("id", settings.id);
    if (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } else {
      setSettings({ ...settings, [listName]: newList as never });
      toast({ title: "Saved", description: "List updated successfully." });
    }
  };

  const handleAddListItem = (listName: keyof UserSettings, isAsset: boolean = false) => {
    if (!settings) return;
    const val = newItemInputs[listName] || "";
    if (!val.trim()) return;

    let newItem: { id?: string; name?: string; label?: string; symbol?: string; asset_class?: string; custom?: boolean; [key: string]: unknown };
    if (isAsset) {
      // Split by comma: &quot;SYMBOL, Class&quot; e.g. "BTCUSD, Crypto"
      const parts = val.split(",");
      newItem = {
        symbol: parts[0].trim().toUpperCase(),
        asset_class: parts.length > 1 ? parts[1].trim() : "Other",
        custom: true
      };
    } else {
      newItem = {
        id: Math.random().toString(36).substring(7),
        label: val.trim(),
        name: val.trim() // Some lists use 'name' instead of 'label'
      };
    }

    const currentList = Array.isArray(settings[listName]) ? [...(settings[listName] as { id?: string; name?: string; label?: string; symbol?: string; asset_class?: string; custom?: boolean; [key: string]: unknown }[])] : [];
    
    // Quick deduplication check
    if (isAsset) {
      if (currentList.some(i => i.symbol === newItem.symbol)) {
         toast({ title: "Exists", description: "Item already exists.", variant: "destructive" });
         return;
      }
    } else {
      if (currentList.some(i => i.label === newItem.label || i.name === newItem.name)) {
         toast({ title: "Exists", description: "Item already exists.", variant: "destructive" });
         return;
      }
    }

    currentList.push(newItem);
    handleUpdateList(listName, currentList);
    setNewItemInputs(prev => ({ ...prev, [listName]: "" }));
  };

  const handleRemoveListItem = (listName: keyof UserSettings, identifier: string, isAsset: boolean = false) => {
    if (!settings) return;
    const currentList = Array.isArray(settings[listName]) ? (settings[listName] as { id?: string; name?: string; label?: string; symbol?: string; asset_class?: string; custom?: boolean; [key: string]: unknown }[]) : [];
    let newList;
    
    if (isAsset) {
      // Prevent deleting non-custom assets
      const item = currentList.find(i => i.symbol === identifier);
      if (item && !item.custom) {
        toast({ title: "Error", description: "Cannot delete default assets.", variant: "destructive" });
        return;
      }
      newList = currentList.filter(i => i.symbol !== identifier);
    } else {
      newList = currentList.filter(i => i.id !== identifier);
    }
    
    handleUpdateList(listName, newList);
  };

  const handleExportCSV = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from("trades").select("*").eq("user_id", profile.id);
    if (error) {
      toast({ title: "Export Error", description: (error as Error).message, variant: "destructive" });
      return;
    }
    
    if (data && data.length > 0) {
      const header = Object.keys(data[0]).join(",");
      const rows = data.map(obj => Object.values(obj).map(v => typeof v === 'object' ? JSON.stringify(v).replace(/,/g, ';') : v).join(","));
      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wyckoff-journal-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      toast({ title: "No Data", description: "No trades to export." });
    }
  };

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 w-full">
        <div className="flex flex-col space-y-1 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-text-muted">Manage your workspace preferences, playbooks, and exports.</p>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 space-x-8 overflow-x-auto flex-nowrap md:flex-wrap">
            <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">General</TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Playbooks</TabsTrigger>
            <TabsTrigger value="lists" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Checklists</TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Assets & Platforms</TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Data Export</TabsTrigger>
          </TabsList>
          
          {/* TAB 1: Preferences */}
          <TabsContent value="general" className="space-y-8 pt-4 outline-none">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Trade Preferences</CardTitle>
                <CardDescription>Default settings applied when you log a new trade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Default Risk (%)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={profile?.default_risk_percentage || 0} 
                        onChange={(e) => setProfile(prev => prev ? { ...prev, default_risk_percentage: parseFloat(e.target.value) } : null)}
                        className="bg-background-secondary border-border/50 focus-visible:ring-primary/50"
                      />
                      <Button variant="secondary" onClick={() => handleUpdateProfile('default_risk_percentage', profile?.default_risk_percentage || 0)}>Save</Button>
                    </div>
                    <p className="text-xs text-text-muted">Calculates risk amount automatically based on your active portfolio balance.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Display Currency</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        value={profile?.currency || 'USD'} 
                        onChange={(e) => setProfile(prev => prev ? { ...prev, currency: e.target.value } : null)}
                        className="bg-background-secondary border-border/50 focus-visible:ring-primary/50 uppercase"
                      />
                      <Button variant="secondary" onClick={() => handleUpdateProfile('currency', profile?.currency || 'USD')}>Save</Button>
                    </div>
                    <p className="text-xs text-text-muted">Visual label only (e.g. USD, EUR, GBP).</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the interface theme.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    onClick={() => setTheme('light')}
                    className={theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}
                  >
                    Light Mode
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    onClick={() => setTheme('dark')}
                    className={theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}
                  >
                    Dark Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone (Restored Full Layout) */}
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
                <Button variant="outline" className="w-full text-loss border-loss/50 hover:bg-loss hover:text-white transition-all whitespace-normal h-auto py-2" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to Factory Reset your journal? This cannot be undone.")) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
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

                    await Promise.all([
                      supabase.from('trades').delete().eq('user_id', user.id),
                      supabase.from('account_events').delete().eq('user_id', user.id),
                      supabase.from('portfolios').delete().eq('user_id', user.id)
                    ]);
                    
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
                <Button variant="destructive" className="w-full shadow-lg hover:shadow-xl transition-all whitespace-normal h-auto py-2" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                    try {
                      const res = await fetch('/api/delete-account', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to delete account. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
                      
                      await supabase.auth.signOut();
                      window.location.href = "/register";
                    } catch (error: any) {
                      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
                    }
                  }
                }}>Permanently Delete Account</Button>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          {/* TAB 2: Strategies */}
          <TabsContent value="strategies" className="space-y-6 pt-4">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Strategy Playbooks</CardTitle>
                <CardDescription>Format: &quot;Strategy | Playbook&quot; (e.g. Wyckoff | Blue Box)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Strategy | Sub-strategy..." 
                    value={newItemInputs['strategies_list'] || ""}
                    onChange={e => setNewItemInputs(p => ({...p, strategies_list: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && handleAddListItem('strategies_list')}
                  />
                  <Button onClick={() => handleAddListItem('strategies_list')}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settings?.strategies_list?.map((item: any) => (
                    <div key={item.id || item.label} className="flex justify-between items-center p-2 bg-background-secondary rounded border border-border">
                      <span className="text-sm font-semibold">{item.label || item.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('strategies_list', item.id || "")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Checklists */}
          <TabsContent value="lists" className="space-y-6 pt-4">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Criteria Checklist</CardTitle>
                <CardDescription>Manage your pre-trade confirmation criteria.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="New criterion..." 
                    value={newItemInputs['criteria_list'] || ""}
                    onChange={e => setNewItemInputs(p => ({...p, criteria_list: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && handleAddListItem('criteria_list')}
                  />
                  <Button onClick={() => handleAddListItem('criteria_list')}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settings?.criteria_list?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-background-secondary rounded border border-border">
                      <span className="text-sm">{item.label}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('criteria_list', item.id || "")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Mistake Categories</CardTitle>
                <CardDescription>Common mistakes you make (used for journaling discipline).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="New mistake category..." 
                    value={newItemInputs['mistake_categories_list'] || ""}
                    onChange={e => setNewItemInputs(p => ({...p, mistake_categories_list: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && handleAddListItem('mistake_categories_list')}
                  />
                  <Button onClick={() => handleAddListItem('mistake_categories_list')}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settings?.mistake_categories_list?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-background-secondary rounded border border-border">
                      <span className="text-sm">{item.label}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('mistake_categories_list', item.id || "")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Assets & Platforms */}
          <TabsContent value="assets" className="space-y-6 pt-4">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Traded Assets</CardTitle>
                <CardDescription>Your instrument watchlist. Format: &quot;SYMBOL, Class&quot;</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. BTCUSD, Crypto" 
                    value={newItemInputs['asset_list'] || ""}
                    onChange={e => setNewItemInputs(p => ({...p, asset_list: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && handleAddListItem('asset_list', true)}
                  />
                  <Button onClick={() => handleAddListItem('asset_list', true)}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settings?.asset_list?.map((item: any) => (
                    <div key={item.symbol} className="flex justify-between items-center p-2 bg-background-secondary rounded border border-border">
                      <div>
                        <span className="text-sm font-bold">{item.symbol}</span>
                        <span className="text-xs text-text-muted ml-2">{item.asset_class}</span>
                      </div>
                      {item.custom && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('asset_list', item.symbol || "", true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          


        
          {/* TAB 5: Export & Import Data */}
          <TabsContent value="export" className="pt-4 space-y-6">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Bulk Import Trades (CSV)</CardTitle>
                <CardDescription>Import historical trades from a spreadsheet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-text-muted">
                  To ensure a successful import, please download our standard template. Fill it with your historical trades, then select the file below to upload. 
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" onClick={() => {
                    const template = "trade_date,trade_time_utc,symbol,direction,entry_price,stop_loss_price,status,net_pnl\n2023-01-15,14:30,XAUUSD,Long,1950.00,1940.00,Closed - Win,500.00";
                    const blob = new Blob([template], { type: "text/csv" });
                    const a = document.createElement("a");
                    a.href = window.URL.createObjectURL(blob);
                    a.download = "wyckoff-journal-template.csv";
                    a.click();
                  }}>
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>
                  
                  <div className="relative">
                    <Input 
                      type="file" 
                      accept=".csv" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const Papa = (await import('papaparse')).default;
                        Papa.parse(file, {
                          header: true,
                          skipEmptyLines: true,
                          complete: async (results) => {
                            try {
                              setIsLoading(true);
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) throw new Error("Not authenticated");
                              const { data: activePorts } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
                              const activePort = activePorts?.[0];
                              if (!activePort) throw new Error("No active account.");

                              const newTrades = results.data.map((row: any) => ({
                                user_id: user.id,
                                portfolio_id: activePort.id,
                                trade_date: row.trade_date || new Date().toISOString().split('T')[0],
                                trade_time_utc: row.trade_time_utc || '00:00',
                                symbol: row.symbol || 'UNKNOWN',
                                asset_class: 'Other',
                                direction: row.direction || 'Long',
                                entry_price: Number(row.entry_price || 0),
                                stop_loss_price: Number(row.stop_loss_price || 0),
                                status: row.status || 'Closed - Win',
                                net_pnl: Number(row.net_pnl || 0),
                                gross_pnl: Number(row.net_pnl || 0),
                                analysis_timeframe: '1H',
                                entry_timeframe: '15M',
                                strategy: 'Imported',
                                schematic: 'Other',
                                entry_event: 'Other',
                                num_tp_levels: 1,
                                risk_percentage: 1
                              }));

                              const { error } = await supabase.from('trades').insert(newTrades);
                              if (error) throw error;
                              
                              toast({ title: "Import Successful", description: `${newTrades.length} trades imported securely.` });
                              window.location.reload();
                            } catch (err: unknown) {
                              toast({ title: "Import Failed", description: (err as Error).message, variant: "destructive" });
                              setIsLoading(false);
                            }
                          }
                        });
                      }}
                    />
                    <Button variant="default" className="w-full sm:w-auto">
                      <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download your entire trading history as a spreadsheet.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportCSV} className="w-full md:w-auto" variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export All Trades (CSV)
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Public Track Record</CardTitle>
                <CardDescription>Generate a secure, read-only link to share your performance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-text-muted">
                  When enabled, anyone with the link can view your Win Rate, Profit Factor, and Equity Curve. 
                  <strong> All monetary values (account balance, lot sizes, PnL) are permanently hidden from the public view.</strong>
                </p>
                <Button variant="outline" onClick={() => alert("Public Sharing URL: https://trading-journal.vercel.app/shared/" + profile?.id + "\n\n(This feature will go live in the next phase update!)")}>
                  Generate Secure Link
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
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
                <Button variant="outline" className="w-full text-loss border-loss/50 hover:bg-loss hover:text-white transition-all whitespace-normal h-auto py-2" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to Factory Reset your journal? This cannot be undone.")) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
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

                    await Promise.all([
                      supabase.from('trades').delete().eq('user_id', user.id),
                      supabase.from('account_events').delete().eq('user_id', user.id),
                      supabase.from('portfolios').delete().eq('user_id', user.id)
                    ]);
                    
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
                <Button variant="destructive" className="w-full shadow-lg hover:shadow-xl transition-all whitespace-normal h-auto py-2" onClick={async () => {
                  if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                    try {
                      const res = await fetch('/api/delete-account', { method: 'POST' });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to delete account. Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel.");
                      
                      await supabase.auth.signOut();
                      window.location.href = "/register";
                    } catch (error: any) {
                      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
                    }
                  }
                }}>Permanently Delete Account</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
