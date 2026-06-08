-- Performance Optimization: Adding Indices to frequently queried columns
-- This ensures the dashboard and trade logs load instantly even with 10,000+ trades.

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON public.trades(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);

CREATE INDEX IF NOT EXISTS idx_account_events_user_id ON public.account_events(user_id);
CREATE INDEX IF NOT EXISTS idx_account_events_type ON public.account_events(event_type);
