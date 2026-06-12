"use client";
import { usePrivacy } from "@/components/privacy-provider";

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile } from "@/types";
import { calculateFloatingPnL, calculateWinRate, calculateProfitFactor } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Hash, Wallet, Loader2, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";
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
  const [insightsOpen, setInsightsOpen] = useState(true);
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

      // 3. Check if user already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: checkinRes } = await supabase.from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();
      
      if (checkinRes) {
        setHasCheckedIn(true);
        setMoodScore(checkinRes.mood_score || 3);
        setDisciplineScore(checkinRes.discipline_score || 3);
      }

      // 4. Set the profile state completely using the Active Portfolio data (Not the generic profiles table)
      setProfile(activePort as any);
      if (tradesRes) setTrades(tradesRes);
      
      setIsLoading(false);
    }
    
      fetchData();
      const channel = supabase.channel('realtime-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_events' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_checkins' }, () => fetchData(true))
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


    // --- Algorithmic Trading Coach (Smart Insights v3) ---
    type InsightCategory = 'edge' | 'risk' | 'behavior' | 'recommendation';
    interface Insight { text: string; category: InsightCategory; }
    const insights: Insight[] = [];

    const addInsight = (text: string, category: InsightCategory) => {
      if (text) insights.push({ text, category });
    };

    if (closed.length >= 5) {
      // Helpers
      const grouped = (keyFn: (t: Trade) => string) => {
        const map: Record<string, { wins: number; total: number; pnl: number; rrSum: number; rrCount: number }> = {};
        closed.forEach(t => {
          const key = keyFn(t);
          if (!key) return;
          if (!map[key]) map[key] = { wins: 0, total: 0, pnl: 0, rrSum: 0, rrCount: 0 };
          map[key].total++;
          map[key].pnl += t.net_pnl;
          if (t.net_pnl > 0) map[key].wins++;
          if (t.actual_rr_achieved !== 0) { map[key].rrSum += t.actual_rr_achieved; map[key].rrCount++; }
        });
        return map;
      };

      const minGroupSize = 3;

      // 1. Symbol Analysis
      const symbolMap = grouped(t => t.symbol);
      let bestSymbol = "", worstSymbol = "";
      let bestSymbolWR = 0, worstSymbolWR = 100;
      Object.keys(symbolMap).forEach(sym => {
        const data = symbolMap[sym];
        if (data.total >= minGroupSize) {
          const wr = (data.wins / data.total) * 100;
          if (wr > bestSymbolWR && data.pnl > 0) { bestSymbolWR = wr; bestSymbol = sym; }
          if (wr < worstSymbolWR && data.pnl < 0) { worstSymbolWR = wr; worstSymbol = sym; }
        }
      });
      if (bestSymbol) addInsight(`Strong Edge: ${bestSymbol} — ${bestSymbolWR.toFixed(0)}% win rate. Consider this your A+ setup.`, 'edge');
      if (worstSymbol) addInsight(`Wealth Leak: ${worstSymbol} — ${worstSymbolWR.toFixed(0)}% win rate. Reduce size or avoid entirely.`, 'risk');

      // 2. Strategy Analysis
      const strategyMap = grouped(t => t.strategy || 'Unspecified');
      let bestStrategy = "", worstStrategy = "";
      let bestStrategyWR = 0, worstStrategyWR = 100;
      Object.keys(strategyMap).forEach(strat => {
        const data = strategyMap[strat];
        if (data.total >= minGroupSize) {
          const wr = (data.wins / data.total) * 100;
          if (wr > bestStrategyWR && data.pnl > 0) { bestStrategyWR = wr; bestStrategy = strat; }
          if (wr < worstStrategyWR && data.pnl < 0) { worstStrategyWR = wr; worstStrategy = strat; }
        }
      });
      if (bestStrategy) addInsight(`Best Strategy: ${bestStrategy} wins ${bestStrategyWR.toFixed(0)}% of the time. Double down on this playbook.`, 'edge');
      if (worstStrategy) addInsight(`Worst Strategy: ${worstStrategy} wins only ${worstStrategyWR.toFixed(0)}%. Review rules before taking another.`, 'risk');

      // 3. Sub-Strategy / Playbook Analysis
      const playbookMap = grouped(t => t.sub_strategy || 'Unspecified');
      let bestPlaybook = "";
      let bestPlaybookWR = 0;
      Object.keys(playbookMap).forEach(pb => {
        const data = playbookMap[pb];
        if (data.total >= minGroupSize) {
          const wr = (data.wins / data.total) * 100;
          if (wr > bestPlaybookWR && data.pnl > 0) { bestPlaybookWR = wr; bestPlaybook = pb; }
        }
      });
      if (bestPlaybook) addInsight(`Top Playbook: ${bestPlaybook} — ${bestPlaybookWR.toFixed(0)}% win rate. Your highest-conviction model.`, 'edge');

      // 4. Directional Edge
      const longTrades = closed.filter(t => t.direction === 'Long');
      const shortTrades = closed.filter(t => t.direction === 'Short');
      const longWR = longTrades.length > 0 ? (longTrades.filter(t => t.net_pnl > 0).length / longTrades.length * 100) : 0;
      const shortWR = shortTrades.length > 0 ? (shortTrades.filter(t => t.net_pnl > 0).length / shortTrades.length * 100) : 0;
      if (longTrades.length >= 3 && shortTrades.length >= 3) {
        if (longWR > shortWR + 15) addInsight(`Long Bias: Your Long win rate (${longWR.toFixed(0)}%) significantly outperforms Shorts (${shortWR.toFixed(0)}%).`, 'edge');
        if (shortWR > longWR + 15) addInsight(`Short Bias: Your Short win rate (${shortWR.toFixed(0)}%) significantly outperforms Longs (${longWR.toFixed(0)}%).`, 'edge');
      }

      // 5. Session Analysis (with RR)
      const sessionMap = grouped(t => t.session || 'Off-Hours');
      let bestSession = "";
      let bestSessionRR = -Infinity;
      Object.keys(sessionMap).forEach(sess => {
        const data = sessionMap[sess];
        if (data.total >= minGroupSize && data.rrCount > 0) {
          const avgRR = data.rrSum / data.rrCount;
          if (avgRR > bestSessionRR && data.pnl > 0) { bestSessionRR = avgRR; bestSession = sess; }
        }
      });
      if (bestSession) addInsight(`Ideal Window: ${bestSession} gives you ${bestSessionRR.toFixed(2)}R average. Schedule focus time here.`, 'recommendation');

      // 6. Timeframe Analysis
      const tfMap = grouped(t => t.entry_timeframe || t.analysis_timeframe || 'Unspecified');
      let bestTF = "";
      let bestTFRR = -Infinity;
      Object.keys(tfMap).forEach(tf => {
        const data = tfMap[tf];
        if (data.total >= minGroupSize && data.rrCount > 0) {
          const avgRR = data.rrSum / data.rrCount;
          if (avgRR > bestTFRR && data.pnl > 0) { bestTFRR = avgRR; bestTF = tf; }
        }
      });
      if (bestTF) addInsight(`Best Timeframe: ${bestTF} entries average ${bestTFRR.toFixed(2)}R. Your sweet spot for execution.`, 'edge');

      // 7. Criteria Compliance
      const withCriteria = closed.filter(t => Array.isArray(t.criteria_checked) && t.criteria_checked.length > 0);
      if (withCriteria.length >= 5) {
        const allMet = withCriteria.filter(t => t.criteria_checked.every(c => c.checked));
        const complianceRate = (allMet.length / withCriteria.length) * 100;
        if (complianceRate < 60) addInsight(`Discipline Gap: You only meet all your criteria ${complianceRate.toFixed(0)}% of the time. Stricter checklist adherence may improve edge.`, 'risk');
        else if (complianceRate > 85) addInsight(`Discipline Strength: You meet all criteria ${complianceRate.toFixed(0)}% of the time. Keep following your process.`, 'edge');
      }

      // 8. Streak Detection
      let currentStreak = 0;
      let streakType = '';
      const sortedByDate = [...closed].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
      for (const t of sortedByDate) {
        const isWin = t.net_pnl > 0;
        if (streakType === '') { streakType = isWin ? 'win' : 'loss'; currentStreak = 1; }
        else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) { currentStreak++; }
        else { break; }
      }
      if (streakType === 'loss' && currentStreak >= 3) addInsight(`Losing Streak: ${currentStreak} consecutive losses. Step away — tilt risk is high.`, 'risk');
      if (streakType === 'win' && currentStreak >= 4) addInsight(`Hot Streak: ${currentStreak} consecutive wins. Lock profits and avoid oversized positions.`, 'behavior');

      // 9. Day of Week Analysis
      const dowPnL: Record<number, { pnl: number, count: number }> = {};
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      closed.forEach(t => {
        const day = new Date(t.trade_date).getDay();
        if (!dowPnL[day]) dowPnL[day] = { pnl: 0, count: 0 };
        dowPnL[day].pnl += t.net_pnl;
        dowPnL[day].count++;
      });
      let worstDay = -1, worstDayPnL = 0;
      Object.keys(dowPnL).forEach(d => {
        const num = parseInt(d);
        if (dowPnL[num].count >= 2 && dowPnL[num].pnl < worstDayPnL) {
          worstDayPnL = dowPnL[num].pnl;
          worstDay = num;
        }
      });
      if (worstDay >= 0) addInsight(`Avoid ${dayNames[worstDay]}s: You've lost ${blurMoney(Math.abs(worstDayPnL))} across ${dowPnL[worstDay].count} trades. Consider a no-trade day.`, 'behavior');

      // 10. Outlier Loss
      const largestLoss = Math.min(...closed.map(t => t.net_pnl));
      const avgLossAmt = losses.length > 0 ? losses.reduce((a, t) => a + Math.abs(t.net_pnl), 0) / losses.length : 0;
      if (Math.abs(largestLoss) > avgLossAmt * 2.5) {
        addInsight(`Outlier Loss: Your largest loss (${blurMoney(largestLoss)}) is ${(Math.abs(largestLoss) / (avgLossAmt || 1)).toFixed(1)}x your average. Review the trade for discipline breaks.`, 'risk');
      }

      // 11. Monthly Trend
      const monthlyPnL: Record<string, number> = {};
      closed.forEach(t => {
        const monthKey = format(new Date(t.trade_date), "MMM yyyy");
        monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + t.net_pnl;
      });
      const months = Object.keys(monthlyPnL).sort();
      if (months.length >= 2) {
        const lastMonth = months[months.length - 1];
        const prevMonth = months[months.length - 2];
        if (monthlyPnL[lastMonth] > monthlyPnL[prevMonth]) {
          addInsight(`Trending Up: ${lastMonth} (${monthlyPnL[lastMonth] > 0 ? '+' : ''}${blurMoney(monthlyPnL[lastMonth])}) outperformed ${prevMonth}.`, 'behavior');
        } else if (monthlyPnL[lastMonth] < monthlyPnL[prevMonth] && monthlyPnL[lastMonth] < 0) {
          addInsight(`Trending Down: ${lastMonth} was your worst recent month (${blurMoney(monthlyPnL[lastMonth])}). Consider a strategy review.`, 'risk');
        }
      }

      // 12. Overtrading Detection
      const dayTradeCount: Record<string, number> = {};
      closed.forEach(t => { dayTradeCount[t.trade_date] = (dayTradeCount[t.trade_date] || 0) + 1; });
      const overtradeDays = Object.entries(dayTradeCount).filter(([_, count]) => count >= 3);
      if (overtradeDays.length > 0) {
        const otPnL = overtradeDays.reduce((acc, [date]) => acc + closed.filter(t => t.trade_date === date).reduce((s, t) => s + t.net_pnl, 0), 0);
        if (otPnL < 0) addInsight(`Overtrading Alert: ${overtradeDays.length} day(s) with 3+ trades cost you ${blurMoney(otPnL)}. Quality over quantity.`, 'behavior');
      }

      // 13. R:R Capture Efficiency
      if (closed.length >= 5) {
        const plannedRRs = closed.map(t => t.weighted_avg_rr_planned).filter(v => v > 0);
        const achievedRRs = closed.map(t => t.actual_rr_achieved).filter(v => v !== 0);
        const avgPlanned = plannedRRs.length ? plannedRRs.reduce((a, b) => a + b, 0) / plannedRRs.length : 0;
        const avgAchieved = achievedRRs.length ? achievedRRs.reduce((a, b) => a + b, 0) / achievedRRs.length : 0;
        if (avgPlanned > 0 && avgAchieved < avgPlanned * 0.5) {
          addInsight(`R:R Leak: You're capturing ${avgAchieved.toFixed(2)}R on average versus ${avgPlanned.toFixed(2)}R planned. Review trade management.`, 'risk');
        }
      }
    }

    if (insights.length === 0) insights.push({ text: "Log at least 5 closed trades to unlock personalized Smart Insights. Each trade matters for your edge profile.", category: 'recommendation' });

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
        <div className="bg-primary/10 border border-primary/30 rounded-xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
          <button
            type="button"
            onClick={() => setInsightsOpen(!insightsOpen)}
            className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-primary-foreground rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">Smart Insights</h3>
            </div>
            {insightsOpen ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
          </button>

          <div className={`transition-all duration-300 ease-in-out ${insightsOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div className="px-4 md:px-5 pb-4 md:pb-5">
              {stats.insights.length === 1 && stats.insights[0].category === 'recommendation' ? (
                <p className="text-sm text-text-muted">{stats.insights[0].text}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.insights.filter(insight => insight.category !== 'recommendation').map((insight, i) => {
                    const config = {
                      edge: { icon: '🔥', border: 'border-win/30', bg: 'bg-win/5', text: 'text-win' },
                      risk: { icon: '⚠️', border: 'border-loss/30', bg: 'bg-loss/5', text: 'text-loss' },
                      behavior: { icon: '📊', border: 'border-accent/30', bg: 'bg-accent/5', text: 'text-accent' },
                      recommendation: { icon: '💡', border: 'border-primary/30', bg: 'bg-primary/5', text: 'text-primary' },
                    }[insight.category];
                    return (
                      <div key={i} className={`p-3 rounded-lg border ${config.border} ${config.bg} flex gap-3 items-start`}>
                        <span className="text-lg leading-none mt-0.5">{config.icon}</span>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>{insight.category}</span>
                          <p className="text-sm text-foreground mt-0.5 leading-snug">{insight.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Psychology Tracker */}
        <div className={`bg-gradient-to-r from-accent/5 to-transparent border border-accent/20 rounded-xl overflow-hidden transition-all duration-500 ease-in-out ${hasCheckedIn ? 'max-h-0 opacity-0 p-0 border-0' : 'max-h-[500px] opacity-100 p-4'} flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4`}>
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