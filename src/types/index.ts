export interface Profile {
  id: string;
  email: string;
  starting_balance: number;
  current_balance: number;
  currency: string;
  default_risk_percentage: number;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface AccountEvent {
  id: string;
  user_id: string;
  portfolio_id?: string;
  event_type: 'deposit' | 'withdrawal' | 'adjustment' | 'reset';
  amount: number;
  note?: string;
  event_date: string;
  created_at: string;
}

export interface TPLevel {
  level: number;
  price: number;
  position_percent: number;
  rr: number;
  potential_pnl: number;
  hit: boolean;
}

export interface TradeImage {
  url: string;
  public_id: string;
  caption: string;
}

export interface Trade {
  id: string;
  user_id: string;
  trade_date: string;
  trade_time_utc: string;
  date_logged: string;
  session: 'Asia' | 'London' | 'NYSE' | 'London/NYSE Overlap' | 'Off-Hours';
  analysis_timeframe: string;
  entry_timeframe: string;
  symbol: string;
  asset_class: string;
  direction: 'Long' | 'Short';
  strategy?: string;
  sub_strategy?: string;
  schematic: string;
  entry_event: string;
  fundamental_bias?: 'Bullish' | 'Bearish' | 'Neutral';
  fundamental_aligned?: 'Yes' | 'No' | 'Partial';
  fundamental_note?: string;
  criteria_checked: { id: string; label: string; checked: boolean }[];
  entry_price: number;
  stop_loss_price: number;
  tp_levels: TPLevel[];
  num_tp_levels: number;
  risk_percentage: number;
  risk_amount_usd: number;
  weighted_avg_rr_planned: number;
  actual_rr_achieved: number;
  position_size: number;
  status: 'Open' | 'Partial' | 'Closed - Win' | 'Closed - Loss' | 'Breakeven' | 'Cancelled';
  breakeven_price?: number;
  tps_hit: number[];
  gross_pnl: number;
  fee_type?: 'Spread' | 'Commission' | 'Swap' | 'Spread + Commission' | 'Other';
  fee_amount: number;
  fee_in_pips: boolean;
  pip_value?: number;
  net_pnl: number;
  analysis_platform: string;
  execution_platform: 'CTrader' | 'MetaTrader 5' | 'MetaTrader 4' | 'Other';
  broker?: string;
  plan_followed?: boolean;
  mistake_category?: string;
  confidence_level?: number;
  would_take_again?: boolean;
  pre_trade_reasoning?: string;
  post_trade_lesson?: string;
  pre_trade_images: TradeImage[];
  post_trade_images: TradeImage[];
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  criteria_list: { id: string; label: string; order: number }[];
  entry_events_list: { id: string; label: string }[];
  strategies_list?: { [key: string]: unknown }[];
  asset_list: { symbol: string; asset_class: string; custom: boolean }[];
  mistake_categories_list: { id: string; label: string }[];
  broker_list: { id: string; name: string }[];
  execution_platforms_list: { id: string; name: string }[];
  updated_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  starting_balance: number;
  current_balance: number;
  currency: string;
}
