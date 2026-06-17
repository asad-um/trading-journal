/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade, TPLevel } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DOMPurify from "dompurify";
import { usePrivacy } from "@/components/privacy-provider";

export default function TradeDetailPage({ params }: { params: { id: string } }) {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    async function fetchTrade() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      
      const { data } = await supabase.from("trades").select("*").eq("id", params.id).eq("user_id", user.id).single();
      if (data) setTrade(data);
      setIsLoading(false);
    }
    fetchTrade();
  }, [params.id]);

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;
  if (!trade) return <AppLayout><div className="p-6">Trade not found.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
        <div className="flex justify-between items-center pr-12 md:pr-0">
          <div className="flex items-center gap-4">
            <Link href="/trades"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {trade.symbol} 
              <Badge variant="outline" className={trade.direction === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{trade.direction}</Badge>
              <Badge variant="outline" className="bg-background-tertiary">{trade.status}</Badge>
            </h1>
          </div>
          <Link href={`/trades/${trade.id}/edit`} className="shrink-0">
            <Button variant="outline" size="sm" className="md:size-default"><Edit className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Edit Trade</span></Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Trade Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-sm text-text-muted">Date</p><p className="font-medium">{format(new Date(trade.trade_date), "MMM dd, yyyy")}</p></div>
              <div><p className="text-sm text-text-muted">Session</p><p className="font-medium">{trade.session}</p></div>
              <div><p className="text-sm text-text-muted">Entry Price</p><p className="font-mono">{trade.entry_price}</p></div>
              <div><p className="text-sm text-text-muted">Stop Loss</p><p className="font-mono">{trade.stop_loss_price}</p></div>
              <div><p className="text-sm text-text-muted">Risk %</p><p className="font-medium">{trade.risk_percentage}%</p></div>
              <div><p className="text-sm text-text-muted">Risk $</p><p className="font-mono">{blurMoney(trade.risk_amount_usd)}</p></div>
              <div><p className="text-sm text-text-muted">Net P&L</p><p className={`font-mono font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>{trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}</p></div>
              <div><p className="text-sm text-text-muted">Actual RR</p><p className="font-mono">{trade.actual_rr_achieved?.toFixed(2)}R</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Setup Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-sm text-text-muted">Strategy</p><p className="font-medium">{trade.strategy || trade.schematic}</p></div>
              <div><p className="text-sm text-text-muted">Sub-Strategy / Trigger</p><p className="font-medium">{trade.sub_strategy || trade.entry_event}</p></div>
              <div><p className="text-sm text-text-muted">Timeframes (HTF / LTF)</p><p className="font-medium">{trade.analysis_timeframe} / {trade.entry_timeframe}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Trade Screenshots Section */}
        {((trade.pre_trade_images && trade.pre_trade_images.length > 0) || (trade.post_trade_images && trade.post_trade_images.length > 0)) && (
          <Card>
            <CardHeader><CardTitle>Trade Screenshots</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trade.pre_trade_images && trade.pre_trade_images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-text-muted mb-3">Pre-Trade Setups</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {trade.pre_trade_images.map((img: { url: string; public_id: string }, idx: number) => (
                      <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-md border border-border">
                        <img src={img.url} alt={`Pre-trade ${idx + 1}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {trade.post_trade_images && trade.post_trade_images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-text-muted mb-3">Post-Trade Results</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {trade.post_trade_images.map((img: { url: string; public_id: string }, idx: number) => (
                      <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-md border border-border">
                        <img src={img.url} alt={`Post-trade ${idx + 1}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Take Profit Levels</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-text-muted border-b border-border">
                <tr><th className="py-2 text-left">Level</th><th className="text-left">Price</th><th className="text-left">Close %</th><th className="text-left">RR</th><th className="text-left">Hit?</th></tr>
              </thead>
              <tbody>
                {trade.tp_levels?.map((tp: TPLevel, idx: number) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-2">TP {tp.level}</td>
                    <td className="font-mono">{tp.price}</td>
                    <td>{tp.position_percent}%</td>
                    <td className="font-mono">1:{tp.rr?.toFixed(2)}</td>
                    <td>{trade.tps_hit?.includes(tp.level) ? <Badge className="bg-win/20 text-win">Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {(trade.pre_trade_reasoning || trade.post_trade_lesson) && (
          <Card>
            <CardHeader><CardTitle>Trade Notes & Review</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trade.pre_trade_reasoning && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-secondary border-b border-border/50 pb-2">Pre-Trade Reasoning</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-background-secondary/30 p-4 rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trade.pre_trade_reasoning) }} />
                </div>
              )}
              {trade.post_trade_lesson && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-text-secondary border-b border-border/50 pb-2">Post-Trade Lesson</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-background-secondary/30 p-4 rounded-lg border border-border" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trade.post_trade_lesson) }} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
