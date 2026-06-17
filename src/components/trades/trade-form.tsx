/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, TradeFormValues } from "@/lib/validations/trade";
import { supabase } from "@/lib/supabase";
import { calculateRR, calculateWeightedRR, calculateRiskAmount, calculateGrossPnL, detectSession, validateTPSplits } from "@/lib/calculations";
import { normalizeStrategiesList, DEFAULT_CRITERIA_BY_STRATEGY } from "@/lib/defaults";
import { onTradeLogged } from "@/lib/gamification";
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
import DOMPurify from "dompurify";

export function TradeForm({ initialData }: { initialData?: Partial<TradeFormValues> & { id?: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: initialData ? {
      ...initialData,
      tp_levels: typeof initialData.tp_levels === 'string' ? JSON.parse(initialData.tp_levels) : (initialData.tp_levels || []),
      criteria_checked: typeof initialData.criteria_checked === 'string' ? JSON.parse(initialData.criteria_checked) : (initialData.criteria_checked || []),
      tps_hit: typeof initialData.tps_hit === 'string' ? JSON.parse(initialData.tps_hit) : (initialData.tps_hit || []),
      pre_trade_images: typeof initialData.pre_trade_images === 'string' ? JSON.parse(initialData.pre_trade_images) : (initialData.pre_trade_images || []),
      post_trade_images: typeof initialData.post_trade_images === 'string' ? JSON.parse(initialData.post_trade_images) : (initialData.post_trade_images || []),
      sl_hit: !!initialData.sl_hit
    } : {
      trade_date: format(new Date(), "yyyy-MM-dd"),
      trade_time_utc: "14:30",
      highest_timeframe: "Daily",
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
      status: "Open",
      criteria_checked: [],
      tps_hit: [],
      sl_hit: false,
      market_regime: "Trending",
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

  const allImagesCount = (pre_trade_images?.length || 0) + (post_trade_images?.length || 0);
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
        appendTP({ level: i + 1, price: 0, position_percent: 0, rr: 0, potential_pnl: 0, hit: false }, { shouldFocus: false });
      }
    } else if (num < current.length) {
      for (let i = current.length - 1; i >= num; i--) {
        removeTP(i);
      }
    }
  };

  const presets = useMemo(() => {
    const list = normalizeStrategiesList(settings?.strategies_list);
    const result: Record<string, string[]> = {};
    list.forEach(s => {
      result[s.name] = s.playbooks.map(p => p.name);
    });
    return result;
  }, [settings?.strategies_list]);

  const applyStrategyCriteria = () => {
    if (!strategy) return;

    const existing = form.getValues("criteria_checked") || [];
    const strategyCriteria = DEFAULT_CRITERIA_BY_STRATEGY[strategy] || [];
    const merged = strategyCriteria.map((label: string, idx: number) => {
      const id = `${strategy.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx + 1}`;
      const prev = existing.find((item: { id: string }) => item.id === id);
      return { id, label, checked: prev?.checked ?? false };
    });

    replaceCriteria(merged);
    toast({ title: "Criteria Synced", description: `Loaded ${merged.length} ${strategy} validation criteria.` });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pre' | 'post') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Global max 3 images across both sections
    if (allImagesCount >= 3) {
      toast({ title: "Upload Limit Reached", description: "You can upload a maximum of 3 images per trade.", variant: "destructive" });
      return;
    }

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

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Secure signed upload only — no unsigned fallback
      const signRes = await fetch('/api/sign-cloudinary');
      const signData = await signRes.json();

      if (!signRes.ok || !signData.signature) {
        throw new Error("Secure upload unavailable. Please check server configuration.");
      }

      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '');
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      const defaultCaption = type === 'pre' ? 'Pre-Trade' : 'Post-Trade';
      const newImage = { url: data.secure_url, public_id: data.public_id, caption: defaultCaption };
      const fieldName = type === 'pre' ? 'pre_trade_images' : 'post_trade_images';
      const currentImages = form.getValues(fieldName) || [];
      
      form.setValue(fieldName, [...currentImages, newImage]);
      toast({ title: "Image Uploaded", description: `Screenshot added (${allImagesCount + 1}/3).` });
    } catch (error: unknown) {
      toast({ title: "Upload Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUploading(false);
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
        toast({ title: "Image Cleanup Warning", description: e.message || "Failed to delete image from Cloudinary.", variant: "default" });
      }
    }
  };

  const updateImageCaption = (type: 'pre' | 'post', index: number, caption: string) => {
    const fieldName = type === 'pre' ? 'pre_trade_images' : 'post_trade_images';
    const currentImages = form.getValues(fieldName) || [];
    const newImages = [...currentImages];
    if (newImages[index]) {
      newImages[index] = { ...newImages[index], caption };
      form.setValue(fieldName, newImages, { shouldDirty: true });
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

      const sessionDetected = detectSession(data.trade_time_utc || "14:30", settings?.sessions_list || []);

      const net_pnl = calculateGrossPnL(data.tp_levels.map((t: any) => ({ rr: t.rr, positionPercent: t.position_percent })), riskAmount, Array.isArray(data.tps_hit) ? data.tps_hit : [], !!data.sl_hit);
      const actual_rr_achieved = riskAmount ? (net_pnl / riskAmount) : 0;
      const weighted_avg_rr_planned = calculateWeightedRR(data.tp_levels.map(t => ({ rr: t.rr, positionPercent: t.position_percent })));

      const tradeData = {
        ...data,
        user_id: user.id,
        portfolio_id: activePort.id,
        session: sessionDetected,
        risk_amount_usd: riskAmount,
        gross_pnl: net_pnl,
        net_pnl,
        actual_rr_achieved,
        weighted_avg_rr_planned,
        pre_trade_reasoning: data.pre_trade_reasoning ? DOMPurify.sanitize(data.pre_trade_reasoning) : undefined,
        post_trade_lesson: data.post_trade_lesson ? DOMPurify.sanitize(data.post_trade_lesson) : undefined
      };

      if (initialData?.id) {
        const { error } = await supabase.from('trades').update(tradeData).eq('id', initialData.id);
        if (error) throw error;
        toast({ title: "Success", description: "Trade updated successfully." });
      } else {
        const { data: inserted, error } = await supabase.from('trades').insert(tradeData).select().single();
        if (error) throw error;
        localStorage.removeItem('trade_draft'); // Clean draft
        toast({ title: "Success", description: "Trade logged successfully." });
        // Gamification update (fire-and-forget)
        if (inserted) onTradeLogged(user.id, inserted as any).then(update => {
          if (update?.levelUp) {
            toast({ title: "Level Up!", description: `You reached ${update.levelUp.new}!` });
          }
          if (update?.newBadges.length) {
            toast({ title: "Badge Earned!", description: `${update.newBadges.length} new badge(s) unlocked.` });
          }
        }).catch(console.error);
      }
      
      router.push('/trades');
    } catch (error: unknown) {
      const err = error as Error;
      console.error("SMART DEBUG [Form Submit]:", err);
      toast({ 
        title: "Submission Error", 
        description: `${err.message}. Check browser console for full stack trace.`, 
        variant: "destructive",
        duration: 10000 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart Status Sync: Auto-update status when TP/SL checkboxes change
  useEffect(() => {
    const currentTpsHit = Array.isArray(tps_hit) ? tps_hit : [];
    const currentSlHit = !!sl_hit;
    const currentStatus = status;
    const totalTps = tpFields.length;

    // If SL is hit, status must be Closed - Loss and clear TPs
    if (currentSlHit && currentStatus !== 'Closed - Loss') {
      form.setValue('status', 'Closed - Loss', { shouldDirty: true });
      if (currentTpsHit.length > 0) {
        form.setValue('tps_hit', [], { shouldDirty: true });
      }
      return;
    }

    // If TPs are hit, determine if Partial or Closed - Win
    if (currentTpsHit.length > 0 && !currentSlHit) {
      const maxTpHit = Math.max(...currentTpsHit);
      if (maxTpHit >= totalTps && currentStatus !== 'Closed - Win') {
        form.setValue('status', 'Closed - Win', { shouldDirty: true });
      } else if (maxTpHit < totalTps && currentStatus === 'Open') {
        form.setValue('status', 'Partial', { shouldDirty: true });
      }
      return;
    }

    // If no TPs hit and no SL hit, but status is Closed - Loss/Win, revert to Open
    if (currentTpsHit.length === 0 && !currentSlHit && 
        (currentStatus === 'Closed - Loss' || currentStatus === 'Closed - Win')) {
      form.setValue('status', 'Open', { shouldDirty: true });
    }
  }, [tps_hit, sl_hit, status, tpFields.length, form]);

  // Sync checkboxes when status is manually changed
  useEffect(() => {
    const currentStatus = status;
    const currentSlHit = !!sl_hit;
    const currentTpsHit = Array.isArray(tps_hit) ? tps_hit : [];

    if (currentStatus === 'Closed - Loss') {
      if (!currentSlHit) form.setValue('sl_hit', true, { shouldDirty: true });
      if (currentTpsHit.length > 0) form.setValue('tps_hit', [], { shouldDirty: true });
    } else if (currentStatus === 'Closed - Win' || currentStatus === 'Partial') {
      if (currentSlHit) form.setValue('sl_hit', false, { shouldDirty: true });
    } else if (currentStatus === 'Open' || currentStatus === 'Breakeven' || currentStatus === 'Cancelled') {
      if (currentSlHit) form.setValue('sl_hit', false, { shouldDirty: true });
      if (currentTpsHit.length > 0) form.setValue('tps_hit', [], { shouldDirty: true });
    }
  }, [status, sl_hit, tps_hit, form]);

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.error(errors);
        const errorMessages = Object.keys(errors).map(key => `${key}: ${errors[key as keyof typeof errors]?.message}`).join(', ');
      console.error("SMART DEBUG [Validation]:", errors);
      toast({ 
        title: "Validation Failed", 
        description: errorMessages || "Please check all fields.", 
        variant: "destructive",
        duration: 10000
      });
      })} className="space-y-6 pb-20 max-w-4xl mx-auto w-full overflow-x-hidden p-1">
        
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

            {/* Timeframe Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <FormField control={form.control} name="highest_timeframe" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-muted text-xs uppercase tracking-wide">HTF Bias</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select HTF" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="4H">4H</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="analysis_timeframe" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Analysis TF</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Analysis TF" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="4H">4H</SelectItem>
                      <SelectItem value="2H">2H</SelectItem>
                      <SelectItem value="1H">1H</SelectItem>
                      <SelectItem value="30M">30M</SelectItem>
                      <SelectItem value="15M">15M</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              
              <FormField control={form.control} name="entry_timeframe" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Entry TF</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Entry TF" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="15M">15M</SelectItem>
                      <SelectItem value="5M">5M</SelectItem>
                      <SelectItem value="1M">1M</SelectItem>
                      <SelectItem value="30S">30S</SelectItem>
                      <SelectItem value="15S">15S</SelectItem>
                      <SelectItem value="5S">5S</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
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
                      {(presets[strategy || ""] || []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="market_regime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Regime</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "Trending"}>
                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Select Regime" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Trending">Trending</SelectItem>
                      <SelectItem value="Choppy/Range">Choppy / Range</SelectItem>
                      <SelectItem value="News-Driven">News-Driven</SelectItem>
                      <SelectItem value="Breakout">Breakout</SelectItem>
                      <SelectItem value="Reversal">Reversal</SelectItem>
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
                    <Button type="button" variant="secondary" size="sm" onClick={applyStrategyCriteria} disabled={!strategy || !sub_strategy || sub_strategy === 'Other'}>
                      <Zap className="h-3 w-3 mr-2 text-accent" /> Auto-fill {sub_strategy || 'Criteria'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {criteriaFields.map((field, index) => (
                      <div key={field.id} className="flex items-center space-x-2 bg-background p-2.5 rounded-md border border-border/50">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          {...form.register(`criteria_checked.${index}.checked` as any)}
                        />
                        <span className="text-sm">{form.getValues(`criteria_checked.${index}.label` as any)}</span>
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
            <p className="text-xs text-text-muted">Upload up to 3 images total. Each image must be labeled Pre-Trade or Post-Trade.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-3 bg-background-secondary rounded-lg border border-border">
              <div className="text-sm">
                <span className="font-medium">{allImagesCount}</span>
                <span className="text-text-muted"> / 3 images uploaded</span>
              </div>
              {allImagesCount < 3 && (
                <div className="flex gap-2">
                  <div className="relative">
                    <Input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'pre')} disabled={isUploading} />
                    <Button type="button" variant="outline" size="sm" disabled={isUploading} className="h-8">
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <UploadCloud className="h-3 w-3 mr-2" />}
                      Add Image
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {(pre_trade_images?.length > 0 || post_trade_images?.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pre_trade_images?.map((img: { url: string; caption?: string }, idx: number) => (
                  <div key={`pre-${idx}`} className="space-y-2">
                    <div className="relative group rounded-md overflow-hidden border border-border aspect-video bg-background-tertiary">
                      <img src={img.url} alt={img.caption || "Trade image"} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx, 'pre')} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-loss">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Select value={img.caption || "Pre-Trade"} onValueChange={(val) => updateImageCaption('pre', idx, val)}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Image label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-Trade">Pre-Trade</SelectItem>
                        <SelectItem value="Post-Trade">Post-Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {post_trade_images?.map((img: { url: string; caption?: string }, idx: number) => (
                  <div key={`post-${idx}`} className="space-y-2">
                    <div className="relative group rounded-md overflow-hidden border border-border aspect-video bg-background-tertiary">
                      <img src={img.url} alt={img.caption || "Trade image"} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx, 'post')} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-loss">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Select value={img.caption || "Post-Trade"} onValueChange={(val) => updateImageCaption('post', idx, val)}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Image label" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-Trade">Pre-Trade</SelectItem>
                        <SelectItem value="Post-Trade">Post-Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
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
                <Select onValueChange={field.onChange} value={field.value}>
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
                    <div className="flex flex-col gap-3">
                      {tpFields.map((field, index) => {
                        const level = index + 1;
                        return (
                          <div key={field.id} className="flex items-center space-x-3 bg-background-secondary p-3 rounded-md border border-border/50">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-gray-300 text-win focus:ring-win"
                              checked={(Array.isArray(tps_hit) ? tps_hit : []).includes(level)}
                              onChange={(e) => {
                                const current = Array.isArray(form.getValues('tps_hit')) ? form.getValues('tps_hit') : [];
                                if (e.target.checked) {
                                  const newHits = Array.from({length: level}, (_, i) => i + 1);
                                  form.setValue('tps_hit', newHits, { shouldDirty: true, shouldValidate: true });
                                } else {
                                  form.setValue('tps_hit', current.filter((l: number) => l < level), { shouldDirty: true, shouldValidate: true });
                                }
                              }}
                            />
                            <span className="text-sm font-medium">TP {level}</span>
                          </div>
                        );
                      })}
                      {tpFields.length === 0 && <span className="text-sm text-text-muted italic">No TP levels set.</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-background-secondary rounded-lg border border-border shadow-sm">
                    <FormField control={form.control} name="sl_hit" render={({ field }) => (
                      <FormItem className="flex items-center space-y-0 space-x-3">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            className="h-5 w-5 rounded border-border bg-background text-loss focus:ring-loss focus:ring-offset-background cursor-pointer" 
                            checked={!!field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-semibold text-foreground">Stop Loss Hit?</FormLabel>
                          <p className="text-xs text-text-muted">Check this if the trade stopped out.</p>
                        </div>
                      </FormItem>
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
