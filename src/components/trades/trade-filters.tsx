"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradeFilters } from "@/hooks/use-trade-filters";
import { SlidersHorizontal, X } from "lucide-react";

interface TradeFiltersProps {
  filters: TradeFilters;
  setFilter: <K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  strategies?: string[];
  sessions?: string[];
}

const STATUS_OPTIONS = ["Open", "Partial", "Closed - Win", "Closed - Loss", "Breakeven", "Cancelled"];
const DIRECTION_OPTIONS = ["Long", "Short"];
const SESSION_OPTIONS = ["Asia", "London", "NYSE", "London/NYSE Overlap", "Off-Hours"];

export function TradeFiltersPanel({ filters, setFilter, clearFilters, activeFilterCount, strategies = [], sessions = SESSION_OPTIONS }: TradeFiltersProps) {
  return (
    <div className="space-y-4 bg-background-secondary/50 border border-border/60 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-text-muted hover:text-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Symbol..."
          value={filters.symbol}
          onChange={(e) => setFilter("symbol", e.target.value)}
          className="h-9 bg-background"
        />
        
        <Select value={filters.strategy} onValueChange={(v) => setFilter("strategy", v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Strategies</SelectItem>
            {strategies.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.direction} onValueChange={(v) => setFilter("direction", v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Directions</SelectItem>
            {DIRECTION_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.session} onValueChange={(v) => setFilter("session", v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Sessions</SelectItem>
            {sessions.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter("dateFrom", e.target.value)}
          className="h-9 bg-background"
          placeholder="From date"
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter("dateTo", e.target.value)}
          className="h-9 bg-background"
          placeholder="To date"
        />
      </div>
    </div>
  );
}
