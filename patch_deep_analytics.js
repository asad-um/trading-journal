const fs = require('fs');

let stats = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

// I need to extract data for the Time-of-Day scatter plot and the Drawdown chart.
// I can add this logic into the useMemo.

const oldMemoEnd = `    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, rrEfficiency, strategyPerformance, criteriaPerformance };
  }, [profile, trades]);`;

const newMemoLogic = `
    // Time of Day Analysis
    const timeOfDayData = closed.map(t => {
      const [hour] = t.trade_time_utc.split(':').map(Number);
      return { hour, pnl: t.net_pnl, status: t.status };
    });

    // Drawdown Curve
    let peak = profile.starting_balance;
    let current = profile.starting_balance;
    const drawdownData = closed.map(t => {
      current += t.net_pnl;
      if (current > peak) peak = current;
      const ddAmount = peak - current;
      const ddPercent = peak > 0 ? (ddAmount / peak) * 100 : 0;
      return { date: format(new Date(t.trade_date), "MMM dd"), drawdownPercent: -ddPercent };
    });

    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, rrEfficiency, strategyPerformance, criteriaPerformance, timeOfDayData, drawdownData };
  }, [profile, trades]);`;

stats = stats.replace(oldMemoEnd, newMemoLogic);

// Add Scatter to Recharts imports
stats = stats.replace(
  'import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";',
  'import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";\nimport { format } from "date-fns";'
);

// Inject the UI for Deep Analytics above the "Strategy Edge" cards.
const uiInjection = `
            {/* Deep Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Depth</CardTitle>
                  <CardDescription>Visualizing your account dips from all-time highs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {stats.drawdownData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border rounded-lg">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.drawdownData}>
                          <defs>
                            <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: any) => \`\${Number(v).toFixed(0)}%\`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(val: any) => [\`\${Number(val).toFixed(2)}%\`, 'Drawdown']}
                          />
                          <Area type="step" dataKey="drawdownPercent" stroke="hsl(0, 84%, 60%)" fillOpacity={1} fill="url(#colorDd)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time of Day Heatmap (UTC)</CardTitle>
                  <CardDescription>Identifying your most profitable trading windows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {stats.timeOfDayData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border rounded-lg">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis type="number" dataKey="hour" name="Hour" unit=":00" domain={[0, 23]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickCount={12} />
                          <YAxis type="number" dataKey="pnl" name="PnL" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: any) => \`$\${v}\`} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: any, name: string) => name === 'PnL' ? [\`\${blurMoney(value)}\`, 'Net PnL'] : [value, name]}
                          />
                          <Scatter data={stats.timeOfDayData.filter((t: any) => t.pnl > 0)} fill="hsl(142, 71%, 45%)" />
                          <Scatter data={stats.timeOfDayData.filter((t: any) => t.pnl <= 0)} fill="hsl(0, 84%, 60%)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>`;

stats = stats.replace('{/* Edge Analysis Section */}', uiInjection + '\n\n            {/* Edge Analysis Section */}');

fs.writeFileSync('src/app/statistics/page.tsx', stats);
console.log("Deep visual analytics injected.");
