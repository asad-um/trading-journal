"use client";

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile } from "@/types";
import { calculateWinRate, calculateProfitFactor, calculateMaxDrawdown } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
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

      const { data: activePortfolio } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).single();
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
  }, []);

  const stats = useMemo(() => {
    if (!profile || trades.length === 0) return null;
    
    const wr = calculateWinRate(trades);
    const pf = calculateProfitFactor(trades);
    const dd = calculateMaxDrawdown(trades, profile.starting_balance);
    
    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven'].includes(t.status));
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
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Wins', value: stats.wr.wins, color: '#22c55e' },
                            { name: 'Losses', value: stats.wr.losses, color: '#ef4444' },
                            { name: 'Breakevens', value: stats.wr.breakevens, color: '#f59e0b' },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {
                            [
                              { name: 'Wins', value: stats.wr.wins, color: '#22c55e' },
                              { name: 'Losses', value: stats.wr.losses, color: '#ef4444' },
                              { name: 'Breakevens', value: stats.wr.breakevens, color: '#f59e0b' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center pb-6 mt-4">
                    <p className="text-4xl font-bold">{stats.wr.winRate.toFixed(1)}%</p>
                    <p className="text-sm text-text-muted mt-1">Consistency Metric</p>
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
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Net P&L</p>
                    <p className={`font-mono text-xl font-bold ${stats.netPnL > 0 ? "text-win" : stats.netPnL < 0 ? "text-loss" : ""}`}>
                      {stats.netPnL > 0 ? "+" : ""}{blurMoney(stats.netPnL)}
                    </p>
                  </div>
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Profit Factor <InfoTooltip text="Gross Profit / Gross Loss" /></p>
                    <p className={`font-mono text-xl font-bold ${stats.pf >= 1.5 ? "text-win" : "text-foreground"}`}>
                      {stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Trade Expectancy <InfoTooltip text="Average expected dollar return per trade taken." /></p>
                    <p className={`font-mono text-xl font-bold ${stats.expectancy > 0 ? "text-win" : "text-loss"}`}>
                      {stats.expectancy > 0 ? "+" : ""}{blurMoney(stats.expectancy)}
                    </p>
                  </div>
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Recovery Factor <InfoTooltip text="Net Profit / Max Drawdown. Higher means better bounce-back ability." /></p>
                    <p className={`font-mono text-xl font-bold ${stats.recoveryFactor > 2 ? "text-win" : "text-foreground"}`}>
                      {stats.recoveryFactor.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Max Drawdown <InfoTooltip text="Largest peak-to-trough drop in balance." /></p>
                    <p className="font-mono text-xl font-bold text-loss">
                      -{blurMoney(stats.dd.maxDrawdownAmount)}
                    </p>
                  </div>
                  <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Total Fees Drag <InfoTooltip text="Estimated total fees deducted from Gross P&L." /></p>
                    <p className="font-mono text-xl font-bold text-loss">
                      -{blurMoney(stats.totalFees)}
                    </p>
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
                          <p className={`font-bold ${strat.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{strat.winRate.toFixed(1)}%</p>
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
                          <p className={`font-bold ${crit.winRate >= 50 ? 'text-win' : 'text-loss'}`}>{crit.winRate.toFixed(1)}%</p>
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