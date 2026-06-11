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
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [moodScore, setMoodScore] = useState(3);
  const [disciplineScore, setDisciplineScore] = useState(3);
  const [avgMood, setAvgMood] = useState(0);
  const [avgDiscipline, setAvgDiscipline] = useState(0);
  const { blurMoney } = usePrivacy();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData(silent: boolean = false) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      // 1. Get the currently active portfolio
      const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];
      
      if (!activePort) {
        setProfile(null);
        setTrades([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch the trades strictly for that active portfolio
      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePort.id).order("trade_date", { ascending: true });

      // 3. Set the profile state completely using the Active Portfolio data (Not the generic profiles table)
      setProfile(activePort as any);
      if (tradesRes) setTrades(tradesRes);
      
      setIsLoading(false);
    }
    
      fetchData();
      const channel = supabase.channel('realtime-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'account_events' }, () => fetchData(true))
        .subscribe();

      return () => { supabase.removeChannel(channel); }
  }, []);

  
  const handleDailyCheckin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Use upsert to avoid duplicate key conflict when re-checking in
    const { error } = await supabase.from('daily_checkins').upsert({
      user_id: user.id,
      checkin_date: today,
      mood_score: moodScore,
      discipline_score: disciplineScore,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,checkin_date' });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    setHasCheckedIn(true);
    // Let's trigger a subtle UI toast if tilt is detected
    if (moodScore <= 2 && disciplineScore <= 2) {
      toast({ title: "Tilt Warning", description: "Low mood and discipline detected. Statistically, you are at high risk of forced errors today. Trade small or step away.", variant: "destructive", duration: 10000 });
    } else {
      toast({ title: "Checked In", description: "Have a great trading session." });
    }
  };

  const stats = useMemo(() => {
    if (!profile) return null;

    const floatingPnL = calculateFloatingPnL(trades);
    const winRateData = calculateWinRate(trades);
    const profitFactor = calculateProfitFactor(trades);
    
    // Closed trades only for performance metrics
    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(t.status));
    const totalClosedPnL = closed.reduce((acc, t) => acc + t.net_pnl, 0);
    
    // Average Win / Loss
    const wins = closed.filter(t => t.net_pnl > 0);
    const losses = closed.filter(t => t.net_pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + t.net_pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + t.net_pnl, 0) / losses.length : 0;
    
    // If starting balance is 0, percentages break. Fallback to using current_balance if available, else just cap it at 0 to avoid Infinity errors.
    const baseForMath = profile.starting_balance > 0 ? profile.starting_balance : (profile.current_balance > 0 ? profile.current_balance : 1);
    const avgWinPercent = (avgWin / baseForMath) * 100;
    const avgLossPercent = (avgLoss / baseForMath) * 100;

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
    const recentTrades = [...trades].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()).slice(0, 5);
    const openPositions = trades.filter(t => t.status === 'Open');


    // --- Algorithmic Trading Coach (Smart Insights) ---
    const insights: string[] = [];
    
    if (closed.length >= 5) {
      // 1. Symbol Analysis
      const symbolMap: Record<string, { wins: number, total: number, pnl: number }> = {};
      closed.forEach(t => {
        if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { wins: 0, total: 0, pnl: 0 };
        symbolMap[t.symbol].total++;
        symbolMap[t.symbol].pnl += t.net_pnl;
        if (t.net_pnl > 0) symbolMap[t.symbol].wins++;
      });
      
      let bestSymbol = "";
      let bestSymbolWR = 0;
      let worstSymbol = "";
      let worstSymbolWR = 100;
      
      Object.keys(symbolMap).forEach(sym => {
        const data = symbolMap[sym];
        if (data.total >= 3) {
          const wr = (data.wins / data.total) * 100;
          if (wr > bestSymbolWR && data.pnl > 0) { bestSymbolWR = wr; bestSymbol = sym; }
          if (wr < worstSymbolWR && data.pnl < 0) { worstSymbolWR = wr; worstSymbol = sym; }
        }
      });
      
      if (bestSymbol) insights.push(`🔥 Strong Edge: You have a ${bestSymbolWR.toFixed(0)}% win rate on ${bestSymbol}. Focus on this asset.`);
      if (worstSymbol) insights.push(`⚠️ Wealth Leak: You have a ${worstSymbolWR.toFixed(0)}% win rate on ${worstSymbol}. Consider dropping it.`);
      
      // 2. Day of Week Analysis
      let fridayPnL = 0;
      closed.forEach(t => {
        if (new Date(t.trade_date).getDay() === 5) fridayPnL += t.net_pnl;
      });
      if (fridayPnL < 0) insights.push(`📉 Friday Bleed: Statistically, you lose money on Fridays. Size down or skip trading.`);
      
      // 3. Session Analysis
      const sessionMap: Record<string, number> = {};
      closed.forEach(t => {
        if (!sessionMap[t.session]) sessionMap[t.session] = 0;
        sessionMap[t.session] += t.net_pnl;
      });
      let bestSession = "";
      let bestSessionPnL = -Infinity;
      Object.keys(sessionMap).forEach(sess => {
        if (sessionMap[sess] > bestSessionPnL) {
          bestSessionPnL = sessionMap[sess];
          bestSession = sess;
        }
      });
      if (bestSessionPnL > 0) insights.push(`💡 Ideal Window: The ${bestSession} session is your most profitable (${bestSessionPnL > 0 ? "+" : ""}${blurMoney(bestSessionPnL)}).`);
    }

    if (insights.length === 0) insights.push("Log at least 5 closed trades to unlock Algorithmic Coach insights.");

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
      openPositions,
      insights
    };
  }, [profile, trades, blurMoney]);

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

        {/* Algorithmic Trading Coach */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="p-1.5 md:p-2 bg-primary text-primary-foreground rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="font-bold text-foreground uppercase tracking-wider text-xs md:text-sm">Smart Insights</h3>
          </div>
          <div className="w-full overflow-hidden relative">
            {/* Simple fading carousel for insights */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
              {stats.insights.map((insight: string, i: number) => (
                <div key={i} className="shrink-0 snap-start bg-background/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-border/50 text-sm font-medium whitespace-nowrap">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Psychology Tracker */}
        <div className="bg-gradient-to-r from-accent/5 to-transparent border border-accent/20 rounded-xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-bold text-foreground">Mental Edge</h3>
            <p className="text-xs text-text-muted">Track your mood and discipline.</p>
            {avgMood > 0 && (
              <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                <span className="text-text-secondary">30-Day Avg:</span>
                <span className={avgMood >= 3.5 ? "text-win" : avgMood <= 2 ? "text-loss" : "text-breakeven"}>Mood {avgMood.toFixed(1)}/5</span>
                <span className={avgDiscipline >= 3.5 ? "text-win" : avgDiscipline <= 2 ? "text-loss" : "text-breakeven"}>Discipline {avgDiscipline.toFixed(1)}/5</span>
              </div>
            )}
          </div>
          
          {!hasCheckedIn ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto bg-background/50 p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-text-secondary w-16">Mood</span>
                <input type="range" min="1" max="5" value={moodScore} onChange={(e) => setMoodScore(parseInt(e.target.value))} className="w-full sm:w-24 accent-primary" />
                <span className="text-xs font-mono w-6">{moodScore}</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-text-secondary w-16">Discipline</span>
                <input type="range" min="1" max="5" value={disciplineScore} onChange={(e) => setDisciplineScore(parseInt(e.target.value))} className="w-full sm:w-24 accent-primary" />
                <span className="text-xs font-mono w-6">{disciplineScore}</span>
              </div>
              <Button size="sm" onClick={handleDailyCheckin} className="w-full sm:w-auto whitespace-nowrap bg-accent hover:bg-accent/90 text-background">Check In</Button>
            </div>
          ) : (
            <div className="px-4 py-2 bg-win/10 text-win border border-win/20 rounded-lg text-sm font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
              Checked in for today
            </div>
          )}
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
                      <Bar dataKey="trades" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={40} />
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 sm:gap-0">
                <TabsList className="bg-background-tertiary flex-wrap h-auto">
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