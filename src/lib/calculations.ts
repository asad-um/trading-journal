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
 */
export function calculateGrossPnL(
  tpLevels: { rr: number; positionPercent: number }[],
  riskAmount: number,
  tpsHit: number[],
  slHit: boolean
): number {
  if (slHit && tpsHit.length === 0) {
    return -riskAmount;
  }
  
  if (slHit && tpsHit.length > 0) {
    let pnl = 0;
    let hitPercent = 0;
    
    tpsHit.forEach(hitIndex => {
      const tp = tpLevels[hitIndex - 1]; // Assuming 1-indexed
      if (tp) {
        pnl += riskAmount * tp.rr * (tp.positionPercent / 100);
        hitPercent += tp.positionPercent;
      }
    });
    
    const remainingPercent = 100 - hitPercent;
    const loss = riskAmount * (remainingPercent / 100);
    return pnl - loss;
  }
  
  if (!slHit) {
    let pnl = 0;
    tpsHit.forEach(hitIndex => {
      const tp = tpLevels[hitIndex - 1];
      if (tp) {
        pnl += riskAmount * tp.rr * (tp.positionPercent / 100);
      }
    });
    return pnl;
  }
  
  return 0;
}

/**
 * Calculates Net PnL deducting fees.
 */
export function calculateNetPnL(grossPnL: number, feeAmount: number, feeInPips: boolean, pipValue: number = 0): number {
  const totalFee = feeInPips ? (feeAmount * pipValue) : feeAmount;
  return grossPnL - totalFee;
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

/**
 * Detects the session based on time UTC.
 */
export function detectSession(timeString: string): 'Asia' | 'London' | 'NYSE' | 'London/NYSE Overlap' | 'Off-Hours' {
  const [hours, minutes] = timeString.split(':').map(Number);
  const time = hours + minutes / 60;
  
  // London/NYSE Overlap: 14:30 - 16:00
  if (time >= 14.5 && time <= 16) return 'London/NYSE Overlap';
  // Asia: 00:00 - 05:00
  if (time >= 0 && time <= 5) return 'Asia';
  // London: 06:00 - 16:00 (since overlap is caught above, this catches 06:00 - 14:29)
  if (time >= 6 && time <= 16) return 'London';
  // NYSE: 14:30 - 17:30 (catches 16:01 - 17:30)
  if (time > 16 && time <= 17.5) return 'NYSE';
  
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
