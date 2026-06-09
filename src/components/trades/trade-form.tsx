/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, TradeFormValues } from "@/lib/validations/trade";
import { supabase } from "@/lib/supabase";
import { calculateRR, calculateWeightedRR, calculateRiskAmount, calculateGrossPnL, calculateNetPnL, detectSession, validateTPSplits } from "@/lib/calculations";
import { UserSettings, Profile } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle,  } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, X, Zap, CheckCircle2,  } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePrivacy } from "@/components/privacy-provider";

const GLOBAL_CRITERIA = ["Volume Confluence", "Seek and Destroy", "Divergence", "Leader-Lagger Reference", "Volatility"];

export function TradeForm({ initialData }: { initialData?: Partial<TradeFormValues> & { id?: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isUploadingPre, setIsUploadingPre] = useState(false);
  const [isUploadingPost, setIsUploadingPost] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: initialData || {
      trade_date: format(new Date(), "yyyy-MM-dd"),
      trade_time_utc: "14:30",
      analysis_timeframe: "1H",
      entry_timeframe: "15M",
      symbol: "",
      asset_class: "Forex",
      direction: "Long",
      strategy: "Wyckoff",
      sub_strategy: "Classical Strategy",
      schematic: "Accumulation",
      entry_event: "",
      num_tp_levels: 1,
      tp_levels: [{ level: 1, price: 0, position_percent: 100, rr: 0, potential_pnl: 0, hit: false }],
      risk_percentage: 0.5,
      fee_amount: 0,
      fee_in_pips: false,
      status: "Open",
      criteria_checked: [],
      tps_hit: [],
      sl_hit: false,
      pre_trade_images: [],
      post_trade_images: []
    }
  });

  const { fields: tpFields, append: appendTP, remove: removeTP } = useFieldArray({
    control: form.control,
    name: "tp_levels"
  });
  
  const { fields: criteriaFields, replace: replaceCriteria } = useFieldArray({
    control: form.control,
    name: "criteria_checked"
  });

  // Granular watching to heavily optimize performance
  const risk_percentage = useWatch({ control: form.control, name: "risk_percentage" });
  const entry_price = useWatch({ control: form.control, name: "entry_price" });
  const stop_loss_price = useWatch({ control: form.control, name: "stop_loss_price" });
  const direction = useWatch({ control: form.control, name: "direction" });
  const num_tp_levels = useWatch({ control: form.control, name: "num_tp_levels" });
  const tp_levels = useWatch({ control: form.control, name: "tp_levels" });
  const pre_trade_images = useWatch({ control: form.control, name: "pre_trade_images" });
  const post_trade_images = useWatch({ control: form.control, name: "post_trade_images" });
  const strategy = useWatch({ control: form.control, name: "strategy" });
  const sub_strategy = useWatch({ control: form.control, name: "sub_strategy" });
  const status = useWatch({ control: form.control, name: "status" });
  const tps_hit = useWatch({ control: form.control, name: "tps_hit" });
  const sl_hit = useWatch({ control: form.control, name: "sl_hit" });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      
      const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];
      
      if (!activePort) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const [profRes, setRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ]);
      
      if (profRes.data) {
        // We override the profile balance with the active portfolio balance so the Risk Calculator uses the right money!
        setProfile({ ...profRes.data, current_balance: activePort.current_balance, starting_balance: activePort.starting_balance });
        if (!initialData) form.setValue('risk_percentage', profRes.data.default_risk_percentage);
      }
      
      if (setRes.data) {
        setSettings(setRes.data);
        
        // Auto-load draft if exists and no initial data passed (meaning we are on 'New Trade' page)
        if (!initialData) {
          const draft = localStorage.getItem('trade_draft');
          if (draft) {
            try {
              const parsed = JSON.parse(draft);
              // Only load draft if it's less than 24 hours old
              if (parsed._timestamp && (Date.now() - parsed._timestamp) < 86400000) {
                delete parsed._timestamp;
                form.reset(parsed);
                toast({ title: "Draft Restored", description: "Your unsaved trade progress has been restored." });
              }
            } catch {}
          } else if (setRes.data.criteria_list) {
            form.setValue('criteria_checked', setRes.data.criteria_list.map((c: { id: string, label: string }) => ({
              id: c.id,
              label: c.label,
              checked: false
            })));
          }
        }
      }
      setIsLoading(false);
    }
    init();
  }, [form, initialData, toast]);

  // Auto-save draft on form change with a strict debounce to prevent UI lag
  useEffect(() => {
    if (initialData?.id || isLoading) return;
    
    let timeoutId: NodeJS.Timeout;
    const subscription = form.watch((value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const draft = { ...value, _timestamp: Date.now() };
        localStorage.setItem('trade_draft', JSON.stringify(draft));
      }, 1000); // 1-second debounce prevents lag on typing
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [form, initialData, isLoading]);

  
  const smartFixTPs = () => {
    const entry = Number(form.getValues('entry_price') || 0);
    const sl = Number(form.getValues('stop_loss_price') || 0);
    const dir = form.getValues('direction');
    const tps = form.getValues('tp_levels') || [];
    
    if (entry === 0 || sl === 0) {
      toast({ title: "Missing Data", description: "Set Entry and Stop Loss prices first.", variant: "destructive" });
      return;
    }
    
    const risk = Math.abs(entry - sl);
    if (risk === 0) {
      toast({ title: "Invalid Risk", description: "Entry and Stop Loss cannot be identical.", variant: "destructive" });
      return;
    }

    const newTps = tps.map((tp, idx) => {
      let price = Number(tp.price || 0);
      const isInvalidLong = dir === 'Long' && price <= entry;
      const isInvalidShort = dir === 'Short' && price >= entry;
      
      if (price === 0 || isInvalidLong || isInvalidShort) {
        // Auto calculate a realistic target based on 1:X RR 
        const targetRR = idx + 1; // TP1 = 1R, TP2 = 2R, etc.
        price = dir === 'Long' ? entry + (risk * targetRR) : entry - (risk * targetRR);
      }
      
      const percent = Math.floor(100 / tps.length);
      return { ...tp, price: Number(price.toFixed(5)), position_percent: percent };
    });

    if (newTps.length > 0) {
      const sum = newTps.reduce((acc, curr) => acc + curr.position_percent, 0);
      newTps[newTps.length - 1].position_percent += (100 - sum); // make sure it equals 100%
    }
    
    form.setValue('tp_levels', newTps, { shouldValidate: true, shouldDirty: true });
    toast({ title: "Targets Optimized", description: "Auto-corrected TP prices and balanced percentages." });
  };

  const handleNumTpChange = (num: number) => {
    form.setValue("num_tp_levels", num);
    const current = form.getValues("tp_levels");
    if (num > current.length) {
      for (let i = current.length; i < num; i++) {
        appendTP({ level: i + 1, price: 0, position_percent: 0, rr: 0, potential_pnl: 0, hit: false });
      }
    } else if (num < current.length) {
      for (let i = current.length - 1; i >= num; i--) {
        removeTP(i);
      }
    }
  };

  const getDynamicPresets = useCallback(() => {
    // Dynamic fallback structure. If user sets up custom stuff in settings, we can read it, but this is the robust core.
    
    
    // We maintain the hardcoded ones as a base overlay
    const base: Record<string, Record<string, string[]>> = {
      "Wyckoff": {
        "Blue Box Strategy": ["NYSE Session Action", "Read Initial 5-10m Reaction", "Micro Accum/Dist", "Quick 1:5 RR Target"],
        "Spring/UTAD Strategy": ["Spring/UTAD Formed", "Volume Absorption", "BOOF (Break of Orderflow)", "Micro Schematic Mitigation", "Fib 50%-80% Retracement"],
        "Classical Strategy": ["HTF Schematic (1H/15m/5m)", "HTF POI Mitigation", "In-line with Supply/Demand", "Micro Accum/Re-accum Entry", "Fib 50%-80% Retracement"]
      },
      "SMC (Smart Money)": {
        "ChoCh Entry": ["HTF POI Mitigation", "Change of Character (ChoCh)", "Order Block (OB) Formation", "Return to OB"],
        "Continuation": ["Break of Structure (BOS)", "Fair Value Gap (FVG)", "Displacement"]
      },
      "ICT": {
        "Silver Bullet": ["Specific Time Window (10AM/2PM/3AM)", "FVG Formation", "Clear Draw on Liquidity"],
        "2022 Model": ["Liquidity Sweep (Buyside/Sellside)", "Market Structure Shift (MSS)", "FVG Entry"]
      }
    };
    
    // Merge any custom DB strategies if we wanted to build that feature out further, but for now we supply the requested ones strictly.
    return base;
  }, []);

  const applyStrategyCriteria = () => {
    if (!strategy || !sub_strategy) return;
    
    const presets = getDynamicPresets();
    const specificCriteria = presets[strategy || ""]?.[sub_strategy] || [];
    const newCriteria = [...specificCriteria, ...GLOBAL_CRITERIA].map((label, idx) => ({
      id: `auto-${idx}`,
      label,
      checked: true
    }));
    
    replaceCriteria(newCriteria);
    toast({ title: "Criteria Autofilled", description: `Applied checklist for ${sub_strategy}` });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pre' | 'post') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict Client-Side File Validation
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Only image files (PNG, JPG, WebP) are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
      toast({ title: "File Too Large", description: "Images must be under 5MB to conserve storage.", variant: "destructive" });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!cloudName) {
      toast({ title: "Upload Failed", description: "Cloudinary Cloud Name missing from .env.local", variant: "destructive" });
      return;
    }

    if (type === 'pre') { setIsUploadingPre(true); } else { setIsUploadingPost(true); }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // We attempt a secure signed upload first via our Next.js API route
      // If the user hasn't set up the API Secret, we gracefully fallback to the unsigned preset.
      const signRes = await fetch('/api/sign-cloudinary');
      const signData = await signRes.json();

      if (signRes.ok && signData.signature) {
        formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '');
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
      } else {
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!uploadPreset) throw new Error("Missing both Secure API signature and Unsigned Upload Preset");
        formData.append('upload_preset', uploadPreset);
      }

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      const newImage = { url: data.secure_url, public_id: data.public_id, caption: '' };
      const currentImages = form.getValues(type === 'pre' ? 'pre_trade_images' : 'post_trade_images') || [];
      
      form.setValue(type === 'pre' ? 'pre_trade_images' : 'post_trade_images', [...currentImages, newImage]);
      toast({ title: "Image Uploaded", description: "Screenshot added successfully." });
    } catch (error: unknown) {
      toast({ title: "Upload Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      if (type === 'pre') { setIsUploadingPre(false); } else { setIsUploadingPost(false); }
    }
  };

  const removeImage = async (index: number, type: 'pre' | 'post') => {
    const fieldName = type === 'pre' ? 'pre_trade_images' : 'post_trade_images';
    const currentImages = form.getValues(fieldName) || [];
    const imageToDelete = currentImages[index];
    
    // Optimistically update the UI instantly
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue(fieldName, newImages, { shouldDirty: true });

    // Send garbage collection request to backend to physically destroy the Cloudinary file
    if (imageToDelete && imageToDelete.public_id) {
      try {
        const res = await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: imageToDelete.public_id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } catch (e: any) {
        console.error("Garbage collection failed:", e);
        toast({ title: "Image Cleanup Warning", description: e.message || "Failed to delete image from Cloudinary.", variant: "warning" });
      }
    }
  };

  const onSubmit = async (data: TradeFormValues) => {
    setIsSubmitting(true);
    try {
      const tpSplitVal = validateTPSplits(data.tp_levels.map((tp: { position_percent: number }) => ({ positionPercent: tp.position_percent })));
      if (!tpSplitVal.valid && data.tp_levels.length > 0) {
        toast({ title: "Validation Error", description: `TP position allocations must sum to exactly 100%. Currently: ${tpSplitVal.total}%`, variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const riskAmount = profile ? calculateRiskAmount(profile.current_balance, data.risk_percentage) : 0;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: activePorts } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];
      if (!activePort) throw new Error("No active account selected. Please select one in the sidebar.");

      const sessionDetected = detectSession(data.trade_time_utc || "14:30");

      const gross_pnl = calculateGrossPnL(data.tp_levels.map(t => ({ rr: t.rr, positionPercent: t.position_percent })), riskAmount, data.tps_hit, data.status.includes('Loss'));
      const net_pnl = calculateNetPnL(gross_pnl, data.fee_amount, data.fee_in_pips, data.pip_value);
      const actual_rr_achieved = riskAmount ? (net_pnl / riskAmount) : 0;
      const weighted_avg_rr_planned = calculateWeightedRR(data.tp_levels.map(t => ({ rr: t.rr, positionPercent: t.position_percent })));

      const tradeData = {
        ...data,
        user_id: user.id,
        portfolio_id: (await supabase.from("portfolios").select("id").eq("user_id", user.id).eq("is_active", true).single()).data?.id,
        session: sessionDetected,
        risk_amount_usd: riskAmount,
        gross_pnl,
        net_pnl,
        actual_rr_achieved,
        weighted_avg_rr_planned
      };

      if (initialData?.id) {
        const { error } = await supabase.from('trades').update(tradeData).eq('id', initialData.id);
        if (error) throw error;
        toast({ title: "Success", description: "Trade updated successfully." });
      } else {
        const { error } = await supabase.from('trades').insert(tradeData);
        if (error) throw error;
        localStorage.removeItem('trade_draft'); // Clean draft
        toast({ title: "Success", description: "Trade logged successfully." });
      }
      
      router.push('/trades');
    } catch (error: unknown) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-text-muted">Loading framework...</p>
      </div>
    );
  }

  if (!profile || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <h2 className="text-2xl font-bold text-loss">No Active Account</h2>
        <p className="text-text-muted max-w-md">
          You do not currently have an active trading account. You cannot log a trade without selecting a portfolio first.
        </p>
        <Button variant="outline" onClick={() => router.push('/account')}>Go to Account Manager</Button>
      </div>
    );
  }

  const riskAmtCalculated = calculateRiskAmount(profile.current_balance, risk_percentage || 0);
  const presets = getDynamicPresets();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20 max-w-4xl mx-auto">
        
        {/* Section 1: Core Setup */}
        <Card className="border-border/50 shadow-sm overflow-hidden bg-background">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-sm">1</span> 
              Core Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              <div className="md:col-span-7 space-y-6">
                <FormField control={form.control} name="symbol" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Traded Asset</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      const ast = settings.asset_list.find(a => a.symbol === val);
                      if (ast) form.setValue('asset_class', ast.asset_class);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-base font-semibold">
                          <SelectValue placeholder="Select an Asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px]">
                        {settings.asset_list.map(a => (
                          <SelectItem key={a.symbol} value={a.symbol} className="font-semibold py-2 cursor-pointer">
                            {a.symbol} <span className="text-xs font-normal text-text-muted ml-2">{a.asset_class}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Market Direction</FormLabel>
                    <div className="flex gap-3 bg-background p-1.5 rounded-lg border border-border/60">
                      <button 
                        type="button" 
                        onClick={() => field.onChange('Long')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-200 ${direction === 'Long' ? 'bg-win/10 text-win border-win ring-1 ring-win/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-background-tertiary text-text-muted border-transparent hover:bg-background-tertiary/80 hover:text-text'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 11.9-12.2"/><path d="M17 3h4v4"/><path d="M21 3l-6.1 6.1"/></svg>
                        LONG
                      </button>
                      <button 
                        type="button" 
                        onClick={() => field.onChange('Short')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-200 ${direction === 'Short' ? 'bg-loss/10 text-loss border-loss ring-1 ring-loss/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-background-tertiary text-text-muted border-transparent hover:bg-background-tertiary/80 hover:text-text'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 11.9 12.2"/><path d="M17 21h4v-4"/><path d="M21 21l-6.1-6.1"/></svg>
                        SHORT
                      </button>
                    </div>
                  </FormItem>
                )} />
              </div>

              <div className="md:col-span-5 space-y-6">
                <FormField control={form.control} name="trade_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Execution Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="trade_time_utc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Time (UTC)</FormLabel>
                    <FormControl>
                      <Input type="time" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Strategy */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-sm">2</span> 
                Strategy & Setup
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="strategy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Strategy</FormLabel>
                  <Select onValueChange={(val) => { field.onChange(val); form.setValue('sub_strategy', ''); }} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Strategy" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.keys(presets).map(strat => (
                        <SelectItem key={strat} value={strat}>{strat}</SelectItem>
                      ))}
                      <SelectItem value="Custom">Custom Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="sub_strategy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-Strategy / Playbook</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Sub-Strategy" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(presets[strategy || ""] ? Object.keys(presets[strategy || ""]) : []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <Accordion type="single" collapsible className="w-full border border-border rounded-lg bg-background-secondary">
              <AccordionItem value="criteria" className="border-none">
                <AccordionTrigger className="px-4 py-3 hover:no-underline flex justify-between">
                  <span className="font-semibold text-sm">Validation Checklist</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-text-muted">Check off the criteria that validated this trade.</p>
                    <Button type="button" variant="secondary" size="sm" onClick={applyStrategyCriteria} disabled={!presets[strategy || ""]?.[sub_strategy || ""]}>
                      <Zap className="h-3 w-3 mr-2 text-accent" /> Auto-fill {sub_strategy || 'Criteria'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {criteriaFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2 bg-background p-2.5 rounded-md border border-border/50">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          {...form.register(`criteria_checked.${index}.checked` as const)}
                        />
                        <span className="text-sm">{form.getValues(`criteria_checked.${index}.label` as const)}</span>
                      </div>
                    ))}
                    {criteriaFields.length === 0 && (
                      <div className="text-sm text-text-muted col-span-2 py-2">No criteria added. Click auto-fill to load strategy preset.</div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section 3: Screenshots */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-sm">3</span> 
              Trade Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-secondary">Pre-Trade Setups</h3>
                <div className="relative">
                  <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'pre')} disabled={isUploadingPre} />
                  <Button type="button" variant="outline" size="sm" disabled={isUploadingPre} className="h-8">
                    {isUploadingPre ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                    Upload Image
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {pre_trade_images?.map((img: { url: string }, idx: number) => (
                  <div key={idx} className="relative group rounded-md overflow-hidden border border-border">
                    <img src={img.url} alt="Pre-Trade" className="w-full h-20 object-cover" />
                    <button type="button" onClick={() => removeImage(idx, 'pre')} className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-secondary">Post-Trade Results</h3>
                <div className="relative">
                  <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'post')} disabled={isUploadingPost} />
                  <Button type="button" variant="outline" size="sm" disabled={isUploadingPost} className="h-8">
                    {isUploadingPost ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                    Upload Image
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {post_trade_images?.map((img: { url: string }, idx: number) => (
                  <div key={idx} className="relative group rounded-md overflow-hidden border border-border">
                    <img src={img.url} alt="Post-Trade" className="w-full h-20 object-cover" />
                    <button type="button" onClick={() => removeImage(idx, 'post')} className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Trade Levels & Risk */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-sm">4</span> 
              Levels & Risk
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Proj. Max RR:</span>
              <Badge variant="outline" className="text-win bg-win/10">
                1:{(function(){
                  const e = Number(entry_price||0);
                  const sl = Number(stop_loss_price||0);
                  const risk = Math.abs(e-sl);
                  if (risk===0 || !tp_levels?.length) return '0.00';
                  const tps = tp_levels.map((t: { price: number })=>Number(t.price||0)).filter((p: number)=>p>0);
                  if (!tps.length) return '0.00';
                  const maxT = Math.max(...tps);
                  const minT = Math.min(...tps);
                  const rew = direction === 'Long' ? maxT - e : e - minT;
                  return rew > 0 ? (rew/risk).toFixed(2) : '0.00';
                })()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="entry_price" render={({ field }) => (
                <FormItem><FormLabel>Entry Price</FormLabel><FormControl><Input type="text" inputMode="decimal" className="h-10" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="stop_loss_price" render={({ field }) => (
                <FormItem><FormLabel>Stop Loss Price</FormLabel><FormControl><Input type="text" inputMode="decimal" className="h-10" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="risk_percentage" render={({ field }) => (
                <FormItem><FormLabel>Risk Percentage (%)</FormLabel><FormControl><Input type="text" inputMode="decimal" step="0.1" className="h-10" {...field} /></FormControl>
                <FormDescription className="text-primary font-medium text-xs">Risk: {blurMoney(riskAmtCalculated)}</FormDescription></FormItem>
              )} />
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Take Profit Targets</span>
                  <button type="button" onClick={smartFixTPs} className="text-[10px] text-accent hover:underline text-left">Auto-Fix & Balance Levels</button>
                </div>
                <div className="flex gap-1 border border-border rounded-md overflow-hidden">
                  {[1,2,3,4,5].map(n => (
                    <button 
                      key={n} 
                      type="button" 
                      className={`px-3 py-1 text-sm transition-colors ${num_tp_levels === n ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-background-tertiary'}`}
                      onClick={() => handleNumTpChange(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid gap-3">
                {tpFields.map((field, index) => {
                  const entry = Number(entry_price || 0);
                  const sl = Number(stop_loss_price || 0);
                  const tpValue = Number(tp_levels?.[index]?.price || 0);
                  const dir = direction as 'Long'|'Short';
                  const rr = calculateRR(entry, sl, tpValue, dir) || 0;
                  
                  if (rr > 0 && tp_levels?.[index]?.rr !== rr) {
                     form.setValue(`tp_levels.${index}.rr`, rr);
                  }

                  return (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-4 sm:items-end bg-background-secondary p-4 rounded-lg border border-border">
                      <FormField control={form.control} name={`tp_levels.${index}.price`} render={({ field: f }) => (
                        <FormItem className="w-full sm:flex-1"><FormLabel className="text-xs">TP {index+1} Price</FormLabel><FormControl><Input type="text" inputMode="decimal" className="h-9" {...f} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`tp_levels.${index}.position_percent`} render={({ field: f }) => (
                        <FormItem className="w-full sm:w-24"><FormLabel className="text-xs">Close %</FormLabel><FormControl><Input type="text" inputMode="decimal" className="h-9" {...f} /></FormControl></FormItem>
                      )} />
                      <div className="w-full sm:w-24 pb-1.5 flex justify-start sm:justify-end mt-2 sm:mt-0">
                        <span className="text-xs font-mono font-medium text-text-muted">1:{rr.toFixed(2)} R</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Status */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-text-muted/20 text-text-secondary px-2 py-0.5 rounded text-sm">5</span> 
              Trade Outcome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger className="h-12 font-medium"><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Open">Open (Floating)</SelectItem>
                    <SelectItem value="Partial">Partial (Running)</SelectItem>
                    <SelectItem value="Closed - Win">Closed - Win</SelectItem>
                    <SelectItem value="Closed - Loss">Closed - Loss</SelectItem>
                    <SelectItem value="Breakeven">Breakeven</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {(status === 'Partial' || status === 'Closed - Win' || status === 'Closed - Loss') && (
              <div className="mt-6 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Execution Results</h3>
                <div className="space-y-6">
                  
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Which Targets Were Hit?</Label>
                    <div className="flex flex-wrap gap-3">
                      {tpFields.map(tp => (
                        <div 
                          key={tp.id}
                          onClick={() => {
                            const current = Array.isArray(form.getValues('tps_hit')) ? form.getValues('tps_hit') : [];
                            if (current.includes(tp.level)) {
                              form.setValue('tps_hit', current.filter((l: number) => l !== tp.level), { shouldDirty: true, shouldValidate: true });
                            } else {
                              form.setValue('tps_hit', [...current, tp.level].sort(), { shouldDirty: true, shouldValidate: true });
                            }
                          }}
                          className={`px-4 py-2 border rounded-md cursor-pointer transition-all font-medium text-sm shadow-sm ${(Array.isArray(tps_hit) ? tps_hit : []).includes(tp.level) ? 'bg-win text-white border-win ring-2 ring-win/30 scale-105' : 'bg-background hover:bg-background-tertiary border-border text-text-muted'}`}
                        >
                          TP {tp.level}
                        </div>
                      ))}
                      {tpFields.length === 0 && <span className="text-sm text-text-muted italic">No TP levels set.</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg border border-border shadow-sm">
                    <div>
                      <Label htmlFor="sl-hit-toggle" className="text-sm font-semibold text-foreground">Stop Loss Hit?</Label>
                      <p className="text-xs text-text-muted mt-1">Check this if the trade eventually reversed and stopped out.</p>
                    </div>
                    <FormField control={form.control} name="sl_hit" render={({ field }) => (
                      <FormControl>
                        <input 
                          id="sl-hit-toggle" 
                          type="checkbox" 
                          className="h-6 w-6 rounded border-border bg-background text-loss focus:ring-loss focus:ring-offset-background cursor-pointer transition-all" 
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    )} />
                  </div>

                </div>
              </div>
            )}

          </CardContent>
        </Card>

                {/* Section 6: Notes & Review */}
        <Card className="border-border/50 shadow-sm bg-background">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded text-sm">6</span> 
              Trade Notes & Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="pre_trade_reasoning" render={({ field }) => (
              <FormItem>
                <FormLabel>Pre-Trade Reasoning</FormLabel>
                <FormControl>
                  <RichTextEditor value={field.value || ""} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="post_trade_lesson" render={({ field }) => (
              <FormItem>
                <FormLabel>Post-Trade Lesson</FormLabel>
                <FormControl>
                  <RichTextEditor value={field.value || ""} onChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-14 text-base font-bold shadow-lg hover:shadow-xl transition-all" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          {initialData?.id ? "Update Trade Log" : "Log New Trade"}
        </Button>
      </form>
    </Form>
  );
}