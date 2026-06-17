"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile } from "@/types";
import { calculateWinRate, calculateProfitFactor, calculateMaxDrawdown } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { format } from "date-fns";
import { InfoTooltip } from "@/components/info-tooltip";
import { usePrivacy } from "@/components/privacy-provider";

export default function StatisticsPage() {
  const [showStrategyAll, setShowStrategyAll] = useState(false);
  const [showCriteriaAll, setShowCriteriaAll] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    async function fetchData(silent: boolean = false) {
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
      const channel = supabase.channel('realtime-statistics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchData(true))
        .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, []);

  const stats = useMemo(() => {
    if (!profile || !trades || trades.length === 0) return null;
    
    const wr = calculateWinRate(trades);
    const pf = calculateProfitFactor(trades);
    const dd = calculateMaxDrawdown(trades, profile.starting_balance);
    
    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(t.status));
    const netPnL = closed.reduce((acc, t) => acc + t.net_pnl, 0);
    
    const wins = closed.filter(t => t.net_pnl > 0);
    const losses = closed.filter(t => t.net_pnl < 0);
    
    const avgWin = (wins || []).length > 0 ? wins.reduce((acc, t) => acc + t.net_pnl, 0) / wins.length : 0;
    const avgLoss = (losses || []).length > 0 ? losses.reduce((acc, t) => acc + t.net_pnl, 0) / losses.length : 0;
    
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


    // Time of Day Analysis
    const timeOfDayData = closed.map(t => {
      const [hour] = t.trade_time_utc.split(':').map(Number);
      return { hour, pnl: t.net_pnl, status: t.status };
    });

    // Drawdown Curve
    let peak = profile.starting_balance;
    let current = profile.starting_balance;
    const drawdownData = closed.sort((a,b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()).map(t => {
      current += t.net_pnl;
      if (current > peak) peak = current;
      const ddAmount = peak - current;
      const ddPercent = peak > 0 ? (ddAmount / peak) * 100 : 0;
      return { date: format(new Date(t.trade_date), "MMM dd"), drawdownPercent: -ddPercent };
    });

    // RR Efficiency: Actual Achieved RR / Planned RR
    let totalActualRR = 0;
    let totalPlannedRR = 0;
    wins.forEach(t => {
      totalActualRR += (t.actual_rr_achieved || 0);
      totalPlannedRR += (t.weighted_avg_rr_planned || 0);
    });
    const rrEfficiency = totalPlannedRR > 0 ? (totalActualRR / totalPlannedRR) * 100 : 0;

    
    const bestTrades = [...closed].sort((a, b) => b.net_pnl - a.net_pnl).slice(0, 3);
    const worstTrades = [...closed].sort((a, b) => a.net_pnl - b.net_pnl).slice(0, 3);

    // Timeframe Performance Analysis
    const timeframeStats: Record<string, { wins: number; total: number; netPnL: number }> = {};
    closed.forEach(t => {
      const isWin = t.net_pnl > 0;
      const htf = t.highest_timeframe || 'Unknown';
      const atf = t.analysis_timeframe || 'Unknown';
      const etf = t.entry_timeframe || 'Unknown';
      
      // HTF performance
      const htfKey = `HTF: ${htf}`;
      if (!timeframeStats[htfKey]) timeframeStats[htfKey] = { wins: 0, total: 0, netPnL: 0 };
      timeframeStats[htfKey].total += 1;
      if (isWin) timeframeStats[htfKey].wins += 1;
      timeframeStats[htfKey].netPnL += t.net_pnl;
      
      // Entry TF performance
      const etfKey = `Entry: ${etf}`;
      if (!timeframeStats[etfKey]) timeframeStats[etfKey] = { wins: 0, total: 0, netPnL: 0 };
      timeframeStats[etfKey].total += 1;
      if (isWin) timeframeStats[etfKey].wins += 1;
      timeframeStats[etfKey].netPnL += t.net_pnl;
      
      // Combined HTF + Entry TF
      const comboKey = `${htf} → ${etf}`;
      if (!timeframeStats[comboKey]) timeframeStats[comboKey] = { wins: 0, total: 0, netPnL: 0 };
      timeframeStats[comboKey].total += 1;
      if (isWin) timeframeStats[comboKey].wins += 1;
      timeframeStats[comboKey].netPnL += t.net_pnl;
    });

    const timeframePerformance = Object.entries(timeframeStats)
      .map(([name, data]) => ({
        name,
        winRate: (data.wins / data.total) * 100,
        total: data.total,
        netPnL: data.netPnL
      }))
      .filter(t => t.total >= 2) // Need at least 2 trades for statistical relevance
      .sort((a, b) => b.winRate - a.winRate);

    // Session Performance
    const sessionStats: Record<string, { wins: number; total: number; netPnL: number; totalRR: number }> = {};
    closed.forEach(t => {
      const s = t.session || 'Off-Hours';
      if (!sessionStats[s]) sessionStats[s] = { wins: 0, total: 0, netPnL: 0, totalRR: 0 };
      sessionStats[s].total += 1;
      if (t.net_pnl > 0) sessionStats[s].wins += 1;
      sessionStats[s].netPnL += t.net_pnl;
      sessionStats[s].totalRR += (t.actual_rr_achieved || 0);
    });
    const sessionPerformance = Object.entries(sessionStats)
      .map(([name, d]) => ({ name, winRate: (d.wins / d.total) * 100, total: d.total, netPnL: d.netPnL, avgRR: d.total > 0 ? d.totalRR / d.total : 0 }))
      .sort((a, b) => b.winRate - a.winRate);

    // Asset Performance
    const assetStats: Record<string, { wins: number; total: number; netPnL: number }> = {};
    closed.forEach(t => {
      const sym = t.symbol || 'Unknown';
      if (!assetStats[sym]) assetStats[sym] = { wins: 0, total: 0, netPnL: 0 };
      assetStats[sym].total += 1;
      if (t.net_pnl > 0) assetStats[sym].wins += 1;
      assetStats[sym].netPnL += t.net_pnl;
    });
    const assetPerformance = Object.entries(assetStats)
      .map(([name, d]) => ({ name, winRate: (d.wins / d.total) * 100, total: d.total, netPnL: d.netPnL }))
      .sort((a, b) => b.netPnL - a.netPnL);

    // Direction breakdown
    const longTrades = closed.filter(t => t.direction === 'Long');
    const shortTrades = closed.filter(t => t.direction === 'Short');
    const longWR = longTrades.length > 0 ? (longTrades.filter(t => t.net_pnl > 0).length / longTrades.length) * 100 : 0;
    const shortWR = shortTrades.length > 0 ? (shortTrades.filter(t => t.net_pnl > 0).length / shortTrades.length) * 100 : 0;
    const longPnL = longTrades.reduce((a, t) => a + t.net_pnl, 0);
    const shortPnL = shortTrades.reduce((a, t) => a + t.net_pnl, 0);

    // Consecutive streaks
    let currentWinStreak = 0, currentLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
    let tempWin = 0, tempLoss = 0;
    const sortedClosed = [...closed].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    sortedClosed.forEach(t => {
      if (t.net_pnl > 0) { tempWin++; tempLoss = 0; if (tempWin > maxWinStreak) maxWinStreak = tempWin; }
      else if (t.net_pnl < 0) { tempLoss++; tempWin = 0; if (tempLoss > maxLossStreak) maxLossStreak = tempLoss; }
    });
    // Current streak (from end)
    for (let i = sortedClosed.length - 1; i >= 0; i--) {
      if (sortedClosed[i].net_pnl > 0) { if (currentLossStreak === 0) currentWinStreak++; else break; }
      else if (sortedClosed[i].net_pnl < 0) { if (currentWinStreak === 0) currentLossStreak++; else break; }
      else break;
    }

    // Avg trade duration (minutes) — only for trades with close time
    const tradesWithDuration = closed.filter((t: any) => t.trade_close_time);
    const avgDurationMins = tradesWithDuration.length > 0
      ? tradesWithDuration.reduce((acc: number, t: any) => {
          try {
            const open = new Date(`${t.trade_date}T${t.trade_time_utc || '00:00'}:00Z`).getTime();
            const close = new Date(t.trade_close_time).getTime();
            return acc + Math.max(0, (close - open) / 60000);
          } catch { return acc; }
        }, 0) / tradesWithDuration.length
      : null;

    return { wr, pf, dd, netPnL, avgWin, avgLoss, expectancy, recoveryFactor, strategyPerformance, criteriaPerformance, timeOfDayData, drawdownData, rrEfficiency, bestTrades, worstTrades, timeframePerformance, sessionPerformance, assetPerformance, longTrades: longTrades.length, shortTrades: shortTrades.length, longWR, shortWR, longPnL, shortPnL, currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak, avgDurationMins };
  }, [profile, trades]);

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-20 w-full animate-in fade-in duration-500">
        <div className="flex flex-col space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-text-muted bg-clip-text text-transparent">Performance Analytics</h1>
          <p className="text-text-muted">Data-driven insights into your trading edge and behavioral patterns.</p>
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
                          cornerRadius={8}
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
                <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">Net P&L</p>
                    <p className={`font-mono text-lg md:text-3xl tracking-tight font-black truncate ${stats.netPnL > 0 ? "text-win" : stats.netPnL < 0 ? "text-loss" : ""}`}>
                      {stats.netPnL > 0 ? "+" : ""}{blurMoney(stats.netPnL)}
                    </p>
                  </div>
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">PF <InfoTooltip text="Gross Profit / Gross Loss" /></p>
                    <p className={`font-mono text-lg md:text-3xl tracking-tight font-black truncate ${stats.pf >= 1.5 ? "text-win" : "text-foreground"}`}>
                      {stats.pf === Infinity ? '∞' : (stats.pf || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">Expectancy <InfoTooltip text="Average expected dollar return per trade taken." /></p>
                    <p className={`font-mono text-lg md:text-3xl tracking-tight font-black truncate ${stats.expectancy > 0 ? "text-win" : "text-loss"}`}>
                      {stats.expectancy > 0 ? "+" : ""}{blurMoney(stats.expectancy)}
                    </p>
                  </div>
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">Recovery <InfoTooltip text="Net Profit / Max Drawdown. Higher means better bounce-back ability." /></p>
                    <p className={`font-mono text-lg md:text-3xl tracking-tight font-black truncate ${stats.recoveryFactor > 2 ? "text-win" : "text-foreground"}`}>
                      {(stats.recoveryFactor || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">Drawdown <InfoTooltip text="Largest peak-to-trough drop in balance." /></p>
                    <p className="font-mono text-lg md:text-3xl tracking-tight font-black text-loss truncate">
                      -{blurMoney(stats.dd.maxDrawdownAmount)}
                    </p>
                  </div>
                  <div className="p-3 md:p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group overflow-hidden">
                    <p className="text-[10px] md:text-xs font-semibold text-text-muted mb-1 md:mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors truncate">RR Efficiency <InfoTooltip text="Percentage of your Planned RR that you actually captured on winning trades." /></p>
                    <p className={`font-mono text-lg md:text-3xl tracking-tight font-black truncate ${stats.rrEfficiency >= 80 ? "text-win" : stats.rrEfficiency >= 50 ? "text-breakeven" : "text-loss"}`}>
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
                    {(stats.drawdownData || []).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border rounded-lg">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.drawdownData || []}>
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
                          <Area type="monotone" dataKey="drawdownPercent" stroke="hsl(0, 84%, 60%)" fillOpacity={1} fill="url(#colorDd)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time of Day Heatmap</CardTitle>
                  <CardDescription>Identifying your most profitable trading windows.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    {(stats.timeOfDayData || []).length === 0 ? (
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
                            formatter={(value: any, name: any) => name === 'PnL' ? [`${blurMoney(value)}`, 'Net PnL'] : [value, name]}
                          />
                          <Scatter data={(stats.timeOfDayData || []).filter((t: any) => t.pnl > 0)} fill="hsl(142, 71%, 45%)" />
                          <Scatter data={(stats.timeOfDayData || []).filter((t: any) => t.pnl <= 0)} fill="hsl(0, 84%, 60%)" />
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
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base md:text-lg">Strategy & Playbook Edge</CardTitle>
                      <CardDescription className="text-xs md:text-sm">Win rates based on your specific setups.</CardDescription>
                    </div>
                    {(stats.strategyPerformance || []).length > 3 && (
                      <button 
                        onClick={() => setShowStrategyAll(!showStrategyAll)}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        {showStrategyAll ? <>Compact <ChevronUp className="h-3 w-3"/></> : <>Show All <ChevronDown className="h-3 w-3"/></>}
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={`space-y-3 transition-all duration-300 ${showStrategyAll ? 'max-h-[400px] overflow-y-auto pr-1' : 'max-h-[180px] overflow-hidden'}`}>
                  {(stats.strategyPerformance || []).length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No strategy data available.</p>
                  ) : (
                    stats.strategyPerformance
                      .slice(0, showStrategyAll ? undefined : 3)
                      .map((strat: { name: string; winRate: number; total: number; netPnL: number }, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border overflow-hidden">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate pr-2">{strat.name}</p>
                            <p className="text-xs text-text-muted mt-1">{strat.total} trades</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={`font-bold text-sm whitespace-nowrap ${strat.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{(strat.winRate || 0).toFixed(1)}%</p>
                            <p className={`text-xs font-mono mt-1 whitespace-nowrap ${strat.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{strat.netPnL > 0 ? "+" : ""}{blurMoney(strat.netPnL)}</p>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base md:text-lg">Confluence & Criteria Impact</CardTitle>
                      <CardDescription className="text-xs md:text-sm">How specific validations impact your win rate.</CardDescription>
                    </div>
                    {(stats.criteriaPerformance || []).length > 3 && (
                      <button 
                        onClick={() => setShowCriteriaAll(!showCriteriaAll)}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        {showCriteriaAll ? <>Compact <ChevronUp className="h-3 w-3"/></> : <>Show All <ChevronDown className="h-3 w-3"/></>}
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={`space-y-3 transition-all duration-300 ${showCriteriaAll ? 'max-h-[400px] overflow-y-auto pr-1' : 'max-h-[180px] overflow-hidden'}`}>
                  {(stats.criteriaPerformance || []).length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No criteria data available.</p>
                  ) : (
                    stats.criteriaPerformance
                      .slice(0, showCriteriaAll ? undefined : 3)
                      .map((crit: { name: string; winRate: number; total: number; netPnL: number }, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border overflow-hidden">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate pr-2">{crit.name}</p>
                            <p className="text-xs text-text-muted mt-1">Present in {crit.total} trades</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={`font-bold text-sm whitespace-nowrap ${crit.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{(crit.winRate || 0).toFixed(1)}%</p>
                            <p className={`text-xs font-mono mt-1 whitespace-nowrap ${crit.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{crit.netPnL > 0 ? "+" : ""}{blurMoney(crit.netPnL)}</p>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timeframe Edge Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Timeframe Edge Analysis</CardTitle>
                <CardDescription className="text-xs md:text-sm">Win rates by HTF bias, Entry TF, and combined combinations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {(stats.timeframePerformance || []).length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">No timeframe data available. Log trades with timeframe selections to see analysis.</p>
                ) : (
                  stats.timeframePerformance.map((tf: { name: string; winRate: number; total: number; netPnL: number }, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-semibold text-sm truncate pr-4">{tf.name}</p>
                        <p className="text-xs text-text-muted mt-1">{tf.total} trades</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tf.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{(tf.winRate || 0).toFixed(1)}%</p>
                        <p className={`text-xs font-mono mt-1 ${tf.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{tf.netPnL > 0 ? "+" : ""}{blurMoney(tf.netPnL)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Session Performance + Direction Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Session Performance</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Win rate and avg R:R by trading session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(stats.sessionPerformance || []).length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No session data available.</p>
                  ) : (
                    stats.sessionPerformance.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate pr-2">{s.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">{s.total} trades · avg {s.avgRR.toFixed(2)}R</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className={`font-bold text-sm ${s.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{s.winRate.toFixed(1)}%</p>
                          <p className={`text-xs font-mono mt-0.5 ${s.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{s.netPnL > 0 ? '+' : ''}{blurMoney(s.netPnL)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Direction Analysis</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Long vs Short performance breakdown.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-win/5 border border-win/20 rounded-xl">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Long</p>
                      <p className={`text-2xl font-black ${stats.longWR >= 50 ? 'text-win' : 'text-loss'}`}>{stats.longWR.toFixed(0)}%</p>
                      <p className="text-xs text-text-muted mt-1">{stats.longTrades} trades</p>
                      <p className={`text-xs font-mono mt-1 ${stats.longPnL > 0 ? 'text-win' : 'text-loss'}`}>{stats.longPnL > 0 ? '+' : ''}{blurMoney(stats.longPnL)}</p>
                    </div>
                    <div className="p-4 bg-loss/5 border border-loss/20 rounded-xl">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Short</p>
                      <p className={`text-2xl font-black ${stats.shortWR >= 50 ? 'text-win' : 'text-loss'}`}>{stats.shortWR.toFixed(0)}%</p>
                      <p className="text-xs text-text-muted mt-1">{stats.shortTrades} trades</p>
                      <p className={`text-xs font-mono mt-1 ${stats.shortPnL > 0 ? 'text-win' : 'text-loss'}`}>{stats.shortPnL > 0 ? '+' : ''}{blurMoney(stats.shortPnL)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-background-secondary border border-border rounded-lg">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Current Streak</p>
                      <p className={`text-xl font-black mt-1 ${stats.currentWinStreak > 0 ? 'text-win' : stats.currentLossStreak > 0 ? 'text-loss' : 'text-foreground'}`}>
                        {stats.currentWinStreak > 0 ? `${stats.currentWinStreak}W 🔥` : stats.currentLossStreak > 0 ? `${stats.currentLossStreak}L ❄️` : '—'}
                      </p>
                    </div>
                    <div className="p-3 bg-background-secondary border border-border rounded-lg">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Best Streak</p>
                      <p className="text-xl font-black mt-1 text-win">{stats.maxWinStreak}W</p>
                      <p className="text-xs text-text-muted">worst: {stats.maxLossStreak}L</p>
                    </div>
                  </div>
                  {stats.avgDurationMins !== null && (
                    <div className="p-3 bg-background-secondary border border-border rounded-lg">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Avg Trade Duration</p>
                      <p className="text-xl font-black mt-1 text-foreground">
                        {stats.avgDurationMins! >= 60
                          ? `${Math.floor(stats.avgDurationMins! / 60)}h ${Math.round(stats.avgDurationMins! % 60)}m`
                          : `${Math.round(stats.avgDurationMins!)}m`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Asset Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Asset Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Win rate and net PnL per instrument, sorted by profitability.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                {(stats.assetPerformance || []).length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">No asset data available.</p>
                ) : (
                  stats.assetPerformance.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-background-secondary rounded-lg border border-border">
                      <span className="text-xs text-text-muted font-mono w-5 shrink-0">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{a.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${a.winRate >= 50 ? 'bg-win' : 'bg-loss'}`} style={{ width: `${a.winRate}%` }} />
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${a.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{a.winRate.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-mono font-bold ${a.netPnL > 0 ? 'text-win' : 'text-loss'}`}>{a.netPnL > 0 ? '+' : ''}{blurMoney(a.netPnL)}</p>
                        <p className="text-xs text-text-muted">{a.total} trades</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Notable Trades References */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <Card className="border-border/60 shadow-sm bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-win flex items-center gap-2 text-base md:text-lg">Top 3 Best Trades</CardTitle>
                  <CardDescription>Your most profitable setups contributing to your edge.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {stats.bestTrades.length === 0 ? (
                      <p className="p-4 text-center text-sm text-text-muted">No winning trades yet.</p>
                    ) : (
                      stats.bestTrades.map((t: any, i: number) => (
                        <div key={t.id} className="flex justify-between items-center p-4 hover:bg-background-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted font-mono text-xs">#{i+1}</span>
                            <div>
                              <p className="font-bold text-sm">{t.symbol} <span className="text-text-muted font-normal text-xs ml-1">{t.direction}</span></p>
                              <p className="text-xs text-text-muted mt-0.5">{format(new Date(t.trade_date), "MMM dd")} • {t.strategy || t.schematic}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="font-mono text-sm font-bold text-win">+{blurMoney(t.net_pnl)}</p>
                              <p className="text-xs text-text-muted font-mono">{t.actual_rr_achieved ? t.actual_rr_achieved.toFixed(2) : '0.00'}R</p>
                            </div>
                            <Link href={`/trades/${t.id}`} className="p-2 hover:bg-background rounded-full transition-colors">
                              <ArrowRight className="h-4 w-4 text-text-muted" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-loss flex items-center gap-2 text-base md:text-lg">Top 3 Worst Trades</CardTitle>
                  <CardDescription>Your heaviest losses. Review these for discipline leaks.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {stats.worstTrades.length === 0 ? (
                      <p className="p-4 text-center text-sm text-text-muted">No losing trades yet.</p>
                    ) : (
                      stats.worstTrades.map((t: any, i: number) => (
                        <div key={t.id} className="flex justify-between items-center p-4 hover:bg-background-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted font-mono text-xs">#{i+1}</span>
                            <div>
                              <p className="font-bold text-sm">{t.symbol} <span className="text-text-muted font-normal text-xs ml-1">{t.direction}</span></p>
                              <p className="text-xs text-text-muted mt-0.5">{format(new Date(t.trade_date), "MMM dd")} • {t.mistake_category || 'No mistake logged'}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="font-mono text-sm font-bold text-loss">-{blurMoney(Math.abs(t.net_pnl))}</p>
                              <p className="text-xs text-text-muted font-mono">{t.actual_rr_achieved ? t.actual_rr_achieved.toFixed(2) : '0.00'}R</p>
                            </div>
                            <Link href={`/trades/${t.id}`} className="p-2 hover:bg-background rounded-full transition-colors">
                              <ArrowRight className="h-4 w-4 text-text-muted" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}