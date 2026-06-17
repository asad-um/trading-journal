import { Trade } from "@/types";

/**
 * Calculates Risk to Reward ratio for a given target.
 */
export function calculateRR(entryPrice: number, slPrice: number, tpPrice: number, direction: 'Long' | 'Short'): number | null {
  const risk = Math.abs(entryPrice - slPrice);
  const reward = Math.abs(tpPrice - entryPrice);
  
  if (direction === 'Long') {
    if (!(tpPrice > entryPrice && entryPrice > slPrice)) return null;
  } else {
    if (!(tpPrice < entryPrice && entryPrice < slPrice)) return null;
  }
  
  if (risk === 0) {
    console.warn('[calculateRR] Risk is zero');
    return null;
  }
  
  return reward / risk;
}

/**
 * Calculates Weighted RR based on position percentages.
 */
export function calculateWeightedRR(tpLevels: { rr: number; positionPercent: number }[]): number {
  return tpLevels.reduce((acc, tp) => acc + (tp.rr * (tp.positionPercent / 100)), 0);
}

/**
 * Calculates amount at risk in USD.
 */
export function calculateRiskAmount(accountBalance: number, riskPercentage: number): number {
  return (accountBalance * riskPercentage) / 100;
}

/**
 * Calculates potential PnL for a TP level.
 */
export function calculatePotentialPnL(riskAmount: number, rr: number, positionPercent: number): number {
  return riskAmount * rr * (positionPercent / 100);
}

/**
 * Calculates Gross PnL depending on outcomes.
 *
 * Supports 4 exit scenarios for the remaining position after TPs:
 *   - 'Final TP'   : all TPs hit, nothing remaining → 0 extra
 *   - 'Stop Loss'  : remaining position stopped out at full risk
 *   - 'Breakeven'  : remaining position closed at entry → 0 extra
 *   - 'Adjusted SL': remaining position closed at adjusted SL price
 *                    (requires entryPrice, slPrice, direction, adjustedSlPrice)
 *
 * Legacy mode (exitType = undefined, slHit = true) preserved for backward compat.
 */
export function calculateGrossPnL(
  tpLevels: { rr: number; positionPercent: number }[],
  riskAmount: number,
  tpsHit: number[],
  slHitOrExitType: boolean | 'Final TP' | 'Stop Loss' | 'Breakeven' | 'Adjusted SL' | null | undefined,
  adjustedSlPrice?: number,
  entryPrice?: number,
  slPrice?: number,
  direction?: 'Long' | 'Short'
): number {
  // Normalise: legacy boolean → exit type string
  let exitType: 'Final TP' | 'Stop Loss' | 'Breakeven' | 'Adjusted SL' | null;
  if (typeof slHitOrExitType === 'boolean') {
    exitType = slHitOrExitType ? 'Stop Loss' : null;
  } else {
    exitType = slHitOrExitType ?? null;
  }

  // Calculate PnL for all hit TPs
  let pnl = 0;
  let hitPercent = 0;
  tpsHit.forEach(hitIndex => {
    const tp = tpLevels[hitIndex - 1]; // 1-indexed
    if (tp) {
      pnl += riskAmount * tp.rr * (tp.positionPercent / 100);
      hitPercent += tp.positionPercent;
    }
  });

  const remainingPercent = 100 - hitPercent;

  // If nothing remaining (all TPs hit or no exit type), return TP gains only
  if (remainingPercent <= 0 || exitType === null || exitType === 'Final TP') {
    return pnl;
  }

  // Apply exit type to remaining position
  switch (exitType) {
    case 'Stop Loss':
      pnl -= riskAmount * (remainingPercent / 100);
      break;

    case 'Breakeven':
      // Remaining closed at entry — no gain, no loss
      break;

    case 'Adjusted SL': {
      // Compute RR of adjusted SL vs entry
      if (adjustedSlPrice != null && entryPrice != null && slPrice != null && direction) {
        const originalRisk = Math.abs(entryPrice - slPrice);
        if (originalRisk > 0) {
          const adjustedMove = direction === 'Long'
            ? adjustedSlPrice - entryPrice   // positive = above entry (profit)
            : entryPrice - adjustedSlPrice;  // positive = below entry (profit)
          const adjustedRR = adjustedMove / originalRisk;
          pnl += riskAmount * adjustedRR * (remainingPercent / 100);
        }
      }
      break;
    }
  }

  return pnl;
}

/**
 * Calculates trade duration in minutes between open and close times.
 * Returns null if either time is missing.
 */
export function calculateTradeDuration(openTime: string | null | undefined, closeTime: string | null | undefined): number | null {
  if (!openTime || !closeTime) return null;
  try {
    const open = new Date(openTime).getTime();
    const close = new Date(closeTime).getTime();
    if (isNaN(open) || isNaN(close)) return null;
    return Math.round((close - open) / 60000); // minutes
  } catch {
    return null;
  }
}

/**
 * Calculates the actual achieved RR.
 */
export function calculateActualRR(netPnL: number, riskAmount: number): number {
  if (riskAmount === 0 || isNaN(riskAmount)) return 0;
  return netPnL / riskAmount;
}

/**
 * Calculates Floating PnL of open/partial trades.
 */
export function calculateFloatingPnL(trades: Trade[]): number {
  return trades
    .filter(t => t.status === 'Open' || t.status === 'Partial')
    .reduce((acc, t) => acc + (t.net_pnl || 0), 0);
}

export interface WinRateResult {
  winRate: number;
  lossRate: number;
  beRate: number;
  wins: number;
  losses: number;
  breakevens: number;
  total: number;
}

/**
 * Calculates win rates.
 */
export function calculateWinRate(trades: Trade[]): WinRateResult {
  // Idealistic approach: 'Partial' trades that have hit TPs are technically realized wins in progress.
  // We include them in the win rate if they have positive PnL.
  const eligible = trades.filter(t => t.status !== 'Cancelled' && t.status !== 'Open');
  
  const wins = eligible.filter(t => t.status === 'Closed - Win' || (t.status === 'Partial' && t.net_pnl > 0)).length;
  const losses = eligible.filter(t => t.status === 'Closed - Loss' || (t.status === 'Partial' && t.net_pnl < 0)).length;
  const breakevens = eligible.filter(t => t.status === 'Breakeven' || (t.status === 'Partial' && t.net_pnl === 0)).length;
  
  const total = wins + losses + breakevens;
  
  return {
    winRate: total > 0 ? (wins / total) * 100 : 0,
    lossRate: total > 0 ? (losses / total) * 100 : 0,
    beRate: total > 0 ? (breakevens / total) * 100 : 0,
    wins,
    losses,
    breakevens,
    total
  };
}

/**
 * Calculates Profit Factor.
 */
export function calculateProfitFactor(trades: Trade[]): number {
  const grossProfit = trades
    .filter(t => t.net_pnl > 0 && t.status !== 'Cancelled' && t.status !== 'Open')
    .reduce((acc, t) => acc + t.net_pnl, 0);
    
  const grossLoss = Math.abs(
    trades
      .filter(t => t.net_pnl < 0)
      .reduce((acc, t) => acc + t.net_pnl, 0)
  );
  
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export interface DrawdownResult {
  maxDrawdownAmount: number;
  maxDrawdownPercent: number;
  drawdownPeriodStart: string | null;
  drawdownPeriodEnd: string | null;
}

/**
 * Calculates max drawdown from trades history.
 */
export function calculateMaxDrawdown(trades: Trade[], startingBalance: number): DrawdownResult {
  const sorted = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
  
  let peak = startingBalance;
  let currentBalance = startingBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;
  let ddStart: string | null = null;
  let ddEnd: string | null = null;
  
  let currentPeakDate: string | null = null;
  
  for (const trade of sorted) {
    if (['Closed - Win', 'Closed - Loss', 'Breakeven', 'Partial'].includes(trade.status)) {
      currentBalance += trade.net_pnl;
      
      if (currentBalance > peak) {
        peak = currentBalance;
        currentPeakDate = trade.trade_date;
      }
      
      const ddAmount = peak - currentBalance;
      const ddPercent = peak > 0 ? (ddAmount / peak) * 100 : 0;
      
      if (ddAmount > maxDrawdownAmount) {
        maxDrawdownAmount = ddAmount;
        maxDrawdownPercent = ddPercent;
        ddStart = currentPeakDate;
        ddEnd = trade.trade_date;
      }
    }
  }
  
  return { maxDrawdownAmount, maxDrawdownPercent, drawdownPeriodStart: ddStart, drawdownPeriodEnd: ddEnd };
}

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export interface SessionWindow {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
}

/**
 * Detects the session based on time UTC against the user's defined session windows.
 */
export function detectSession(timeString: string, sessions: SessionWindow[] = []): string {
  const minutes = timeToMinutes(timeString);
  
  // Fallback to hardcoded defaults if no custom sessions provided
  const windows = sessions.length > 0 ? sessions : [
    { id: "asia", label: "Asia", start_time: "00:00", end_time: "06:00" },
    { id: "london", label: "London", start_time: "06:00", end_time: "16:00" },
    { id: "overlap", label: "London/NYSE Overlap", start_time: "14:30", end_time: "16:00" },
    { id: "nyse", label: "NYSE", start_time: "16:00", end_time: "21:00" },
  ];
  
  for (const session of windows) {
    const start = timeToMinutes(session.start_time);
    const end = timeToMinutes(session.end_time);
    
    if (start <= end) {
      // Normal range (e.g. 06:00 - 16:00)
      if (minutes >= start && minutes <= end) return session.label;
    } else {
      // Overnight range (e.g. 22:00 - 04:00)
      if (minutes >= start || minutes <= end) return session.label;
    }
  }
  
  return 'Off-Hours';
}

export interface ValidationResult {
  valid: boolean;
  total: number;
  difference: number;
}

/**
 * Validates TP Splits total exactly 100%.
 */
export function validateTPSplits(tpLevels: { positionPercent: number }[]): ValidationResult {
  const total = tpLevels.reduce((acc, tp) => acc + (tp.positionPercent || 0), 0);
  return {
    valid: Math.abs(total - 100) < 0.01,
    total,
    difference: 100 - total
  };
}
