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
import { DataTable } from "@/components/trades/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePrivacy } from "@/components/privacy-provider";
import { useTradeFilters, applyTradeFilters } from "@/hooks/use-trade-filters";
import { TradeFiltersPanel } from "@/components/trades/trade-filters";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { blurMoney } = usePrivacy();
  const { filters, setFilter, clearFilters, activeFilterCount, isHydrated } = useTradeFilters();

  useEffect(() => {
    async function fetchTrades() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
  
      const { data: activePorts } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      const activePortfolio = activePorts?.[0];
      
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

    const channel = supabase.channel('realtime-trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchTrades())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchTrades())
      .subscribe();

    return () => { supabase.removeChannel(channel); }
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
      
      allImages.forEach(async (img) => {
        if (img && img.public_id) {
          try {
            const res = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_id: img.public_id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
          } catch (e: any) {
            console.error(e);
            toast({ title: "Image Cleanup Warning", description: e.message || "Failed to delete image from Cloudinary.", variant: "default" });
          }
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

  const strategies = Array.from(new Set(trades.map(t => t.strategy).filter(Boolean))) as string[];
  const sessions = Array.from(new Set(trades.map(t => t.session).filter(Boolean))) as string[];
  const filteredTrades = isHydrated ? applyTradeFilters(trades, filters) : trades;

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

        <TradeFiltersPanel
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          strategies={strategies}
          sessions={sessions.length > 0 ? sessions : undefined}
        />

        {isLoading ? (
          <div className="flex justify-center flex-1 items-center"><Loader2 className="animate-spin h-8 w-8" /></div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-20 text-text-muted border-2 border-dashed border-border rounded-lg flex-1 flex flex-col items-center justify-center">
            <p className="text-lg font-semibold">No trades found</p>
            <p className="text-sm">{activeFilterCount > 0 ? "Try clearing your filters." : "Start by logging your first trade."}</p>
          </div>
        ) : (
                    <div className="hidden md:block">
            <DataTable 
              data={filteredTrades} 
              columns={[
                {
                  accessorKey: "trade_date",
                  header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8 data-[state=open]:bg-accent/10">Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
                  cell: ({ row }) => format(new Date(row.getValue("trade_date")), "MMM dd, yyyy"),
                },
                {
                  accessorKey: "symbol",
                  header: "Symbol",
                  cell: ({ row }) => <span className="font-bold">{row.getValue("symbol")}</span>,
                },
                {
                  accessorKey: "direction",
                  header: "Direction",
                  cell: ({ row }) => <Badge variant="outline" className={row.getValue("direction") === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{row.getValue("direction") as string}</Badge>,
                },
                {
                  accessorKey: "strategy",
                  header: "Setup",
                  cell: ({ row }) => (
                    <div className="text-xs">
                      <span className="font-semibold">{row.original.strategy || row.original.schematic}</span><br/>
                      <span className="text-text-muted">{row.original.sub_strategy || row.original.entry_event}</span>
                    </div>
                  )
                },
                {
                  accessorKey: "net_pnl",
                  header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">Net P&L <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
                  cell: ({ row }) => {
                    const val = parseFloat(row.getValue("net_pnl"));
                    return <span className={`font-mono font-bold ${val > 0 ? "text-win" : val < 0 ? "text-loss" : ""}`}>{val > 0 ? "+" : ""}{blurMoney(val)}</span>;
                  }
                },
                {
                  accessorKey: "actual_rr_achieved",
                  header: "RR",
                  cell: ({ row }) => <span className="font-mono">{row.getValue("actual_rr_achieved") ? Number(row.getValue("actual_rr_achieved")).toFixed(2) : '-'}R</span>
                },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ row }) => <Badge variant="outline" className={getStatusColor(row.getValue("status") as string)}>{row.getValue("status") as string}</Badge>
                },
                {
                  id: "actions",
                  cell: ({ row }) => (
                    <div className="flex justify-end gap-2">
                      <Link href={`/trades/${row.original.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)} className="h-8 w-8 text-loss hover:text-loss hover:bg-loss/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )
                }
              ]} 
            />
          </div>
        )}

        {/* Mobile View */}
        {!isLoading && (
          <div className="md:hidden space-y-4 pb-20">
            {filteredTrades.map(trade => (
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
