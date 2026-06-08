const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Fix Direction Buttons
const brokenDirection = `<FormField control={form.control} name="direction" render={() => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Direction</FormLabel>
                    <div className="flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => form.setValue('direction', 'Long', { shouldValidate: true, shouldDirty: true })}
                        className={\`flex-1 py-2.5 rounded border font-semibold text-sm transition-colors \\\${direction === 'Long' ? 'bg-win/10 border-win/50 text-win' : 'bg-transparent border-border text-text-muted hover:border-text-muted'}\`}
                      >
                        LONG
                      </button>
                      <button 
                        type="button" 
                        onClick={() => form.setValue('direction', 'Short', { shouldValidate: true, shouldDirty: true })}
                        className={\`flex-1 py-2.5 rounded border font-semibold text-sm transition-colors \\\${direction === 'Short' ? 'bg-loss/10 border-loss/50 text-loss' : 'bg-transparent border-border text-text-muted hover:border-text-muted'}\`}
                      >
                        SHORT
                      </button>
                    </div>
                  </FormItem>
                )} />`;

const fixedDirection = `<FormField control={form.control} name="direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-muted text-xs uppercase tracking-wide">Market Direction</FormLabel>
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

content = content.replace(brokenDirection, fixedDirection);
fs.writeFileSync('src/components/trades/trade-form.tsx', content);

