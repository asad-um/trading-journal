"use client";
import { usePrivacy } from "@/components/privacy-provider";

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile } from "@/types";
import { calculateFloatingPnL, calculateWinRate, calculateProfitFactor } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Hash, Wallet, Loader2, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/info-tooltip";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [profileRes, tradesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trades").select("*").eq("user_id", user.id).order("trade_date", { ascending: true })
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (!profile) return null;

    const floatingPnL = calculateFloatingPnL(trades);
    const winRateData = calculateWinRate(trades);
    const profitFactor = calculateProfitFactor(trades);
    
    // Closed trades only for performance metrics
    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven'].includes(t.status));
    const totalClosedPnL = closed.reduce((acc, t) => acc + t.net_pnl, 0);
    
    // Average Win / Loss
    const wins = closed.filter(t => t.net_pnl > 0);
    const losses = closed.filter(t => t.net_pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + t.net_pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + t.net_pnl, 0) / losses.length : 0;
    
    const avgWinPercent = profile.starting_balance > 0 ? (avgWin / profile.starting_balance) * 100 : 0;
    const avgLossPercent = profile.starting_balance > 0 ? (avgLoss / profile.starting_balance) * 100 : 0;

    // Cumulative Daily P&L Tracker
    let runningPnL = 0;
    const cumulativePnlData: { date: string; cumulativePnL: number; tradePnL: number; symbol: string }[] = [];
    const dailyVolumeMap: Record<string, number> = {};

    closed.forEach(t => {
      const dateStr = format(new Date(t.trade_date), "MMM dd");
      runningPnL += t.net_pnl;
      cumulativePnlData.push({
        date: dateStr,
        cumulativePnL: runningPnL,
        tradePnL: t.net_pnl,
        symbol: t.symbol,
      });

      dailyVolumeMap[dateStr] = (dailyVolumeMap[dateStr] || 0) + 1;
    });

    // Format daily volume for bar chart
    const volumeData = Object.keys(dailyVolumeMap).map(date => ({
      date,
      trades: dailyVolumeMap[date]
    }));

    // Trade Lists
    const recentTrades = [...trades].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()).slice(0, 10);
    const openPositions = trades.filter(t => t.status === 'Open' || t.status === 'Partial');

    return { 
      floatingPnL, 
      winRateData, 
      profitFactor, 
      totalClosedPnL, 
      avgWin, 
      avgLoss, 
      avgWinPercent, 
      avgLossPercent, 
      cumulativePnlData, 
      volumeData,
      recentTrades, 
      openPositions 
    };
  }, [profile, trades]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!profile || !stats) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 text-center">
          <h2 className="text-2xl font-bold text-loss">Profile Data Missing</h2>
          <p className="text-text-muted max-w-md">
            Your authentication was successful, but we couldn&apos;t find your profile data.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/login'}>Go Back to Login</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        </div>

        {/* Top Row Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-muted">Net Balance</p>
                  <p className="text-2xl font-bold">{blurMoney(profile.current_balance)}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md"><Wallet className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4 text-xs text-text-muted">
                Initial: {blurMoney(profile.starting_balance)}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-muted flex items-center">Net P&L <InfoTooltip text="Total Realized P&L minus fees" /></p>
                  <p className={`text-2xl font-bold ${stats.totalClosedPnL > 0 ? 'text-win' : stats.totalClosedPnL < 0 ? 'text-loss' : ''}`}>
                    {stats.totalClosedPnL > 0 ? "+" : ""}{blurMoney(stats.totalClosedPnL, "")}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md"><TrendingUp className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4 text-xs text-text-muted">
                Float: <span className={stats.floatingPnL >= 0 ? "text-win" : "text-loss"}>{stats.floatingPnL >= 0 ? "+" : ""}{blurMoney(stats.floatingPnL, "")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-muted">Trade Win %</p>
                  <p className={`text-2xl font-bold ${stats.winRateData.winRate > 50 ? "text-win" : stats.winRateData.winRate < 50 ? "text-loss" : "text-breakeven"}`}>
                    {stats.winRateData.winRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md"><Target className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4 text-xs text-text-muted flex justify-between">
                <span className="text-win">{stats.winRateData.wins} W</span>
                <span className="text-loss">{stats.winRateData.losses} L</span>
                <span className="text-breakeven">{stats.winRateData.breakevens} BE</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-muted flex items-center">Profit Factor <InfoTooltip text="Gross Profit / Gross Loss. Elite target > 1.5" /></p>
                  <p className={`text-2xl font-bold ${stats.profitFactor >= 1.5 ? "text-win" : stats.profitFactor >= 1.0 ? "text-breakeven" : "text-loss"}`}>
                    {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md"><Activity className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4 text-xs text-text-muted">
                Total Trades: {stats.winRateData.total + stats.openPositions.length}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-muted flex items-center">Avg Win / Loss <InfoTooltip text="The average monetary value of winning trades vs losing trades." /></p>
                  <p className="text-xl font-bold text-win">{stats.avgWinPercent > 0 ? "+" : ""}{stats.avgWinPercent.toFixed(2)}%</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-md"><Hash className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-2 text-xl font-bold text-loss">
                -{Math.abs(stats.avgLossPercent).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Cumulative Net P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {stats.cumulativePnlData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border rounded-lg">No closed trades yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.cumulativePnlData}>
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val: unknown) => `$${Number(val).toFixed(0)}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, 'Cumulative P&L']}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="cumulativePnL" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorPnL)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">Volume Tracker <InfoTooltip text="Number of trades executed per day." /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {stats.volumeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-text-muted text-sm border-2 border-dashed border-border rounded-lg">No activity yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.volumeData}>
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                      <Bar dataKey="trades" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Trade List */}
        <Card>
          <div className="p-4 border-b border-border">
            <Tabs defaultValue="recent" className="w-full">
              <div className="flex justify-between items-center w-full">
                <TabsList className="bg-background-tertiary">
                  <TabsTrigger value="recent" className="text-xs md:text-sm">Recent Activity</TabsTrigger>
                  <TabsTrigger value="open" className="text-xs md:text-sm relative">
                    Active Positions 
                    {stats.openPositions.length > 0 && (
                      <span className="ml-2 bg-open text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{stats.openPositions.length}</span>
                    )}
                  </TabsTrigger>
                </TabsList>
                <Link href="/trades" className="text-sm text-primary hover:underline font-medium">View Full Log</Link>
              </div>

              <TabsContent value="recent" className="mt-4 border-none p-0 outline-none">
                <div className="space-y-3">
                  {stats.recentTrades.length === 0 ? (
                    <div className="text-center text-text-muted py-8">No recent trades.</div>
                  ) : (
                    stats.recentTrades.map(trade => (
                      <Link key={trade.id} href={`/trades/${trade.id}`} className="block group">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-background-secondary border border-border group-hover:border-primary/50 transition-all group-hover:shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${trade.direction === 'Long' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'}`}>
                              {trade.direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{trade.symbol}</span>
                                <Badge variant="outline" className="text-[10px] h-5 hidden md:inline-flex">{trade.asset_class}</Badge>
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                Closed: {format(new Date(trade.trade_date), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={
                              trade.status.includes('Win') ? "text-win border-win/30" : 
                              trade.status.includes('Loss') ? "text-loss border-loss/30" : 
                              trade.status === 'Breakeven' ? "text-breakeven border-breakeven/30" : "text-open border-open/30"
                            }>
                              {trade.status === 'Closed - Win' ? 'Win' : trade.status === 'Closed - Loss' ? 'Loss' : trade.status}
                            </Badge>
                            <div className={`text-sm font-mono mt-1 font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : "text-text-muted"}`}>
                              {trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl, "")}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="open" className="mt-4 border-none p-0 outline-none">
                <div className="space-y-3">
                  {stats.openPositions.length === 0 ? (
                    <div className="text-center text-text-muted py-8">No open positions.</div>
                  ) : (
                    stats.openPositions.map(trade => (
                      <div key={trade.id} className="flex justify-between items-center p-3 rounded-lg bg-background-secondary border border-open/30 hover:border-open/60 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${trade.direction === 'Long' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'}`}>
                            {trade.direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{trade.symbol}</div>
                            <div className="text-xs text-text-muted mt-0.5">
                              Entry: {trade.entry_price}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`text-sm font-mono font-bold ${trade.net_pnl >= 0 ? "text-win" : "text-loss"}`}>
                            {trade.net_pnl >= 0 ? "+" : ""}{blurMoney(trade.net_pnl, "")}
                          </div>
                          <Link href={`/trades/${trade.id}`}>
                            <Button size="sm" variant="outline" className="h-8">Update</Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>

      </div>
    </AppLayout>
  );
}