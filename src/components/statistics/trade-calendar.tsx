"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TradeDay {
  date: string; // YYYY-MM-DD
  netPnL: number;
  tradeCount: number;
  trades: { id: string; symbol: string; direction: string; net_pnl: number; status: string; actual_rr_achieved: number }[];
}

interface TradeCalendarProps {
  trades: { id: string; trade_date: string; symbol: string; direction: string; net_pnl: number; status: string; actual_rr_achieved: number }[];
  blurMoney: (v: number) => string;
}

export function TradeCalendar({ trades, blurMoney }: TradeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<TradeDay | null>(null);

  // Build a map of date → TradeDay
  const dayMap: Record<string, TradeDay> = {};
  trades.forEach(t => {
    if (!dayMap[t.trade_date]) {
      dayMap[t.trade_date] = { date: t.trade_date, netPnL: 0, tradeCount: 0, trades: [] };
    }
    dayMap[t.trade_date].netPnL += t.net_pnl;
    dayMap[t.trade_date].tradeCount += 1;
    dayMap[t.trade_date].trades.push(t);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  // Pad to full weeks
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Monthly summary
  const monthTrades = Object.values(dayMap).filter(d => d.date >= format(monthStart, 'yyyy-MM-dd') && d.date <= format(monthEnd, 'yyyy-MM-dd'));
  const monthPnL = monthTrades.reduce((a, d) => a + d.netPnL, 0);
  const monthTradeCount = monthTrades.reduce((a, d) => a + d.tradeCount, 0);
  const tradingDays = monthTrades.length;
  const winDays = monthTrades.filter(d => d.netPnL > 0).length;

  const getStatusColor = (status: string) => {
    if (status.includes("Win")) return "text-win border-win/30 bg-win/10";
    if (status.includes("Loss")) return "text-loss border-loss/30 bg-loss/10";
    if (status === "Breakeven") return "text-breakeven border-breakeven/30 bg-breakeven/10";
    return "text-text-muted border-border bg-background-secondary";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {tradingDays} trading day{tradingDays !== 1 ? 's' : ''} · {monthTradeCount} trade{monthTradeCount !== 1 ? 's' : ''} · 
            <span className={`font-semibold ml-1 ${monthPnL > 0 ? 'text-win' : monthPnL < 0 ? 'text-loss' : ''}`}>
              {monthPnL > 0 ? '+' : ''}{blurMoney(monthPnL)}
            </span>
            {tradingDays > 0 && <span className="ml-2 text-text-muted">· {winDays}/{tradingDays} green days</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs px-2 h-8">
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayData = dayMap[dateStr];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isSelected = selectedDay?.date === dateStr;

          let cellBg = '';
          let cellText = '';
          if (!inMonth) {
            cellBg = 'bg-transparent';
            cellText = 'text-text-muted/30';
          } else if (dayData) {
            if (dayData.netPnL > 0) {
              cellBg = isSelected ? 'bg-win/30 border-win' : 'bg-win/10 border-win/30 hover:bg-win/20';
              cellText = 'text-win';
            } else if (dayData.netPnL < 0) {
              cellBg = isSelected ? 'bg-loss/30 border-loss' : 'bg-loss/10 border-loss/30 hover:bg-loss/20';
              cellText = 'text-loss';
            } else {
              cellBg = isSelected ? 'bg-breakeven/30 border-breakeven' : 'bg-breakeven/10 border-breakeven/30 hover:bg-breakeven/20';
              cellText = 'text-breakeven';
            }
          } else {
            cellBg = 'bg-background-secondary/30 border-border/20 hover:bg-background-secondary/60';
            cellText = 'text-foreground';
          }

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (dayData && inMonth) {
                  setSelectedDay(isSelected ? null : dayData);
                }
              }}
              disabled={!dayData || !inMonth}
              className={`
                relative min-h-[52px] md:min-h-[64px] p-1.5 rounded-lg border text-left transition-all duration-150
                ${cellBg} ${!inMonth ? 'opacity-30 cursor-default' : dayData ? 'cursor-pointer' : 'cursor-default opacity-50'}
                ${today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                ${isSelected ? 'ring-2 ring-offset-1 ring-offset-background' : ''}
              `}
            >
              <span className={`text-xs font-semibold ${today ? 'text-primary' : cellText} ${!inMonth ? 'text-text-muted/30' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayData && inMonth && (
                <div className="mt-0.5">
                  <p className={`text-[10px] font-bold leading-tight ${cellText}`}>
                    {dayData.netPnL > 0 ? '+' : ''}{blurMoney(dayData.netPnL)}
                  </p>
                  <p className="text-[9px] text-text-muted leading-tight">
                    {dayData.tradeCount}T
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-win/20 border border-win/40" /><span>Profitable day</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-loss/20 border border-loss/40" /><span>Loss day</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-breakeven/20 border border-breakeven/40" /><span>Breakeven</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-background-secondary/50 border border-border/30" /><span>No trades</span></div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="mt-2 p-4 bg-background-secondary border border-border rounded-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold">{format(new Date(selectedDay.date + 'T12:00:00'), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {selectedDay.tradeCount} trade{selectedDay.tradeCount !== 1 ? 's' : ''} · 
                <span className={`font-semibold ml-1 ${selectedDay.netPnL > 0 ? 'text-win' : selectedDay.netPnL < 0 ? 'text-loss' : 'text-breakeven'}`}>
                  {selectedDay.netPnL > 0 ? '+' : ''}{blurMoney(selectedDay.netPnL)}
                </span>
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {selectedDay.trades.map(t => (
              <Link key={t.id} href={`/trades/${t.id}`} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border hover:border-primary/40 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{t.symbol}</span>
                  <Badge variant="outline" className={t.direction === 'Long' ? 'text-win border-win/30 text-xs' : 'text-loss border-loss/30 text-xs'}>{t.direction}</Badge>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(t.status)}`}>{t.status}</Badge>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-bold text-sm ${t.net_pnl > 0 ? 'text-win' : t.net_pnl < 0 ? 'text-loss' : ''}`}>
                    {t.net_pnl > 0 ? '+' : ''}{blurMoney(t.net_pnl)}
                  </p>
                  <p className="text-xs text-text-muted">{t.actual_rr_achieved?.toFixed(2)}R</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
