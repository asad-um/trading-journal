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
  trade_open_time: emptyAsUndefined(z.string().optional()),
  trade_close_time: emptyAsUndefined(z.string().optional()),
  exit_type: emptyAsUndefined(z.enum(['Final TP', 'Stop Loss', 'Breakeven', 'Adjusted SL']).optional()),
  adjusted_sl_price: emptyAsUndefined(z.preprocess((val) => val === "" || val == null ? undefined : Number(val), z.number().optional())),
  highest_timeframe: emptyAsUndefined(z.enum(['Monthly', 'Weekly', 'Daily', '4H']).optional()),
  analysis_timeframe: emptyAsUndefined(z.enum(['4H', '2H', '1H', '30M', '15M']).optional()),
  entry_timeframe: emptyAsUndefined(z.enum(['15M', '5M', '1M', '30S', '15S', '5S']).optional()),
  symbol: z.string().min(1, "Symbol is required"),
  asset_class: z.string(),
  direction: z.enum(['Long', 'Short']),
  strategy: emptyAsUndefined(z.string().optional()),
  sub_strategy: emptyAsUndefined(z.string().optional()),
  schematic: z.string(),
  entry_event: z.string(),
  market_regime: emptyAsUndefined(z.enum(['Trending', 'Choppy/Range', 'News-Driven', 'Breakout', 'Reversal']).optional()),
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
  tags: z.array(z.string()).default([]),
  pre_trade_images: z.array(z.object({
    url: z.string(),
    public_id: z.string(),
    caption: z.string().optional()
  })).default([]),
  post_trade_images: z.array(z.object({
    url: z.string(),
    public_id: z.string(),
    caption: z.string().optional()
  })).default([]),
});

export type TradeFormValues = z.infer<typeof tradeSchema>;
