"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { Trade } from "@/types";
import { usePrivacy } from "@/components/privacy-provider";

interface TradeTabsProps {
  recentTrades: Trade[];
  openPositions: Trade[];
}

export function TradeTabs({ recentTrades, openPositions }: TradeTabsProps) {
  const { blurMoney } = usePrivacy();

  return (
    <div className="p-4 border-b border-border">
      <Tabs defaultValue="recent" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 sm:gap-0">
          <TabsList className="bg-background-tertiary flex-wrap h-auto">
            <TabsTrigger value="recent" className="text-xs md:text-sm">Recent Activity</TabsTrigger>
            <TabsTrigger value="open" className="text-xs md:text-sm relative">
              Active Positions
              {openPositions.length > 0 && (
                <span className="ml-2 bg-open text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{openPositions.length}</span>
              )}
            </TabsTrigger>
          </TabsList>
          <Link href="/trades" className="text-sm text-primary hover:underline font-medium">View Full Log</Link>
        </div>

        <TabsContent value="recent" className="mt-4 border-none p-0 outline-none">
          <div className="space-y-3">
            {recentTrades.length === 0 ? (
              <div className="text-center text-text-muted py-8">No recent trades.</div>
            ) : (
              recentTrades.map(trade => (
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
            {openPositions.length === 0 ? (
              <div className="text-center text-text-muted py-8">No open positions.</div>
            ) : (
              openPositions.map(trade => (
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
  );
}
