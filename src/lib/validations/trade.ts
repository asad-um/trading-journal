import * as z from "zod";

export const tpLevelSchema = z.object({
  level: z.number(),
  price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  position_percent: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0).max(100)),
  rr: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
  potential_pnl: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
  hit: z.boolean().default(false),
});

// A helper to safely convert empty strings from React Hook Form into 'undefined' so .optional() works
const emptyAsUndefined = <T extends z.ZodTypeAny>(zodType: T) => 
  z.preprocess((val) => (val === "" || val === null ? undefined : val), zodType);

export const tradeSchema = z.object({
  trade_date: z.string(),
  trade_time_utc: z.string(),
  analysis_timeframe: z.string(),
  entry_timeframe: z.string(),
  symbol: z.string().min(1, "Symbol is required"),
  asset_class: z.string(),
  direction: z.enum(['Long', 'Short']),
  strategy: emptyAsUndefined(z.string().optional()),
  sub_strategy: emptyAsUndefined(z.string().optional()),
  schematic: z.string(),
  entry_event: z.string(),
  fundamental_bias: emptyAsUndefined(z.enum(['Bullish', 'Bearish', 'Neutral']).optional()),
  fundamental_aligned: emptyAsUndefined(z.enum(['Yes', 'No', 'Partial']).optional()),
  fundamental_note: emptyAsUndefined(z.string().max(500).optional()),
  criteria_checked: z.array(z.object({
    id: z.string(),
    label: z.string(),
    checked: z.boolean()
  })).default([]),
  entry_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  stop_loss_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  num_tp_levels: z.number().min(1).max(5),
  tp_levels: z.array(tpLevelSchema).default([]),
  risk_percentage: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  fee_type: emptyAsUndefined(z.enum(['Spread', 'Commission', 'Swap', 'Spread + Commission', 'Other']).optional()),
  fee_amount: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
  fee_in_pips: z.boolean().default(false),
  pip_value: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().optional()),
  status: z.enum(['Open', 'Partial', 'Closed - Win', 'Closed - Loss', 'Breakeven', 'Cancelled']).default('Open'),
  breakeven_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().optional()),
  tps_hit: z.array(z.number()).default([]),
  sl_hit: z.boolean().default(false),
  analysis_platform: z.string().default('TradingView'),
  execution_platform: z.string().default('CTrader'),
  broker: emptyAsUndefined(z.string().optional()),
  plan_followed: emptyAsUndefined(z.preprocess((val) => val === "true" || val === true ? true : (val === "false" || val === false ? false : undefined), z.boolean().optional())),
  mistake_category: emptyAsUndefined(z.string().optional()),
  confidence_level: emptyAsUndefined(z.preprocess((val) => val === "" || val == null ? undefined : Number(val), z.number().min(1).max(5).optional())),
  would_take_again: emptyAsUndefined(z.preprocess((val) => val === "true" || val === true ? true : (val === "false" || val === false ? false : undefined), z.boolean().optional())),
  pre_trade_reasoning: emptyAsUndefined(z.string().optional()),
  post_trade_lesson: emptyAsUndefined(z.string().optional()),
  pre_trade_images: z.array(z.any()).default([]),
  post_trade_images: z.array(z.any()).default([]),
});

export type TradeFormValues = z.infer<typeof tradeSchema>;
