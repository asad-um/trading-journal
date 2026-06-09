const fs = require('fs');

let validations = fs.readFileSync('src/lib/validations/trade.ts', 'utf8');
if (!validations.includes('sl_hit: z.boolean()')) {
    validations = validations.replace(
        'tps_hit: z.array(z.number()).default([]),',
        'tps_hit: z.array(z.number()).default([]),\n  sl_hit: z.boolean().default(false),'
    );
    fs.writeFileSync('src/lib/validations/trade.ts', validations);
}

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The form lacks sl_hit initialization
if (!form.includes('sl_hit: false,')) {
    form = form.replace(
        'tps_hit: [],',
        'tps_hit: [],\n      sl_hit: false,'
    );
}

// Add the watch variable
if (!form.includes('const sl_hit = useWatch')) {
    form = form.replace(
        'const sub_strategy = useWatch({ control: form.control, name: "sub_strategy" });',
        'const sub_strategy = useWatch({ control: form.control, name: "sub_strategy" });\n  const status = useWatch({ control: form.control, name: "status" });\n  const tps_hit = useWatch({ control: form.control, name: "tps_hit" });\n  const sl_hit = useWatch({ control: form.control, name: "sl_hit" });'
    );
}

// Update the calculateGrossPnL logic
// Old: const gross_pnl = calculateGrossPnL(..., riskAmount, data.tps_hit, data.status.includes('Loss'));
// New: const gross_pnl = calculateGrossPnL(..., riskAmount, data.tps_hit, data.sl_hit);
form = form.replace(
    /calculateGrossPnL\([^,]+, riskAmount, data\.tps_hit, data\.status\.includes\('Loss'\)\)/g,
    "calculateGrossPnL(data.tp_levels.map(t => ({ rr: t.rr, positionPercent: t.position_percent })), riskAmount, data.tps_hit, data.sl_hit)"
);

// Inject the Execution UI right after the Status select field
const oldStatusField = `              </FormItem>
            )} />
          </CardContent>
        </Card>`;

const newExecutionUI = `              </FormItem>
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
                            const current = form.getValues('tps_hit') || [];
                            if (current.includes(tp.level)) {
                              form.setValue('tps_hit', current.filter((l: number) => l !== tp.level), { shouldDirty: true, shouldValidate: true });
                            } else {
                              form.setValue('tps_hit', [...current, tp.level].sort(), { shouldDirty: true, shouldValidate: true });
                            }
                          }}
                          className={\`px-4 py-2 border rounded-md cursor-pointer transition-all font-medium text-sm shadow-sm \${tps_hit?.includes(tp.level) ? 'bg-win text-white border-win ring-2 ring-win/30 scale-105' : 'bg-background hover:bg-background-tertiary border-border text-text-muted'}\`}
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
        </Card>`;

form = form.replace(oldStatusField, newExecutionUI);

fs.writeFileSync('src/components/trades/trade-form.tsx', form);
