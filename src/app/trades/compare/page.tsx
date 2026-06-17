"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/types";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { usePrivacy } from "@/components/privacy-provider";

function CompareField({ label, values }: { label: string; values: (string | number | null | undefined)[] }) {
  const allSame = values.every(v => String(v ?? '—') === String(values[0] ?? '—'));

  return (
    <div className="contents">
      <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center border-b border-border/40">
        {label}
      </div>
      {values.map((v, i) => {
        const display = v !== null && v !== undefined && v !== '' ? String(v) : '—';
        return (
          <div
            key={i}
            className={`py-2.5 px-3 text-sm border-b border-border/40 flex items-center ${!allSame ? 'font-semibold' : ''}`}
          >
            {display}
          </div>
        );
      })}
    </div>
  );
}

function ComparePnLField({ label, values }: { label: string; values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="contents">
      <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center border-b border-border/40">
        {label}
      </div>
      {values.map((v, i) => {
        const isBest = v === max && max !== min;
        const isWorst = v === min && max !== min;
        return (
          <div
            key={i}
            className={`py-2.5 px-3 text-sm font-mono font-bold border-b border-border/40 flex items-center gap-1.5
              ${isBest ? 'text-win' : isWorst ? 'text-loss' : 'text-foreground'}`}
          >
            {isBest && <TrendingUp className="h-3.5 w-3.5 shrink-0" />}
            {isWorst && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            {!isBest && !isWorst && <Minus className="h-3.5 w-3.5 shrink-0 text-text-muted" />}
            {v > 0 ? '+' : ''}{v.toFixed(2)}
          </div>
        );
      })}
    </div>
  );
}

function CompareRRField({ label, values }: { label: string; values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="contents">
      <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center border-b border-border/40">
        {label}
      </div>
      {values.map((v, i) => {
        const isBest = v === max && max !== min;
        const isWorst = v === min && max !== min;
        return (
          <div
            key={i}
            className={`py-2.5 px-3 text-sm font-mono font-bold border-b border-border/40 flex items-center gap-1.5
              ${isBest ? 'text-win' : isWorst ? 'text-loss' : 'text-foreground'}`}
          >
            {isBest && <TrendingUp className="h-3.5 w-3.5 shrink-0" />}
            {isWorst && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            {!isBest && !isWorst && <Minus className="h-3.5 w-3.5 shrink-0 text-text-muted" />}
            {v.toFixed(2)}R
          </div>
        );
      })}
    </div>
  );
}

function CompareBoolField({ label, values }: { label: string; values: (boolean | null | undefined)[] }) {
  return (
    <div className="contents">
      <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center border-b border-border/40">
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className={`py-2.5 px-3 text-sm font-semibold border-b border-border/40 flex items-center ${v === true ? 'text-win' : v === false ? 'text-loss' : 'text-text-muted'}`}>
          {v === true ? '✓ Yes' : v === false ? '✗ No' : '—'}
        </div>
      ))}
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { blurMoney } = usePrivacy();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 3);

  useEffect(() => {
    if (ids.length < 2) {
      setError("Select at least 2 trades to compare.");
      setIsLoading(false);
      return;
    }

    async function fetchTrades() {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .in("id", ids);

      if (error) { setError(error.message); }
      else if (data) {
        // Preserve the order from the URL
        const ordered = ids.map(id => data.find(t => t.id === id)).filter(Boolean) as Trade[];
        setTrades(ordered);
      }
      setIsLoading(false);
    }

    fetchTrades();
  }, []);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  if (error || trades.length < 2) return (
    <div className="text-center py-20 text-text-muted">
      <p className="text-lg font-semibold">{error || "Not enough trades to compare."}</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
    </div>
  );

  const n = trades.length;

  // Grid columns: label col + n trade cols
  const gridCols = n === 2 ? "grid-cols-[180px_1fr_1fr]" : "grid-cols-[180px_1fr_1fr_1fr]";

  const getStatusColor = (status: string) => {
    if (status.includes("Win")) return "text-win border-win/30 bg-win/10";
    if (status.includes("Loss")) return "text-loss border-loss/30 bg-loss/10";
    if (status === "Breakeven") return "text-breakeven border-breakeven/30 bg-breakeven/10";
    return "text-text-muted border-border bg-background-secondary";
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Trade Comparison</h1>
          <p className="text-text-muted text-sm">Comparing {n} trades side-by-side. <span className="text-primary">Green</span> = better, <span className="text-loss">Red</span> = worse.</p>
        </div>
      </div>

      {/* Trade Header Cards */}
      <div className={`grid gap-3 ${n === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {trades.map((t, i) => (
          <div key={t.id} className="p-4 bg-background-secondary border border-border rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted font-mono">Trade #{i + 1}</span>
              <Badge variant="outline" className={getStatusColor(t.status)}>{t.status}</Badge>
            </div>
            <p className="font-bold text-lg">{t.symbol}</p>
            <p className="text-sm text-text-muted">{format(new Date(t.trade_date), "MMM dd, yyyy")} · {t.direction}</p>
            <p className={`font-mono font-bold text-xl mt-2 ${t.net_pnl > 0 ? 'text-win' : t.net_pnl < 0 ? 'text-loss' : ''}`}>
              {t.net_pnl > 0 ? '+' : ''}{blurMoney(t.net_pnl)}
            </p>
            <Link href={`/trades/${t.id}`} className="text-xs text-primary hover:underline mt-1 block">View full trade →</Link>
          </div>
        ))}
      </div>

      {/* Comparison Grid */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Section: Setup */}
        <div className={`grid ${gridCols} bg-primary/5 border-b border-border`}>
          <div className="py-2 px-3 text-xs font-bold text-primary uppercase tracking-wider col-span-full border-b border-border/40">
            📋 Setup Details
          </div>
          <CompareField label="Date" values={trades.map(t => format(new Date(t.trade_date), "MMM dd, yyyy"))} />
          <CompareField label="Symbol" values={trades.map(t => t.symbol)} />
          <CompareField label="Direction" values={trades.map(t => t.direction)} />
          <CompareField label="Session" values={trades.map(t => t.session)} />
          <CompareField label="Strategy" values={trades.map(t => t.strategy || t.schematic || '—')} />
          <CompareField label="Playbook" values={trades.map(t => t.sub_strategy || t.entry_event || '—')} />
          <CompareField label="HTF Bias" values={trades.map(t => t.highest_timeframe || '—')} />
          <CompareField label="Entry TF" values={trades.map(t => t.entry_timeframe || '—')} />
          <CompareField label="Market Regime" values={trades.map(t => (t as any).market_regime || '—')} />
        </div>

        {/* Section: Risk */}
        <div className={`grid ${gridCols} bg-background`}>
          <div className="py-2 px-3 text-xs font-bold text-primary uppercase tracking-wider col-span-full border-b border-border/40 bg-primary/5">
            ⚖️ Risk & Execution
          </div>
          <CompareField label="Entry Price" values={trades.map(t => t.entry_price)} />
          <CompareField label="Stop Loss" values={trades.map(t => t.stop_loss_price)} />
          <CompareField label="Risk %" values={trades.map(t => `${t.risk_percentage?.toFixed(2)}%`)} />
          <CompareField label="Risk Amount" values={trades.map(t => blurMoney(t.risk_amount_usd))} />
          <CompareRRField label="Planned RR" values={trades.map(t => t.weighted_avg_rr_planned || 0)} />
          <CompareRRField label="Achieved RR" values={trades.map(t => t.actual_rr_achieved || 0)} />
          <CompareField label="Exit Type" values={trades.map(t => (t as any).exit_type || '—')} />
        </div>

        {/* Section: Outcome */}
        <div className={`grid ${gridCols} bg-background`}>
          <div className="py-2 px-3 text-xs font-bold text-primary uppercase tracking-wider col-span-full border-b border-border/40 bg-primary/5">
            📊 Outcome
          </div>
          <ComparePnLField label="Net PnL" values={trades.map(t => t.net_pnl)} />
          <CompareField label="Status" values={trades.map(t => t.status)} />
          <CompareField label="Confidence" values={trades.map(t => t.confidence_level ? `${t.confidence_level}/10` : '—')} />
          <CompareBoolField label="Plan Followed" values={trades.map(t => t.plan_followed ?? null)} />
          <CompareBoolField label="Would Take Again" values={trades.map(t => t.would_take_again ?? null)} />
          <CompareField label="Mistake" values={trades.map(t => t.mistake_category || '—')} />
        </div>

        {/* Section: Criteria */}
        <div className={`grid ${gridCols} bg-background`}>
          <div className="py-2 px-3 text-xs font-bold text-primary uppercase tracking-wider col-span-full border-b border-border/40 bg-primary/5">
            ✅ Criteria Compliance
          </div>
          {trades.map((t, i) => {
            const total = t.criteria_checked?.length || 0;
            const met = t.criteria_checked?.filter(c => c.checked).length || 0;
            const pct = total > 0 ? Math.round((met / total) * 100) : null;
            return (
              <div key={i} className={`py-2.5 px-3 text-sm border-b border-border/40 ${i === 0 ? 'col-start-2' : ''}`}>
                {pct !== null ? (
                  <span className={`font-bold ${pct >= 80 ? 'text-win' : pct >= 50 ? 'text-breakeven' : 'text-loss'}`}>
                    {met}/{total} ({pct}%)
                  </span>
                ) : <span className="text-text-muted">—</span>}
              </div>
            );
          })}
          {/* Spacer for label col */}
          <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center border-b border-border/40 row-start-2">
            Criteria Met
          </div>
        </div>

        {/* Section: Notes */}
        <div className={`grid ${gridCols} bg-background`}>
          <div className="py-2 px-3 text-xs font-bold text-primary uppercase tracking-wider col-span-full border-b border-border/40 bg-primary/5">
            📝 Notes & Lessons
          </div>
          <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-start border-b border-border/40">
            Pre-Trade Reasoning
          </div>
          {trades.map((t, i) => (
            <div key={i} className="py-2.5 px-3 text-sm border-b border-border/40 text-text-muted leading-relaxed">
              {t.pre_trade_reasoning || <span className="italic text-text-muted/50">No notes</span>}
            </div>
          ))}
          <div className="py-2.5 px-3 bg-background-secondary/50 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-start border-b border-border/40">
            Post-Trade Lesson
          </div>
          {trades.map((t, i) => (
            <div key={i} className="py-2.5 px-3 text-sm border-b border-border/40 text-text-muted leading-relaxed">
              {t.post_trade_lesson || <span className="italic text-text-muted/50">No lesson logged</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
        <CompareContent />
      </Suspense>
    </AppLayout>
  );
}
