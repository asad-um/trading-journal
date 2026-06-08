"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/components/privacy-provider";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();

  useEffect(() => {
    async function fetchTrades() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
  
      const { data: activePortfolio } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();
      
      if (!activePortfolio) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select("id, trade_date, symbol, direction, schematic, entry_event, net_pnl, actual_rr_achieved, status, session, asset_class, strategy, sub_strategy")
        .eq("user_id", user.id)
        .eq("portfolio_id", activePortfolio.id)
        .order("trade_date", { ascending: false })
        .limit(100);
  
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else if (data) {
        setTrades(data as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
      setIsLoading(false);
    }
    fetchTrades();
  }, [toast]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    
    // First, fetch the trade to see if it has images attached that need to be destroyed
    const { data: tradeData } = await supabase.from("trades").select("pre_trade_images, post_trade_images").eq("id", id).single();
    
    const { error } = await supabase.from("trades").delete().eq("id", id);
    
    // If deletion succeeded, trigger asynchronous garbage collection for Cloudinary
    if (!error && tradeData) {
      const allImages = [
        ...(tradeData.pre_trade_images || []), 
        ...(tradeData.post_trade_images || [])
      ];
      
      allImages.forEach(img => {
        if (img && img.public_id) {
          fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: img.public_id })
          }).catch(console.error);
        }
      });
    }
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Trade removed successfully" });
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes("Win")) return "text-win border-win/30 bg-win/10";
    if (status.includes("Loss")) return "text-loss border-loss/30 bg-loss/10";
    if (status === "Breakeven") return "text-breakeven border-breakeven/30 bg-breakeven/10";
    if (status === "Open" || status === "Partial") return "text-open border-open/30 bg-open/10";
    return "text-text-muted border-border bg-background-secondary";
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 flex-1 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trade Log</h1>
          <Link href="/trades/new" className="hidden md:block">
            <Button><Plus className="mr-2 h-4 w-4" /> New Trade</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center flex-1 items-center"><Loader2 className="animate-spin h-8 w-8" /></div>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border border-border bg-background-secondary hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-background-tertiary/50 border-b border-border sticky top-0">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Direction</th>
                  <th className="px-6 py-3">Setup</th>
                  <th className="px-6 py-3">Net P&L</th>
                  <th className="px-6 py-3">RR</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">No trades found.</td></tr>
                ) : trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border hover:bg-background-tertiary/20">
                    <td className="px-6 py-4">{format(new Date(trade.trade_date), "MMM dd, yyyy")}</td>
                    <td className="px-6 py-4 font-bold">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={trade.direction === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{trade.direction}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold">{trade.strategy || trade.schematic}</span><br/>
                      <span className="text-text-muted">{trade.sub_strategy || trade.entry_event}</span>
                    </td>
                    <td className={`px-6 py-4 font-mono font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>
                      {trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}
                    </td>
                    <td className="px-6 py-4 font-mono">{trade.actual_rr_achieved ? trade.actual_rr_achieved.toFixed(2) : '-'}R</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getStatusColor(trade.status)}>{trade.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link href={`/trades/${trade.id}`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(trade.id)} className="text-loss hover:text-loss hover:bg-loss/10"><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile View */}
        {!isLoading && (
          <div className="md:hidden space-y-4 pb-20">
            {trades.map(trade => (
              <div key={trade.id} className="bg-background-secondary border border-border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{trade.symbol}</span>
                    <Badge variant="outline" className={trade.direction === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{trade.direction}</Badge>
                  </div>
                  <Badge variant="outline" className={getStatusColor(trade.status)}>{trade.status}</Badge>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-sm text-text-muted">
                    {format(new Date(trade.trade_date), "MMM dd")} • {trade.session}
                  </div>
                  <div className={`font-mono text-lg font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>
                    {trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/trades/${trade.id}`} className="flex-1"><Button variant="outline" className="w-full">View</Button></Link>
                  <Button variant="outline" onClick={() => handleDelete(trade.id)} className="text-loss border-loss/30 hover:bg-loss/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
