"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { usePrivacy } from "@/components/privacy-provider";
import { useTradeFilters, applyTradeFilters } from "@/hooks/use-trade-filters";
import { TradeFiltersPanel } from "@/components/trades/trade-filters";
import { UserSettings } from "@/types";
import { normalizeStrategiesList } from "@/lib/defaults";

export default function PlaybookPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { blurMoney } = usePrivacy();
  const { filters, setFilter, clearFilters, activeFilterCount, isHydrated } = useTradeFilters();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: activePort } = await supabase.from('portfolios').select('id').eq('user_id', user.id).eq('is_active', true).single();
      if (!activePort) { setIsLoading(false); return; }

      const [{ data }, { data: settingsRes }] = await Promise.all([
        supabase
          .from("trades")
          .select("id, trade_date, symbol, direction, strategy, sub_strategy, status, net_pnl, session, pre_trade_images, post_trade_images")
          .eq("portfolio_id", activePort.id)
          .order("trade_date", { ascending: false }),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ]);

      if (settingsRes) setSettings(settingsRes);

      if (data) {
        // Filter out trades with no images
        const withImages = data.filter(t => (t.pre_trade_images && t.pre_trade_images.length > 0) || (t.post_trade_images && t.post_trade_images.length > 0));
        setTrades(withImages as Trade[]);
      }
      setIsLoading(false);
    }
    fetchData();

    const channel = supabase.channel('realtime-playbook')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, []);

  const configuredStrategies = settings?.strategies_list
    ? normalizeStrategiesList(settings.strategies_list).map(s => s.name)
    : [];
  const tradeStrategies = Array.from(new Set(trades.map(t => t.strategy).filter(Boolean))) as string[];
  const strategies = Array.from(new Set([...configuredStrategies, ...tradeStrategies]));

  const configuredSessions = settings?.sessions_list?.map((s: any) => s.label) || [];
  const tradeSessions = Array.from(new Set(trades.map(t => t.session).filter(Boolean))) as string[];
  const sessions = Array.from(new Set([...configuredSessions, ...tradeSessions]));

  const filteredTrades = isHydrated ? applyTradeFilters(trades, filters) : trades;

  if (isLoading) return <AppLayout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20 w-full animate-in fade-in duration-500">
        <div className="flex flex-col space-y-1 mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" /> Visual Playbook
          </h1>
          <p className="text-text-muted">A gallery of your documented setups. Train your eyes on what works.</p>
        </div>

        <TradeFiltersPanel
          filters={filters}
          setFilter={setFilter}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          strategies={strategies}
          sessions={sessions.length > 0 ? sessions : undefined}
        />

        {filteredTrades.length === 0 ? (
          <div className="text-center py-20 text-text-muted border-2 border-dashed border-border rounded-lg">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Your playbook is empty.</p>
            <p className="text-sm">{activeFilterCount > 0 ? "Try clearing your filters." : "Log a trade and upload chart screenshots to build your gallery."}</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredTrades.map(trade => {
              const allImages = [...(trade.pre_trade_images || []), ...(trade.post_trade_images || [])];
              const coverImage = allImages[0]?.url;
              
              return (
                <Card key={trade.id} className="break-inside-avoid overflow-hidden border-border/60 hover:border-primary/50 transition-colors group bg-background-secondary/30">
                  <div className="relative aspect-video bg-background-tertiary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {coverImage ? <img src={coverImage} alt="Trade setup" className="w-full h-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <Link href={`/trades/${trade.id}`}>
                        <Button variant="default" size="sm" className="w-full shadow-lg">View Details <ArrowRight className="h-4 w-4 ml-2" /></Button>
                      </Link>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-foreground">{trade.symbol}</h3>
                        <p className="text-xs text-text-muted">{format(new Date(trade.trade_date), "MMM dd, yyyy")}</p>
                      </div>
                      <Badge variant="outline" className={trade.status.includes('Win') ? "text-win border-win/30" : trade.status.includes('Loss') ? "text-loss border-loss/30" : ""}>
                        {trade.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-border/50 pt-3">
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-[10px] uppercase">{trade.strategy}</Badge>
                        <p className="text-xs text-text-muted">{trade.sub_strategy}</p>
                      </div>
                      <p className={`font-mono font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>
                        {trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
