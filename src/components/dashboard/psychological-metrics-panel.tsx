"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Activity, ChevronUp, ChevronDown } from "lucide-react";

interface PsychologicalMetrics {
  disciplineScore: number;
  emotionalVariance: 'Low' | 'Medium' | 'High';
  emotionalStability: string;
  revengeRisk: 'None' | 'Low' | 'Medium' | 'High';
  currentLossStreak: number;
  optimalTradeSize: number;
  recommendation: string;
}

interface PsychologicalMetricsPanelProps {
  metrics: PsychologicalMetrics;
}

export function PsychologicalMetricsPanel({ metrics }: PsychologicalMetricsPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="border-accent/30 bg-accent/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <span className="text-base md:text-lg font-semibold text-foreground">Psychological Metrics</span>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
      </button>

      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-background-secondary border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Discipline Score</p>
              <div className="flex items-end gap-2 mt-1">
                <span className={`text-2xl font-bold ${metrics.disciplineScore >= 70 ? 'text-win' : metrics.disciplineScore >= 40 ? 'text-breakeven' : 'text-loss'}`}>
                  {metrics.disciplineScore}/100
                </span>
                {metrics.disciplineScore >= 70 ? <span className="text-xs text-win mb-1">↑</span> : metrics.disciplineScore < 50 ? <span className="text-xs text-loss mb-1">↓</span> : null}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background-secondary border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Emotional Variance</p>
              <div className="flex items-end gap-2 mt-1">
                <span className={`text-2xl font-bold ${metrics.emotionalVariance === 'Low' ? 'text-win' : metrics.emotionalVariance === 'Medium' ? 'text-breakeven' : 'text-loss'}`}>
                  {metrics.emotionalVariance}
                </span>
                <span className="text-xs text-text-muted mb-1">({metrics.emotionalStability})</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background-secondary border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Revenge Trade Risk</p>
              <div className="flex items-end gap-2 mt-1">
                <span className={`text-2xl font-bold ${metrics.revengeRisk === 'None' ? 'text-win' : metrics.revengeRisk === 'Low' ? 'text-breakeven' : metrics.revengeRisk === 'Medium' ? 'text-orange-400' : 'text-loss'}`}>
                  {metrics.revengeRisk}
                </span>
                {metrics.currentLossStreak > 0 && <span className="text-xs text-text-muted mb-1">{metrics.currentLossStreak} losses</span>}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background-secondary border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Optimal Trade Size</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-2xl font-bold text-primary">{metrics.optimalTradeSize.toFixed(2)}%</span>
                <span className="text-xs text-text-muted mb-1">risk</span>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Recommendation</p>
            <p className="text-sm text-foreground">{metrics.recommendation}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
