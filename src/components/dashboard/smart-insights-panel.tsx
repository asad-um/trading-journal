"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

type InsightCategory = 'edge' | 'risk' | 'behavior' | 'recommendation';

interface Insight {
  text: string;
  category: InsightCategory;
}

interface SmartInsightsPanelProps {
  insights: Insight[];
}

const categoryConfig: Record<InsightCategory, { border: string; bg: string; text: string; icon: string }> = {
  edge: { border: 'border-win/30', bg: 'bg-win/5', text: 'text-win', icon: '★' },
  risk: { border: 'border-loss/30', bg: 'bg-loss/5', text: 'text-loss', icon: '⚠' },
  behavior: { border: 'border-accent/30', bg: 'bg-accent/5', text: 'text-accent', icon: '⧗' },
  recommendation: { border: 'border-primary/30', bg: 'bg-primary/5', text: 'text-primary', icon: '➤' },
};

export function SmartInsightsPanel({ insights }: SmartInsightsPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-500">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary text-primary-foreground rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">Smart Insights</h3>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-text-muted" /> : <ChevronDown className="h-5 w-5 text-text-muted" />}
      </button>

      <div className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-4 md:px-5 pb-4 md:pb-5">
          {insights.length === 1 && insights[0].category === 'recommendation' ? (
            <p className="text-sm text-text-muted">{insights[0].text}</p>
          ) : (
            <div className="grid gap-3">
              {insights.map((insight, i) => {
                const config = categoryConfig[insight.category];
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
  );
}
