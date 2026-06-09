"use client";

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile } from "@/types";
import { calculateWinRate, calculateProfitFactor, calculateMaxDrawdown } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { InfoTooltip } from "@/components/info-tooltip";
import { usePrivacy } from "@/components/privacy-provider";

export default function StatisticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePortfolio = activePorts?.[0];
      if (!activePortfolio) { setIsLoading(false); return; }

      const [profRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("portfolio_id", activePortfolio.id)
      ]);

      if (profRes.data) setProfile({ ...profRes.data, starting_balance: activePortfolio.starting_balance, current_balance: activePortfolio.current_balance });
      if (tradesRes.data) setTrades(tradesRes.data);
      setIsLoading(false);
    }
    
      fetchData();
      const channel = supabase.channel('realtime-page.tsx')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchData(true))
        .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, []);

  const stats = useMemo(() => {
    if (!profile || trades.length === 0) return null;
    
    const wr = calculateWinRate(trades);
    const pf = calculateProfitFactor(trades);
    const dd = calculateMaxDrawdown(trades, profile.starting_balance);
    
    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(t.status));
    const grossPnL = closed.reduce((acc, t) => acc + t.gross_pnl, 0);
    const netPnL = closed.reduce((acc, t) => acc + t.net_pnl, 0);
    const totalFees = grossPnL - netPnL; // Rough estimate of fees
    
    const wins = closed.filter(t => t.net_pnl > 0);
    const losses = closed.filter(t => t.net_pnl < 0);
    
    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + t.net_pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + t.net_pnl, 0) / losses.length : 0;
    
    // Trade Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
    const winRateDec = wr.winRate / 100;
    const lossRateDec = wr.lossRate / 100;
    const expectancy = (winRateDec * avgWin) - (lossRateDec * Math.abs(avgLoss));

    // Recovery Factor = Net Profit / Max Drawdown
    const recoveryFactor = dd.maxDrawdownAmount > 0 && netPnL > 0 ? (netPnL / dd.maxDrawdownAmount) : 0;

    
    const strategyStats: Record<string, { wins: number; total: number; netPnL: number }> = {};
    const criteriaStats: Record<string, { wins: number; total: number; netPnL: number }> = {};

    closed.forEach(t => {
      const isWin = t.net_pnl > 0;
      
      // Strategy stats
      const stratKey = t.sub_strategy ? `${t.strategy} - ${t.sub_strategy}` : (t.strategy || t.schematic);
      if (!strategyStats[stratKey]) strategyStats[stratKey] = { wins: 0, total: 0, netPnL: 0 };
      strategyStats[stratKey].total += 1;
      if (isWin) strategyStats[stratKey].wins += 1;
      strategyStats[stratKey].netPnL += t.net_pnl;

      // Criteria stats
      if (t.criteria_checked && Array.isArray(t.criteria_checked)) {
        t.criteria_checked.forEach((c: { label: string; checked: boolean }) => {
          if (c.checked) {
            const cKey = c.label;
            if (!criteriaStats[cKey]) criteriaStats[cKey] = { wins: 0, total: 0, netPnL: 0 };
            criteriaStats[cKey].total += 1;
            if (isWin) criteriaStats[cKey].wins += 1;
            criteriaStats[cKey].netPnL += t.net_pnl;
          }
        });
      }
    });

    const strategyPerformance = Object.entries(strategyStats)
      .map(([name, data]) => ({
        name,
        winRate: (data.wins / data.total) * 100,
        total: data.total,
        netPnL: data.netPnL
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const criteriaPerformance = Object.entries(criteriaStats)
      .map(([name, data]) => ({
        name,
        winRate: (data.wins / data.total) * 100,
        total: data.total,
        netPnL: data.netPnL
      }))
      .filter(c => c.total >= 1) // Filter out noise if needed
      .sort((a, b) => b.winRate - a.winRate);

    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, strategyPerformance, criteriaPerformance };
  }, [profile, trades]);

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-20 w-full animate-in fade-in duration-500">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Advanced Statistics</h1>
          <p className="text-text-muted">Analyze your trading performance and edge.</p>
        </div>
        
        {!stats ? (
          <div className="text-center py-20 text-text-muted border-2 border-dashed border-border rounded-lg">
            Not enough data to generate statistics. Log some closed trades first.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Win Rate Donut */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Win Rate Overview</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0 flex flex-col justify-center">
                  <div className="h-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Wins', value: stats.wr.wins, color: 'hsl(142, 71%, 45%)' },
                            { name: 'Losses', value: stats.wr.losses, color: 'hsl(0, 84%, 60%)' },
                            { name: 'Breakevens', value: stats.wr.breakevens, color: 'hsl(38, 92%, 50%)' },
                          ]}
                          cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                          stroke="none"
                          cornerRadius={4}
                        >
                          {
                            [
                              { name: 'Wins', value: stats.wr.wins, color: 'hsl(142, 71%, 45%)' },
                              { name: 'Losses', value: stats.wr.losses, color: 'hsl(0, 84%, 60%)' },
                              { name: 'Breakevens', value: stats.wr.breakevens, color: 'hsl(38, 92%, 50%)' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-md hover:opacity-80 transition-opacity" />
                            ))
                          }
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black text-foreground drop-shadow-md">{(stats.wr.winRate || 0).toFixed(0)}%</span>
                      <span className="text-[10px] uppercase tracking-widest text-text-muted mt-1 font-semibold">Win Rate</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-6 pb-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-win"></div><span className="text-xs font-medium">{stats.wr.wins} W</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-loss"></div><span className="text-xs font-medium">{stats.wr.losses} L</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-breakeven"></div><span className="text-xs font-medium">{stats.wr.breakevens} BE</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics Grid */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Core Performance</CardTitle>
                  <CardDescription>Key metrics defining your statistical edge.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Net P&L</p>
                    <p className={`font-mono text-3xl tracking-tight font-black ${stats.netPnL > 0 ? "text-win" : stats.netPnL < 0 ? "text-loss" : ""}`}>
                      {stats.netPnL > 0 ? "+" : ""}{blurMoney(stats.netPnL)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Profit Factor <InfoTooltip text="Gross Profit / Gross Loss" /></p>
                    <p className={`font-mono text-3xl tracking-tight font-black ${stats.pf >= 1.5 ? "text-win" : "text-foreground"}`}>
                      {stats.pf === Infinity ? '∞' : (stats.pf || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Trade Expectancy <InfoTooltip text="Average expected dollar return per trade taken." /></p>
                    <p className={`font-mono text-3xl tracking-tight font-black ${stats.expectancy > 0 ? "text-win" : "text-loss"}`}>
                      {stats.expectancy > 0 ? "+" : ""}{blurMoney(stats.expectancy)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Recovery Factor <InfoTooltip text="Net Profit / Max Drawdown. Higher means better bounce-back ability." /></p>
                    <p className={`font-mono text-3xl tracking-tight font-black ${stats.recoveryFactor > 2 ? "text-win" : "text-foreground"}`}>
                      {(stats.recoveryFactor || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Max Drawdown <InfoTooltip text="Largest peak-to-trough drop in balance." /></p>
                    <p className="font-mono text-3xl tracking-tight font-black text-loss">
                      -{blurMoney(stats.dd.maxDrawdownAmount)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Total Fees Drag <InfoTooltip text="Estimated total fees deducted from Gross P&L." /></p>
                    <p className="font-mono text-3xl tracking-tight font-black text-loss">
                      -{blurMoney(stats.totalFees)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">RR Efficiency <InfoTooltip text="Percentage of your Planned RR that you actually captured on winning trades." /></p>
                    <p className={`font-mono text-3xl tracking-tight font-black ${stats.rrEfficiency >= 80 ? "text-win" : stats.rrEfficiency >= 50 ? "text-breakeven" : "text-loss"}`}>
                      {(stats.rrEfficiency || 0).toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            
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
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: any) => `${Number(v || 0).toFixed(0)}%`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(val: any) => [`${Number(val || 0).toFixed(2)}%`, 'Drawdown']}
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
                          <YAxis type="number" dataKey="pnl" name="PnL" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: any) => `${v}`} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: any, name: string) => name === 'PnL' ? [`${blurMoney(value)}`, 'Net PnL'] : [value, name]}
                          />
                          <Scatter data={stats.timeOfDayData.filter((t: any) => t.pnl > 0)} fill="hsl(142, 71%, 45%)" />
                          <Scatter data={stats.timeOfDayData.filter((t: any) => t.pnl <= 0)} fill="hsl(0, 84%, 60%)" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edge Analysis Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy & Playbook Edge</CardTitle>
                  <CardDescription>Win rates based on your specific setups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.strategyPerformance.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No strategy data available.</p>
                  ) : (
                    stats.strategyPerformance.map((strat: { name: string; winRate: number; total: number; netPnL: number }, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate pr-4">{strat.name}</p>
                          <p className="text-xs text-text-muted mt-1">{strat.total} trades</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${strat.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{(strat.winRate || 0).toFixed(1)}%</p>
                          <p className={`text-xs font-mono mt-1 ${strat.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{strat.netPnL > 0 ? "+" : ""}{blurMoney(strat.netPnL)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confluence & Criteria Impact</CardTitle>
                  <CardDescription>How specific validations impact your win rate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {stats.criteriaPerformance.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No criteria data available.</p>
                  ) : (
                    stats.criteriaPerformance.map((crit: { name: string; winRate: number; total: number; netPnL: number }, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate pr-4">{crit.name}</p>
                          <p className="text-xs text-text-muted mt-1">Present in {crit.total} trades</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${crit.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{(crit.winRate || 0).toFixed(1)}%</p>
                          <p className={`text-xs font-mono mt-1 ${crit.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{crit.netPnL > 0 ? "+" : ""}{blurMoney(crit.netPnL)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  );
}