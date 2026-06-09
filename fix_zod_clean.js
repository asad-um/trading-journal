const fs = require('fs');

let validations = fs.readFileSync('src/lib/validations/trade.ts', 'utf8');

// The issue persists because `.min(0)` was also chained outside the preprocess.
// We need to write the preprocess correctly so the inner z.number() handles the restrictions.

const oldPre = `z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(val);
}, z.number())`;

const newPrePos = `z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(val);
}, z.number().min(0))`;

const newPrePct = `z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(val);
}, z.number().min(0).max(100))`;

validations = validations.replace(oldPre + '.min(0)', newPrePos);
validations = validations.replace(oldPre + '.min(1).max(100)', newPrePct);

// For rr and potential_pnl that have no trailing chains, just use the oldPre string
// But there might be other instances. Let's just manually rebuild the exact schema properties that are failing.

const fallbackSchema = `import * as z from "zod";

export const tpLevelSchema = z.object({
  level: z.number(),
  price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  position_percent: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0).max(100)),
  rr: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
  potential_pnl: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
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
  entry_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  stop_loss_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  num_tp_levels: z.number().min(1).max(5),
  tp_levels: z.array(tpLevelSchema).default([]),
  risk_percentage: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().min(0)),
  fee_type: z.enum(['Spread', 'Commission', 'Swap', 'Spread + Commission', 'Other']).optional(),
  fee_amount: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number()),
  fee_in_pips: z.boolean().default(false),
  pip_value: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().optional()),
  status: z.enum(['Open', 'Partial', 'Closed - Win', 'Closed - Loss', 'Breakeven', 'Cancelled']).default('Open'),
  breakeven_price: z.preprocess((val) => val === "" || val == null ? 0 : Number(val), z.number().optional()),
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
`;

fs.writeFileSync('src/lib/validations/trade.ts', fallbackSchema);

