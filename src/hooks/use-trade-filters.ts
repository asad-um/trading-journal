"use client";

import { useState, useEffect, useCallback } from "react";

export interface TradeFilters {
  symbol: string;
  strategy: string;
  subStrategy: string;
  status: string;
  session: string;
  direction: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: TradeFilters = {
  symbol: "",
  strategy: "",
  subStrategy: "",
  status: "",
  session: "",
  direction: "",
  dateFrom: "",
  dateTo: "",
};

const STORAGE_KEY = "trade_filters_v1";

export function useTradeFilters() {
  const [filters, setFilters] = useState<TradeFilters>(DEFAULT_FILTERS);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever filters change
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters, isHydrated]);

  const setFilter = useCallback(<K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  return {
    filters,
    setFilters,
    setFilter,
    clearFilters,
    activeFilterCount,
    isHydrated,
  };
}

export function applyTradeFilters<T extends {
  symbol: string;
  strategy?: string | null;
  sub_strategy?: string | null;
  status: string;
  session?: string | null;
  direction: string;
  trade_date: string;
}>(items: T[], filters: TradeFilters): T[] {
  return items.filter(item => {
    if (filters.symbol && !item.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) return false;
    if (filters.strategy && item.strategy !== filters.strategy) return false;
    if (filters.subStrategy && item.sub_strategy !== filters.subStrategy) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.session && item.session !== filters.session) return false;
    if (filters.direction && item.direction !== filters.direction) return false;
    if (filters.dateFrom && item.trade_date < filters.dateFrom) return false;
    if (filters.dateTo && item.trade_date > filters.dateTo) return false;
    return true;
  });
}
