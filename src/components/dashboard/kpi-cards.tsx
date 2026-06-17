"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Target, Activity, Hash, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
import { usePrivacy } from "@/components/privacy-provider";
import { Profile } from "@/types";

interface KpiStats {
  floatingPnL: number;
  winRateData: { winRate: number; wins: number; losses: number; breakevens: number; total: number };
  profitFactor: number;
  totalClosedPnL: number;
  avgWinPercent: number;
  avgLossPercent: number;
}

interface KpiCardsProps {
  profile: Profile;
  stats: KpiStats;
}

export function KpiCards({ profile, stats }: KpiCardsProps) {
  const { blurMoney } = usePrivacy();

  return (
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
              <p className="text-sm font-medium text-text-muted flex items-center">Win Rate <InfoTooltip text="Percentage of closed trades that were profitable." /></p>
              <p className={`text-2xl font-bold ${stats.winRateData.winRate >= 55 ? "text-win" : stats.winRateData.winRate >= 40 ? "text-breakeven" : "text-loss"}`}>
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
            Total Trades: {stats.winRateData.total}
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

      <Card className="hover:border-accent/30 transition-colors">
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-muted flex items-center gap-1">
                Net P&L <InfoTooltip text="Total realized profit/loss from closed trades." />
              </p>
              <p className={`text-2xl font-bold ${stats.totalClosedPnL > 0 ? "text-win" : stats.totalClosedPnL < 0 ? "text-loss" : ""}`}>
                {stats.totalClosedPnL > 0 ? "+" : ""}{blurMoney(stats.totalClosedPnL)}
              </p>
            </div>
            <div className={`p-2 rounded-md ${stats.totalClosedPnL >= 0 ? "bg-win/10" : "bg-loss/10"}`}>
              {stats.totalClosedPnL >= 0 ? <ArrowUpRight className="h-4 w-4 text-win" /> : <ArrowDownRight className="h-4 w-4 text-loss" />}
            </div>
          </div>
          <div className="mt-4 text-xs text-text-muted flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Closed trades only</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
