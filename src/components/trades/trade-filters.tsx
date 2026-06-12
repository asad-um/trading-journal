"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradeFilters } from "@/hooks/use-trade-filters";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface TradeFiltersProps {
  filters: TradeFilters;
  setFilter: <K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  strategies?: string[];
  sessions?: string[];
  defaultExpanded?: boolean;
}

const STATUS_OPTIONS = ["Open", "Partial", "Closed - Win", "Closed - Loss", "Breakeven", "Cancelled"];
const DIRECTION_OPTIONS = ["Long", "Short"];
const SESSION_OPTIONS = ["Asia", "London", "NYSE", "London/NYSE Overlap", "Off-Hours"];

export function TradeFiltersPanel({ filters, setFilter, clearFilters, activeFilterCount, strategies = [], sessions = SESSION_OPTIONS, defaultExpanded = false }: TradeFiltersProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-background-secondary/50 border border-border/60 rounded-xl p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); clearFilters(); }}
              className="text-xs text-text-muted hover:text-foreground cursor-pointer"
            >
              Clear
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
        </div>
      </button>

      {expanded && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <Input
          placeholder="Symbol..."
          value={filters.symbol}
          onChange={(e) => setFilter("symbol", e.target.value)}
          className="h-9 bg-background"
        />
        
        <Select value={filters.strategy || "all"} onValueChange={(v) => setFilter("strategy", v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Strategies</SelectItem>
            {strategies.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.direction || "all"} onValueChange={(v) => setFilter("direction", v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            {DIRECTION_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.session || "all"} onValueChange={(v) => setFilter("session", v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 bg-background">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
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
      )}
    </div>
  );
}
