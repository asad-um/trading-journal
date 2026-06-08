const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Fix 1: Long/Short Buttons binding
const oldDirectionBlock = `<FormField control={form.control} name="direction" render={() => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-text-secondary uppercase tracking-wider text-xs font-bold">Market Direction</FormLabel>
                    <div className="flex gap-3 bg-background p-1.5 rounded-lg border border-border/60">
                      <button 
                        type="button" 
                        onClick={() => form.setValue('direction', 'Long')}
                        className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${direction === 'Long' ? 'bg-win text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 11.9-12.2"/><path d="M17 3h4v4"/><path d="M21 3l-6.1 6.1"/></svg>
                        LONG
                      </button>
                      <button 
                        type="button" 
                        onClick={() => form.setValue('direction', 'Short')}
                        className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${direction === 'Short' ? 'bg-loss text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 11.9 12.2"/><path d="M17 21h4v-4"/><path d="M21 21l-6.1-6.1"/></svg>
                        SHORT
                      </button>
                    </div>
                  </FormItem>
                )} />`;

const newDirectionBlock = `<FormField control={form.control} name="direction" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-text-secondary uppercase tracking-wider text-xs font-bold">Market Direction</FormLabel>
                    <div className="flex gap-3 bg-background p-1.5 rounded-lg border border-border/60">
                      <button 
                        type="button" 
                        onClick={() => field.onChange('Long')}
                        className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${field.value === 'Long' ? 'bg-win text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 11.9-12.2"/><path d="M17 3h4v4"/><path d="M21 3l-6.1 6.1"/></svg>
                        LONG
                      </button>
                      <button 
                        type="button" 
                        onClick={() => field.onChange('Short')}
                        className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${field.value === 'Short' ? 'bg-loss text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 11.9 12.2"/><path d="M17 21h4v-4"/><path d="M21 21l-6.1-6.1"/></svg>
                        SHORT
                      </button>
                    </div>
                  </FormItem>
                )} />`;

content = content.replace(oldDirectionBlock, newDirectionBlock);

// Fix 2: Add TP Auto Fix button logic
const autoFixCode = `
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
`;

content = content.replace('const handleNumTpChange = (num: number) => {', autoFixCode + '\n  const handleNumTpChange = (num: number) => {');

// Inject the Smart Fix button into the UI
const oldTpHeader = `<span className="text-sm font-medium">Take Profit Targets</span>`;
const newTpHeader = `<div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Take Profit Targets</span>
                  <button type="button" onClick={smartFixTPs} className="text-[10px] text-accent hover:underline text-left">Auto-Fix & Balance Levels</button>
                </div>`;
content = content.replace(oldTpHeader, newTpHeader);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

