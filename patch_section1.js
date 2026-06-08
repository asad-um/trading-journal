const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

const oldSection1 = `{/* Section 1: Timing & Asset */}
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">1. Timing & Asset</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="trade_date" render={({ field }) => (
              <FormItem><FormLabel>Date of Trade</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="trade_time_utc" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex justify-between items-center">
                  <span>Time (UTC)</span>
                  <Badge variant="outline" className={
                    sessionDetected === 'Asia' ? "text-session-asia border-session-asia" :
                    sessionDetected === 'London' ? "text-session-london border-session-london" :
                    sessionDetected === 'NYSE' ? "text-session-nyse border-session-nyse" :
                    sessionDetected === 'London/NYSE Overlap' ? "text-session-overlap border-session-overlap" :
                    "text-session-offhours border-session-offhours"
                  }>{sessionDetected}</Badge>
                </FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="symbol" render={({ field }) => (
              <FormItem>
                <FormLabel>Symbol / Asset</FormLabel>
                <Select onValueChange={(val) => {
                  field.onChange(val);
                  const ast = settings.asset_list.find(a => a.symbol === val);
                  if (ast) form.setValue('asset_class', ast.asset_class);
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select Asset" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {settings.asset_list.map(a => <SelectItem key={a.symbol} value={a.symbol}>{a.symbol}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="direction" render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <div className="flex gap-4">
                  <Button type="button" variant={field.value === 'Long' ? 'default' : 'outline'} className={\`flex-1 shadow-sm transition-all \${field.value === 'Long' ? 'bg-win hover:bg-win/90 text-white scale-105' : 'hover:border-win hover:text-win'}\`} onClick={() => field.onChange('Long')}>LONG</Button>
                  <Button type="button" variant={field.value === 'Short' ? 'default' : 'outline'} className={\`flex-1 shadow-sm transition-all \${field.value === 'Short' ? 'bg-loss hover:bg-loss/90 text-white scale-105' : 'hover:border-loss hover:text-loss'}\`} onClick={() => field.onChange('Short')}>SHORT</Button>
                </div>
              </FormItem>
            )} />
          </CardContent>
        </Card>`;

const newSection1 = `{/* Section 1: Timing & Asset */}
        <Card className="border-none shadow-md bg-gradient-to-br from-background-secondary to-background border-border overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-accent"></div>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-md text-sm">1</span> 
              Core Setup
            </CardTitle>
            <CardDescription>When and what did you trade?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Asset & Direction (Most prominent) */}
              <div className="md:col-span-7 space-y-6 p-5 bg-background/50 rounded-xl border border-border/50 shadow-inner">
                <FormField control={form.control} name="symbol" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-text-secondary uppercase tracking-wider text-xs font-bold">Traded Asset</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      const ast = settings.asset_list.find(a => a.symbol === val);
                      if (ast) form.setValue('asset_class', ast.asset_class);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-lg font-bold bg-background border-border/60 focus:ring-primary/50 transition-all">
                          <SelectValue placeholder="Select an Asset to Trade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {settings.asset_list.map(a => (
                          <SelectItem key={a.symbol} value={a.symbol} className="font-semibold text-base py-3 cursor-pointer">
                            {a.symbol} <span className="text-xs font-normal text-text-muted ml-2">{a.asset_class}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="direction" render={({ field }) => (
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
                )} />
              </div>

              {/* Right Column: Timing */}
              <div className="md:col-span-5 space-y-5 flex flex-col justify-center">
                <FormField control={form.control} name="trade_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-text-secondary uppercase tracking-wider text-xs font-bold">Execution Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-12 bg-background/50 border-border/60 focus:bg-background transition-all" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="trade_time_utc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between items-center text-text-secondary uppercase tracking-wider text-xs font-bold mb-1">
                      <span>Time (UTC)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="time" className="h-12 bg-background/50 border-border/60 focus:bg-background transition-all" {...field} />
                    </FormControl>
                    <div className="mt-2 flex items-center gap-2 bg-background/50 p-2 rounded-md border border-border/40">
                      <div className={\`w-2 h-2 rounded-full \${
                        sessionDetected === 'Asia' ? "bg-session-asia shadow-[0_0_8px_rgba(59,130,246,0.6)]" :
                        sessionDetected === 'London' ? "bg-session-london shadow-[0_0_8px_rgba(139,92,246,0.6)]" :
                        sessionDetected === 'NYSE' ? "bg-session-nyse shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                        sessionDetected === 'London/NYSE Overlap' ? "bg-session-overlap shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                        "bg-session-offhours"
                      }\`}></div>
                      <span className="text-sm font-medium text-text">{sessionDetected} Session</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </div>
          </CardContent>
        </Card>`;

content = content.replace(oldSection1, newSection1);
fs.writeFileSync('src/components/trades/trade-form.tsx', content);
