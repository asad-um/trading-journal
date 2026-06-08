import * as z from "zod";

export const tpLevelSchema = z.object({
  level: z.number(),
  price: z.coerce.number().positive(),
  position_percent: z.coerce.number().min(1).max(100),
  rr: z.coerce.number(),
  potential_pnl: z.coerce.number(),
  hit: z.boolean().default(false),
});

export const tradeSchema = z.object({
  trade_date: z.string(),
  trade_time_utc: z.string(),
  analysis_timeframe: z.string(),
  entry_timeframe: z.string(),
  symbol: z.string().min(1, "Symbol is required"),
  asset_class: z.string(),
  direction: z.enum(['Long', 'Short']),
  strategy: z.string().optional(),
  sub_strategy: z.string().optional(),
  schematic: z.string(),
  entry_event: z.string(),
  fundamental_bias: z.enum(['Bullish', 'Bearish', 'Neutral']).optional(),
  fundamental_aligned: z.enum(['Yes', 'No', 'Partial']).optional(),
  fundamental_note: z.string().max(500).optional(),
  criteria_checked: z.array(z.object({
    id: z.string(),
    label: z.string(),
    checked: z.boolean()
  })).default([]),
  entry_price: z.coerce.number().positive(),
  stop_loss_price: z.coerce.number().positive(),
  num_tp_levels: z.number().min(1).max(5),
  tp_levels: z.array(tpLevelSchema).default([]),
  risk_percentage: z.coerce.number().positive(),
  fee_type: z.enum(['Spread', 'Commission', 'Swap', 'Spread + Commission', 'Other']).optional(),
  fee_amount: z.coerce.number().default(0),
  fee_in_pips: z.boolean().default(false),
  pip_value: z.coerce.number().optional(),
  status: z.enum(['Open', 'Partial', 'Closed - Win', 'Closed - Loss', 'Breakeven', 'Cancelled']).default('Open'),
  breakeven_price: z.coerce.number().optional(),
  tps_hit: z.array(z.number()).default([]),
  analysis_platform: z.string().default('TradingView'),
  execution_platform: z.string().default('CTrader'),
  broker: z.string().optional(),
  plan_followed: z.boolean().optional(),
  mistake_category: z.string().optional(),
  confidence_level: z.number().min(1).max(5).optional(),
  would_take_again: z.boolean().optional(),
  pre_trade_reasoning: z.string().optional(),
  post_trade_lesson: z.string().optional(),
  pre_trade_images: z.array(z.any()).default([]),
  post_trade_images: z.array(z.any()).default([]),
});

export type TradeFormValues = z.infer<typeof tradeSchema>;
