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
import { Loader2, Download, Plus, Trash2, UploadCloud, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyPlaybooksEditor } from "@/components/settings/playbooks-editor";
import { normalizeStrategiesList } from "@/lib/defaults";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    preferences: true,
    appearance: true,
    sessions: true,
    criteria: true,
    assets: true,
  });

  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ listName: string; id: string; value: string; startTime?: string; endTime?: string } | null>(null);

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

  const handleUpdateList = async (listName: keyof UserSettings, newList: any[]) => {
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

    let newItem: any;
    if (isAsset) {
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
        name: val.trim()
      };
    }

    const currentList = Array.isArray(settings[listName]) ? [...(settings[listName] as any[])] : [];
    
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRemoveListItem = (listName: keyof UserSettings, identifier: string, isAsset: boolean = false) => {
    if (!settings) return;
    const currentList = Array.isArray(settings[listName]) ? (settings[listName] as any[]) : [];
    let newList;
    
    if (isAsset) {
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

  const handleEditListItem = (listName: keyof UserSettings, item: any, isAsset: boolean = false) => {
    const id = isAsset ? item.symbol : item.id;
    const value = isAsset ? `${item.symbol}, ${item.asset_class}` : (item.label || item.name);
    setEditingItem({ listName, id, value });
  };

  const handleAddSessionItem = () => {
    if (!settings) return;
    const label = (newItemInputs['sessions_list'] || "").trim();
    const start_time = newItemInputs['sessions_list_start'] || "00:00";
    const end_time = newItemInputs['sessions_list_end'] || "00:00";
    if (!label) return;

    const currentList = Array.isArray(settings.sessions_list) ? [...settings.sessions_list] : [];
    if (currentList.some(i => i.label === label)) {
      toast({ title: "Exists", description: "Session already exists.", variant: "destructive" });
      return;
    }

    const newItem = { id: Math.random().toString(36).substring(7), label, start_time, end_time };
    handleUpdateList('sessions_list', [...currentList, newItem]);
    setNewItemInputs(prev => ({ ...prev, sessions_list: "", sessions_list_start: "00:00", sessions_list_end: "00:00" }));
  };

  const handleEditSessionItem = (item: any) => {
    setEditingItem({ listName: 'sessions_list', id: item.id, value: item.label, startTime: item.start_time, endTime: item.end_time });
  };

  const handleSaveSessionEdit = async () => {
    if (!settings || !editingItem || editingItem.listName !== 'sessions_list') return;

    const currentList = Array.isArray(settings.sessions_list) ? [...settings.sessions_list] : [];
    const label = editingItem.value.trim();
    const start_time = editingItem.startTime || "00:00";
    const end_time = editingItem.endTime || "00:00";

    if (currentList.some(i => i.label === label && i.id !== editingItem.id)) {
      toast({ title: "Exists", description: "Session already exists.", variant: "destructive" });
      return;
    }

    const newList = currentList.map(i => i.id === editingItem.id ? { ...i, label, start_time, end_time } : i);
    await handleUpdateList('sessions_list', newList);
    setEditingItem(null);
  };

  const handleSaveEdit = async (listName: keyof UserSettings, isAsset: boolean = false) => {
    if (!settings || !editingItem || editingItem.listName !== listName) return;
    
    const currentList = Array.isArray(settings[listName]) ? [...(settings[listName] as any[])] : [];
    let newList;

    if (isAsset) {
      const parts = editingItem.value.split(",");
      const symbol = parts[0].trim().toUpperCase();
      const asset_class = parts.length > 1 ? parts[1].trim() : "Other";
      if (currentList.some(i => i.symbol === symbol && i.symbol !== editingItem.id)) {
        toast({ title: "Exists", description: "Asset already exists.", variant: "destructive" });
        return;
      }
      newList = currentList.map(i => i.symbol === editingItem.id ? { ...i, symbol, asset_class, custom: true } : i);
    } else {
      const label = editingItem.value.trim();
      if (currentList.some(i => (i.label === label || i.name === label) && i.id !== editingItem.id)) {
        toast({ title: "Exists", description: "Item already exists.", variant: "destructive" });
        return;
      }
      newList = currentList.map(i => i.id === editingItem.id ? { ...i, label, name: label } : i);
    }

    await handleUpdateList(listName, newList);
    setEditingItem(null);
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
            <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Assets</TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Data Export</TabsTrigger>
            <TabsTrigger value="danger" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-loss rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-loss whitespace-nowrap">Danger Zone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6 pt-4 outline-none">
            <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
              <button onClick={() => toggleSection('preferences')} className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Trade Preferences</h3>
                  <p className="text-xs text-text-muted">Default settings applied when you log a new trade.</p>
                </div>
                {expandedSections.preferences ? <ChevronUp className="h-5 w-5 text-text-muted"/> : <ChevronDown className="h-5 w-5 text-text-muted"/>}
              </button>
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.preferences ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <CardContent className="space-y-4 pt-0 pb-6 px-4 md:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Default Risk (%)</Label>
                      <div className="flex gap-2">
                        <Input type="number" step="0.1" value={profile?.default_risk_percentage || 0} onChange={(e) => setProfile(prev => prev ? { ...prev, default_risk_percentage: parseFloat(e.target.value) } : null)} className="bg-background-secondary border-border/50 focus-visible:ring-primary/50 h-9" />
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateProfile('default_risk_percentage', profile?.default_risk_percentage || 0)}>Save</Button>
                      </div>
                      <p className="text-xs text-text-muted">Calculates risk amount automatically based on your active portfolio balance.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Display Currency</Label>
                      <div className="flex gap-2">
                        <Input type="text" value={profile?.currency || 'USD'} onChange={(e) => setProfile(prev => prev ? { ...prev, currency: e.target.value } : null)} className="bg-background-secondary border-border/50 focus-visible:ring-primary/50 uppercase h-9" />
                        <Button size="sm" variant="secondary" onClick={() => handleUpdateProfile('currency', profile?.currency || 'USD')}>Save</Button>
                      </div>
                      <p className="text-xs text-text-muted">Visual label only (e.g. USD, EUR, GBP).</p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
              <button onClick={() => toggleSection('appearance')} className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Appearance</h3>
                  <p className="text-xs text-text-muted">Customize the interface theme.</p>
                </div>
                {expandedSections.appearance ? <ChevronUp className="h-5 w-5 text-text-muted"/> : <ChevronDown className="h-5 w-5 text-text-muted"/>}
              </button>
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.appearance ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <CardContent className="pt-0 pb-6 px-4 md:px-6">
                  <div className="flex gap-4">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}>Light Mode</Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}>Dark Mode</Button>
                  </div>
                </CardContent>
              </div>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
              <button onClick={() => toggleSection('sessions')} className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Trading Sessions</h3>
                  <p className="text-xs text-text-muted">Define session time windows in UTC. Trades are tagged automatically by execution time.</p>
                </div>
                {expandedSections.sessions ? <ChevronUp className="h-5 w-5 text-text-muted"/> : <ChevronDown className="h-5 w-5 text-text-muted"/>}
              </button>
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.sessions ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <CardContent className="space-y-3 pt-0 pb-6 px-4 md:px-6">
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input placeholder="Session name..." value={newItemInputs['sessions_list'] || ""} onChange={e => setNewItemInputs(p => ({...p, sessions_list: e.target.value}))} onKeyDown={e => e.key === 'Enter' && handleAddSessionItem()} className="h-9 flex-1 min-w-0" />
                    <div className="flex gap-2 items-center justify-between md:justify-start">
                      <div className="flex items-center gap-2 bg-background-secondary rounded-md px-2 border border-border">
                        <input type="time" value={newItemInputs['sessions_list_start'] || "00:00"} onChange={e => setNewItemInputs(p => ({...p, sessions_list_start: e.target.value}))} className="h-9 w-[90px] bg-transparent text-sm text-foreground focus:outline-none" />
                        <span className="text-xs text-text-muted">to</span>
                        <input type="time" value={newItemInputs['sessions_list_end'] || "00:00"} onChange={e => setNewItemInputs(p => ({...p, sessions_list_end: e.target.value}))} className="h-9 w-[90px] bg-transparent text-sm text-foreground focus:outline-none" />
                      </div>
                      <Button size="sm" onClick={() => handleAddSessionItem()} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {settings?.sessions_list?.map((item: any) => (
                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 bg-background-secondary rounded border border-border">
                        {editingItem?.listName === 'sessions_list' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex flex-col md:flex-row gap-2 w-full">
                            <Input value={editingItem.value} onChange={e => setEditingItem(prev => prev ? { ...prev, value: e.target.value } : null)} onKeyDown={e => e.key === 'Enter' && handleSaveSessionEdit()} className="h-8 text-sm flex-1 min-w-0" autoFocus placeholder="Session name" />
                            <div className="flex gap-2 items-center justify-between md:justify-start w-full md:w-auto">
                              <div className="flex items-center gap-2 bg-background rounded-md px-2 border border-border">
                                <input type="time" value={editingItem.startTime || item.start_time} onChange={e => setEditingItem(prev => prev ? { ...prev, startTime: e.target.value } : null)} className="h-8 w-[90px] bg-transparent text-sm text-foreground focus:outline-none" />
                                <span className="text-xs text-text-muted">to</span>
                                <input type="time" value={editingItem.endTime || item.end_time} onChange={e => setEditingItem(prev => prev ? { ...prev, endTime: e.target.value } : null)} className="h-8 w-[90px] bg-transparent text-sm text-foreground focus:outline-none" />
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => handleSaveSessionEdit()}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm truncate">{item.label}</span>
                              <span className="text-xs text-text-muted">{item.start_time} – {item.end_time} UTC</span>
                            </div>
                            <div className="flex items-center shrink-0 self-end sm:self-auto">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" onClick={() => handleEditSessionItem(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('sessions_list', item.id || "")}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="danger" className="space-y-6 pt-4">
            <div className="p-4 md:p-6 border border-loss/30 bg-loss/5 rounded-xl">
              <h2 className="text-xl font-bold tracking-tight text-loss">Danger Zone</h2>
              <p className="text-xs md:text-sm text-text-muted">Destructive actions for your account and data. These cannot be undone.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-loss/30 bg-loss/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-loss text-base md:text-lg">Factory Reset</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between gap-4 h-full">
                  <p className="text-sm text-text-muted">Permanently deletes all your trades, custom portfolios, and ledger events. Your login and settings will remain, and you will start fresh with a clean $0.00 Main Account.</p>
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
                      await supabase.from('portfolios').insert({ user_id: user.id, name: 'Main Account', is_active: true, starting_balance: 0, current_balance: 0 });
                      toast({ title: "Factory Reset Complete", description: "Your journal has been completely wiped clean." });
                      window.location.href = "/dashboard";
                    }
                  }}>Factory Reset Journal</Button>
                </CardContent>
              </Card>

              <Card className="border-loss/50 bg-loss/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-loss text-base md:text-lg">Delete Account</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between gap-4 h-full">
                  <p className="text-sm text-text-muted">Permanently deletes your entire account, wiping all trade history, portfolio ledgers, custom playbooks, and authentication records from our servers.</p>
                  <Button variant="destructive" className="w-full shadow-lg hover:shadow-xl transition-all whitespace-normal h-auto py-2" onClick={async () => {
                    if(confirm("Are you absolutely sure you want to permanently delete your account and all data? This cannot be undone.")) {
                      try {
                        const res = await fetch('/api/delete-account', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Account deletion failed. Please contact support.");
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
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6 pt-4">
            <StrategyPlaybooksEditor
              strategies={settings?.strategies_list ? normalizeStrategiesList(settings.strategies_list) : []}
              onChange={(newList) => handleUpdateList('strategies_list', newList)}
            />
          </TabsContent>

          <TabsContent value="lists" className="space-y-6 pt-4">
            <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
              <button onClick={() => toggleSection('criteria')} className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Criteria Checklist</h3>
                  <p className="text-xs text-text-muted">Manage your pre-trade confirmation criteria.</p>
                </div>
                {expandedSections.criteria ? <ChevronUp className="h-5 w-5 text-text-muted"/> : <ChevronDown className="h-5 w-5 text-text-muted"/>}
              </button>
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.criteria ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <CardContent className="space-y-3 pt-0 pb-6 px-4 md:px-6">
                  <div className="flex gap-2">
                    <Input placeholder="New criterion..." value={newItemInputs['criteria_list'] || ""} onChange={e => setNewItemInputs(p => ({...p, criteria_list: e.target.value}))} onKeyDown={e => e.key === 'Enter' && handleAddListItem('criteria_list')} className="h-9" />
                    <Button size="sm" onClick={() => handleAddListItem('criteria_list')}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {settings?.criteria_list?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center gap-2 p-2 bg-background-secondary rounded border border-border">
                        {editingItem?.listName === 'criteria_list' && editingItem?.id === item.id ? (
                          <div className="flex-1 flex gap-2">
                            <Input value={editingItem.value} onChange={e => setEditingItem(prev => prev ? { ...prev, value: e.target.value } : null)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit('criteria_list')} className="h-8 text-sm" autoFocus />
                            <Button size="sm" variant="secondary" onClick={() => handleSaveEdit('criteria_list')}>Save</Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm truncate flex-1">{item.label}</span>
                            <div className="flex items-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" onClick={() => handleEditListItem('criteria_list', item)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('criteria_list', item.id || "")}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            </Card>

          </TabsContent>

          <TabsContent value="assets" className="space-y-6 pt-4">
            <Card className="border-border/60 shadow-sm bg-background overflow-hidden">
              <button onClick={() => toggleSection('assets')} className="w-full flex justify-between items-center p-4 md:p-6 hover:bg-background-secondary/30 transition-colors">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Traded Assets</h3>
                  <p className="text-xs text-text-muted">Your instrument watchlist. Format: &quot;SYMBOL, Class&quot;</p>
                </div>
                {expandedSections.assets ? <ChevronUp className="h-5 w-5 text-text-muted"/> : <ChevronDown className="h-5 w-5 text-text-muted"/>}
              </button>
              <div className={`transition-all duration-300 ease-in-out ${expandedSections.assets ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <CardContent className="space-y-3 pt-0 pb-6 px-4 md:px-6">
                  <div className="flex gap-2">
                    <Input placeholder="e.g. BTCUSD, Crypto" value={newItemInputs['asset_list'] || ""} onChange={e => setNewItemInputs(p => ({...p, asset_list: e.target.value}))} onKeyDown={e => e.key === 'Enter' && handleAddListItem('asset_list', true)} className="h-9" />
                    <Button size="sm" onClick={() => handleAddListItem('asset_list', true)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                    {settings?.asset_list?.map((item: any) => (
                      <div key={item.symbol} className="flex justify-between items-center gap-2 p-2 bg-background-secondary rounded border border-border">
                        {editingItem?.listName === 'asset_list' && editingItem?.id === item.symbol ? (
                          <div className="flex-1 flex gap-2">
                            <Input value={editingItem.value} onChange={e => setEditingItem(prev => prev ? { ...prev, value: e.target.value } : null)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit('asset_list', true)} className="h-8 text-sm" autoFocus />
                            <Button size="sm" variant="secondary" onClick={() => handleSaveEdit('asset_list', true)}>Save</Button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate flex-1">
                              <span className="text-sm font-bold">{item.symbol}</span>
                              <span className="text-xs text-text-muted ml-2">{item.asset_class}</span>
                            </div>
                            <div className="flex items-center">
                              {item.custom && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" onClick={() => handleEditListItem('asset_list', item, true)}><Pencil className="h-3.5 w-3.5" /></Button>
                              )}
                              {item.custom && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('asset_list', item.symbol || "", true)}><Trash2 className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="pt-4 space-y-6">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Bulk Import Trades (CSV)</CardTitle>
                <CardDescription className="text-xs md:text-sm">Import historical trades from a spreadsheet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-text-muted">To ensure a successful import, please download our standard template. Fill it with your historical trades, then select the file below to upload.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" onClick={() => {
                    const template = "trade_date,trade_time_utc,symbol,direction,entry_price,stop_loss_price,status,net_pnl\n2023-01-15,14:30,XAUUSD,Long,1950.00,1940.00,Closed - Win,500.00";
                    const blob = new Blob([template], { type: "text/csv" });
                    const a = document.createElement("a");
                    a.href = window.URL.createObjectURL(blob);
                    a.download = "wyckoff-journal-template.csv";
                    a.click();
                  }}><Download className="mr-2 h-4 w-4" /> Download Template</Button>
                  
                  <div className="relative">
                    <Input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e) => {
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
                            window.location.href = window.location.pathname;
                          } catch (err: unknown) {
                            toast({ title: "Import Failed", description: (err as Error).message, variant: "destructive" });
                            setIsLoading(false);
                          }
                        }
                      });
                    }} />
                    <Button variant="default" className="w-full sm:w-auto"><UploadCloud className="mr-2 h-4 w-4" /> Upload CSV</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Export Data</CardTitle>
                <CardDescription className="text-xs md:text-sm">Download your entire trading history as a spreadsheet.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportCSV} className="w-full md:w-auto" variant="outline"><Download className="mr-2 h-4 w-4" /> Export All Trades (CSV)</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
