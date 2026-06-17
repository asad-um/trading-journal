"use client";

import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, Profile, DailyCheckin } from "@/types";
import { calculateFloatingPnL, calculateWinRate, calculateProfitFactor } from "@/lib/calculations";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { SmartInsightsPanel } from "@/components/dashboard/smart-insights-panel";
import { PsychologicalMetricsPanel } from "@/components/dashboard/psychological-metrics-panel";
import { MentalEdgeCheckIn } from "@/components/dashboard/mental-edge-checkin";
import { CumulativePnlChart } from "@/components/dashboard/cumulative-pnl-chart";
import { VolumeTrackerChart } from "@/components/dashboard/volume-tracker-chart";
import { TradeTabs } from "@/components/dashboard/trade-tabs";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [moodScore, setMoodScore] = useState(3);
  const [disciplineScore, setDisciplineScore] = useState(3);
  const [avgMood, setAvgMood] = useState(0);
  const [avgDiscipline, setAvgDiscipline] = useState(0);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [gamification, setGamification] = useState<{ xp: number; level: number; title: string; badges: string[] } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData(silent: boolean = false) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: activePorts } = await supabase.from('portfolios').select('*').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePort = activePorts?.[0];

      if (!activePort) {
        setProfile(null);
        setTrades([]);
        setIsLoading(false);
        return;
      }

      const { data: tradesRes } = await supabase.from("trades").select("*").eq("portfolio_id", activePort.id).order("trade_date", { ascending: true });

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: checkinRes } = await supabase.from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();

      const { data: recentCheckins } = await supabase.from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checkin_date', thirtyDaysAgo)
        .order('checkin_date', { ascending: false });

      if (recentCheckins) {
        setCheckins(recentCheckins);
        const avgM = recentCheckins.reduce((acc, c) => acc + (c.mood_score || 0), 0) / (recentCheckins.length || 1);
        const avgD = recentCheckins.reduce((acc, c) => acc + (c.discipline_score || 0), 0) / (recentCheckins.length || 1);
        setAvgMood(avgM);
        setAvgDiscipline(avgD);
      }

      const { data: gamificationRes } = await supabase.from('user_gamification')
        .select('xp, level, badges')
        .eq('user_id', user.id)
        .maybeSingle();
      if (gamificationRes) {
        const title = ["Novice", "Apprentice", "Trader", "Senior Trader", "Elite", "Master", "Legend"][Math.min(Math.max(gamificationRes.level - 1, 0), 6)];
        setGamification({ xp: gamificationRes.xp, level: gamificationRes.level, title, badges: gamificationRes.badges || [] });
      }

      if (checkinRes) {
        setHasCheckedIn(true);
        setMoodScore(checkinRes.mood_score || 3);
        setDisciplineScore(checkinRes.discipline_score || 3);
      }

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

  function levelFromXp(xp: number): number {
    let level = 1;
    while (xp >= Math.round(100 * Math.pow(level, 1.6)) && level < 7) level++;
    return level;
  }

  const handleDailyCheckin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

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

    const { onDailyCheckin } = await import('@/lib/gamification');
    onDailyCheckin(user.id).then(update => {
      if (update) {
        const title = ["Novice", "Apprentice", "Trader", "Senior Trader", "Elite", "Master", "Legend"][Math.min(Math.max(update.levelUp?.new || levelFromXp(update.xp) - 1, 0), 6)];
        setGamification(prev => ({ xp: update.xp, level: update.levelUp?.new || prev?.level || levelFromXp(update.xp), title, badges: Object.keys(update.questsCompleted) }));
        if (update.levelUp) toast({ title: "Level Up!", description: `You reached ${title} (Level ${update.levelUp.new})` });
      }
    }).catch(console.error);

    if (moodScore <= 2 && disciplineScore <= 2) {
      toast({ title: "Tilt Warning", description: "Low mood and discipline detected. Statistically, you are at high risk of forced errors today. Trade small or step away.", variant: "destructive", duration: 10000 });
    } else {
      toast({ title: "Checked In", description: "Have a great trading session." });
    }
  };

  const psychMetrics = useMemo(() => {
    if (!profile) return null;

    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(t.status));
    const recentCheckins = checkins.slice(0, 14);

    const withCriteria = closed.filter(t => Array.isArray(t.criteria_checked) && t.criteria_checked.length > 0);
    const complianceRate = withCriteria.length > 0
      ? withCriteria.filter(t => t.criteria_checked.every(c => c.checked)).length / withCriteria.length
      : 0;

    const dayTradeCount: Record<string, number> = {};
    closed.forEach(t => { dayTradeCount[t.trade_date] = (dayTradeCount[t.trade_date] || 0) + 1; });
    const overtradeDays = Object.entries(dayTradeCount).filter(([_, count]) => count >= 3);
    const overtradePenalty = overtradeDays.length > 0 ? Math.min(overtradeDays.length * 0.1, 0.3) : 0;
    const disciplineScore = Math.round(Math.max(0, Math.min(100, complianceRate * 100 * (1 - overtradePenalty))));

    const moodScores = recentCheckins.map(c => c.mood_score).filter(Boolean);
    const mean = moodScores.length ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 0;
    const variance = moodScores.length
      ? moodScores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / moodScores.length
      : 0;
    const emotionalVariance = (variance < 0.5 ? 'Low' : variance < 1.2 ? 'Medium' : 'High') as 'Low' | 'Medium' | 'High';
    const emotionalStability = variance < 0.5 ? 'stable' : variance < 1.2 ? 'moderate' : 'volatile';

    const sortedByDate = [...closed].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
    let currentLossStreak = 0;
    for (const t of sortedByDate) {
      if (t.net_pnl < 0) currentLossStreak++;
      else break;
    }
    const recentTradesToday = sortedByDate.filter(t => t.trade_date === new Date().toISOString().split('T')[0]).length;
    const revengeRisk = (currentLossStreak >= 3 && recentTradesToday >= 2
      ? 'High'
      : currentLossStreak >= 2
        ? 'Medium'
        : currentLossStreak >= 1
          ? 'Low'
          : 'None') as 'None' | 'Low' | 'Medium' | 'High';

    const todayCheckin = checkins.find(c => c.checkin_date === new Date().toISOString().split('T')[0]);
    const moodFactor = todayCheckin ? todayCheckin.mood_score / 5 : 1;
    const disciplineFactor = todayCheckin ? todayCheckin.discipline_score / 5 : 1;
    const baseRisk = profile.default_risk_percentage || 1;
    const optimalTradeSize = baseRisk * moodFactor * disciplineFactor;

    let recommendation = 'Follow your plan and trade your edge.';
    if (revengeRisk === 'High') recommendation = 'Step away. You are at high tilt risk after consecutive losses.';
    else if (disciplineScore < 50) recommendation = 'Focus on checklist discipline before taking new trades.';
    else if (emotionalVariance === 'High') recommendation = 'Your mood has been volatile — consider journaling before trading.';
    else if (currentLossStreak >= 2) recommendation = 'Take only A+ setups and reduce position size until momentum returns.';
    else if (disciplineScore > 85 && moodFactor >= 0.8) recommendation = 'Conditions look good — execute your plan with confidence.';

    return {
      disciplineScore,
      emotionalVariance,
      emotionalStability,
      revengeRisk,
      currentLossStreak,
      optimalTradeSize,
      recommendation,
    };
  }, [profile, trades, checkins]);

  const stats = useMemo(() => {
    if (!profile) return null;

    const floatingPnL = calculateFloatingPnL(trades);
    const winRateData = calculateWinRate(trades);
    const profitFactor = calculateProfitFactor(trades);

    const closed = trades.filter(t => ['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(t.status));
    const totalClosedPnL = closed.reduce((acc, t) => acc + t.net_pnl, 0);

    const wins = closed.filter(t => t.net_pnl > 0);
    const losses = closed.filter(t => t.net_pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + t.net_pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + t.net_pnl, 0) / losses.length : 0;

    const baseForMath = profile.starting_balance > 0 ? profile.starting_balance : (profile.current_balance > 0 ? profile.current_balance : 1);
    const avgWinPercent = (avgWin / baseForMath) * 100;
    const avgLossPercent = (avgLoss / baseForMath) * 100;

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

    const volumeData = Object.keys(dailyVolumeMap).map(date => ({
      date,
      trades: dailyVolumeMap[date]
    }));

    const recentTrades = [...trades].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()).slice(0, 5);
    const openPositions = trades.filter(t => t.status === 'Open');

    type InsightCategory = 'edge' | 'risk' | 'behavior' | 'recommendation';
    interface Insight { text: string; category: InsightCategory; }
    const insights: Insight[] = [];
    const addInsight = (text: string, category: InsightCategory) => { if (text) insights.push({ text, category }); };

    if (closed.length >= 5) {
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

      const longTrades = closed.filter(t => t.direction === 'Long');
      const shortTrades = closed.filter(t => t.direction === 'Short');
      const longWR = longTrades.length > 0 ? (longTrades.filter(t => t.net_pnl > 0).length / longTrades.length * 100) : 0;
      const shortWR = shortTrades.length > 0 ? (shortTrades.filter(t => t.net_pnl > 0).length / shortTrades.length * 100) : 0;
      if (longTrades.length >= 3 && shortTrades.length >= 3) {
        if (longWR > shortWR + 15) addInsight(`Long Bias: Your Long win rate (${longWR.toFixed(0)}%) significantly outperforms Shorts (${shortWR.toFixed(0)}%).`, 'edge');
        if (shortWR > longWR + 15) addInsight(`Short Bias: Your Short win rate (${shortWR.toFixed(0)}%) significantly outperforms Longs (${longWR.toFixed(0)}%).`, 'edge');
      }

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

      const withCriteria = closed.filter(t => Array.isArray(t.criteria_checked) && t.criteria_checked.length > 0);
      if (withCriteria.length >= 5) {
        const allMet = withCriteria.filter(t => t.criteria_checked.every(c => c.checked));
        const complianceRate = (allMet.length / withCriteria.length) * 100;
        if (complianceRate < 60) addInsight(`Discipline Gap: You only meet all your criteria ${complianceRate.toFixed(0)}% of the time. Stricter checklist adherence may improve edge.`, 'risk');
        else if (complianceRate > 85) addInsight(`Discipline Strength: You meet all criteria ${complianceRate.toFixed(0)}% of the time. Keep following your process.`, 'edge');
      }

      const sortedByDateDesc = [...closed].sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
      let currentStreak = 0;
      for (const t of sortedByDateDesc) {
        if (t.net_pnl > 0) currentStreak++;
        else break;
      }
      if (currentStreak >= 3) addInsight(`Win Streak: ${currentStreak} consecutive wins. Stay process-oriented and avoid overconfidence.`, 'behavior');
      let lossStreak = 0;
      for (const t of sortedByDateDesc) {
        if (t.net_pnl < 0) lossStreak++;
        else break;
      }
      if (lossStreak >= 3) addInsight(`Loss Streak: ${lossStreak} consecutive losses. Reduce size and return to your highest-conviction setup only.`, 'risk');

      const monthlyPnL: Record<string, number> = {};
      closed.forEach(t => {
        const month = format(new Date(t.trade_date), 'MMM yyyy');
        monthlyPnL[month] = (monthlyPnL[month] || 0) + t.net_pnl;
      });
      const months = Object.keys(monthlyPnL).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (months.length >= 2) {
        const lastMonth = months[months.length - 1];
        const prevMonth = months[months.length - 2];
        if (monthlyPnL[lastMonth] > monthlyPnL[prevMonth] && monthlyPnL[lastMonth] > 0) {
          addInsight(`Trending Up: ${lastMonth} was your best recent month (${monthlyPnL[lastMonth].toFixed(0)}). Keep doing what's working.`, 'behavior');
        } else if (monthlyPnL[lastMonth] < monthlyPnL[prevMonth] && monthlyPnL[lastMonth] < 0) {
          addInsight(`Trending Down: ${lastMonth} was your worst recent month (${monthlyPnL[lastMonth].toFixed(0)}). Consider a strategy review.`, 'risk');
        }
      }

      const dayTradeCount: Record<string, number> = {};
      closed.forEach(t => { dayTradeCount[t.trade_date] = (dayTradeCount[t.trade_date] || 0) + 1; });
      const overtradeDays = Object.entries(dayTradeCount).filter(([_, count]) => count >= 3);
      if (overtradeDays.length > 0) {
        const otPnL = overtradeDays.reduce((acc, [date]) => acc + closed.filter(t => t.trade_date === date).reduce((s, t) => s + t.net_pnl, 0), 0);
        if (otPnL < 0) addInsight(`Overtrading Alert: ${overtradeDays.length} day(s) with 3+ trades cost you ${otPnL.toFixed(2)}. Quality over quantity.`, 'behavior');
      }

      if (closed.length >= 5) {
        const plannedRRs = closed.map(t => t.weighted_avg_rr_planned).filter(v => v > 0);
        const achievedRRs = closed.map(t => t.actual_rr_achieved).filter(v => v !== 0);
        const avgPlanned = plannedRRs.length ? plannedRRs.reduce((a, b) => a + b, 0) / plannedRRs.length : 0;
        const avgAchieved = achievedRRs.length ? achievedRRs.reduce((a, b) => a + b, 0) / achievedRRs.length : 0;
        if (avgPlanned > 0 && avgAchieved < avgPlanned * 0.5) {
          addInsight(`R:R Leak: You're capturing ${avgAchieved.toFixed(2)}R on average versus ${avgPlanned.toFixed(2)}R planned. Review trade management.`, 'risk');
        }

        // Avg Win vs Avg Loss ratio
        const wins = closed.filter(t => t.net_pnl > 0);
        const losses = closed.filter(t => t.net_pnl < 0);
        if (wins.length >= 3 && losses.length >= 3) {
          const avgWinAmt = wins.reduce((a, t) => a + t.net_pnl, 0) / wins.length;
          const avgLossAmt = Math.abs(losses.reduce((a, t) => a + t.net_pnl, 0) / losses.length);
          const ratio = avgLossAmt > 0 ? avgWinAmt / avgLossAmt : 0;
          if (ratio < 0.8) addInsight(`Win/Loss Imbalance: Your avg win (${avgWinAmt.toFixed(0)}) is smaller than your avg loss (${avgLossAmt.toFixed(0)}). Tighten stops or let winners run longer.`, 'risk');
          else if (ratio > 2) addInsight(`Strong Payoff Ratio: Your avg win is ${ratio.toFixed(1)}× your avg loss. Excellent trade management.`, 'edge');
        }

        // Exit type analysis — are SL exits costing more than TP exits earn?
        const slExits = closed.filter((t: any) => t.exit_type === 'Stop Loss' || t.sl_hit);
        const tpExits = closed.filter((t: any) => t.exit_type === 'Final TP' || (!t.exit_type && !t.sl_hit && t.net_pnl > 0));
        if (slExits.length >= 3 && tpExits.length >= 3) {
          const slAvg = slExits.reduce((a, t) => a + t.net_pnl, 0) / slExits.length;
          const tpAvg = tpExits.reduce((a, t) => a + t.net_pnl, 0) / tpExits.length;
          if (Math.abs(slAvg) > tpAvg * 1.5) addInsight(`SL Cost Alert: Your average SL loss (${slAvg.toFixed(0)}) is >1.5× your average TP gain (${tpAvg.toFixed(0)}). Consider tighter risk management.`, 'risk');
        }

        // Breakeven exits — are you leaving money on the table?
        const beExits = closed.filter((t: any) => t.exit_type === 'Breakeven' || t.status === 'Breakeven');
        if (beExits.length >= 3) {
          const beRate = (beExits.length / closed.length) * 100;
          if (beRate > 25) addInsight(`Breakeven Habit: ${beRate.toFixed(0)}% of your trades close at breakeven. You may be moving SL too early — let trades breathe.`, 'behavior');
        }
      }

      // Market regime analysis
      if (closed.length >= 5) {
        const regimeMap: Record<string, { wins: number; total: number }> = {};
        closed.forEach(t => {
          const r = (t as any).market_regime || 'Unknown';
          if (!regimeMap[r]) regimeMap[r] = { wins: 0, total: 0 };
          regimeMap[r].total++;
          if (t.net_pnl > 0) regimeMap[r].wins++;
        });
        let bestRegime = '', bestRegimeWR = 0, worstRegime = '', worstRegimeWR = 100;
        Object.entries(regimeMap).forEach(([r, d]) => {
          if (d.total >= 2) {
            const wr = (d.wins / d.total) * 100;
            if (wr > bestRegimeWR) { bestRegimeWR = wr; bestRegime = r; }
            if (wr < worstRegimeWR) { worstRegimeWR = wr; worstRegime = r; }
          }
        });
        if (bestRegime && bestRegimeWR >= 60) addInsight(`Best Regime: You win ${bestRegimeWR.toFixed(0)}% in ${bestRegime} markets. Prioritize these conditions.`, 'edge');
        if (worstRegime && worstRegimeWR <= 35 && worstRegime !== bestRegime) addInsight(`Avoid ${worstRegime}: Only ${worstRegimeWR.toFixed(0)}% win rate. Sit out or reduce size in these conditions.`, 'risk');
      }

      // Best day of week
      if (closed.length >= 7) {
        const dayMap: Record<string, { wins: number; total: number; pnl: number }> = {};
        closed.forEach(t => {
          const day = format(new Date(t.trade_date), 'EEEE');
          if (!dayMap[day]) dayMap[day] = { wins: 0, total: 0, pnl: 0 };
          dayMap[day].total++;
          if (t.net_pnl > 0) dayMap[day].wins++;
          dayMap[day].pnl += t.net_pnl;
        });
        let bestDay = '', bestDayWR = 0, worstDay = '', worstDayPnL = 0;
        Object.entries(dayMap).forEach(([day, d]) => {
          if (d.total >= 2) {
            const wr = (d.wins / d.total) * 100;
            if (wr > bestDayWR) { bestDayWR = wr; bestDay = day; }
            if (d.pnl < worstDayPnL) { worstDayPnL = d.pnl; worstDay = day; }
          }
        });
        if (bestDay && bestDayWR >= 65) addInsight(`Best Day: ${bestDay} is your strongest trading day (${bestDayWR.toFixed(0)}% win rate). Prioritize high-quality setups on this day.`, 'recommendation');
        if (worstDay && worstDayPnL < 0) addInsight(`Worst Day: ${worstDay} is consistently unprofitable. Consider reducing size or skipping trades on this day.`, 'behavior');
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
  }, [profile, trades]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  if (!profile || !stats || !psychMetrics) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-6 text-center">
          <h2 className="text-2xl font-bold text-loss">Profile Data Missing</h2>
          <p className="text-text-muted max-w-md">Your authentication was successful, but we couldn't find your profile data.</p>
          <Button variant="outline" onClick={() => window.location.href = '/login'}>Go Back to Login</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500 pb-20">
        <DashboardHeader title="Overview" gamification={gamification} />
        <KpiCards profile={profile} stats={stats} />
        <SmartInsightsPanel insights={stats.insights} />
        <PsychologicalMetricsPanel metrics={psychMetrics} />
        <MentalEdgeCheckIn
          hasCheckedIn={hasCheckedIn}
          avgMood={avgMood}
          avgDiscipline={avgDiscipline}
          moodScore={moodScore}
          disciplineScore={disciplineScore}
          onMoodChange={setMoodScore}
          onDisciplineChange={setDisciplineScore}
          onCheckIn={handleDailyCheckin}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CumulativePnlChart data={stats.cumulativePnlData} />
          <VolumeTrackerChart data={stats.volumeData} />
        </div>

        <div className="bg-card rounded-xl border shadow-sm">
          <TradeTabs recentTrades={stats.recentTrades} openPositions={stats.openPositions} />
        </div>
      </div>
    </AppLayout>
  );
}
