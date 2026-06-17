-- ============================================================
-- BATCH 10: Initial Balance Default = 0
-- Date: 2026-06-17
-- Purpose: New accounts should start at $0 so the first deposit
--          becomes the recorded initial balance.
-- ============================================================

-- 1. Update the new-user trigger so the default Main Account starts at 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_portfolio_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, starting_balance, current_balance)
  VALUES (new.id, new.email, 0.00, 0.00);

  INSERT INTO public.portfolios (user_id, name, is_active, starting_balance, current_balance)
  VALUES (new.id, 'Main Account', true, 0.00, 0.00) RETURNING id INTO v_portfolio_id;

  INSERT INTO public.user_settings (
    user_id,
    criteria_list,
    entry_events_list,
    asset_list,
    mistake_categories_list,
    broker_list,
    execution_platforms_list,
    sessions_list
  ) VALUES (
    new.id,
    '[
      {"id":"1","label":"Fundamentals Aligned","order":1},
      {"id":"2","label":"Valid Schematic (Acc/Dist/Re-acc/Re-dist)","order":2},
      {"id":"3","label":"Manipulation Present","order":3},
      {"id":"4","label":"Volume Confluence","order":4},
      {"id":"5","label":"Absorption Identified","order":5},
      {"id":"6","label":"Divergence Present","order":6},
      {"id":"7","label":"Leader/Lagger Confluence","order":7},
      {"id":"8","label":"Time of Day / Session","order":8},
      {"id":"9","label":"ChoCh Valid","order":9},
      {"id":"10","label":"Demand/Supply Zone Entry","order":10},
      {"id":"11","label":"SOS / MSOW Confirmed","order":11},
      {"id":"12","label":"Correlating Asset Confluence","order":12}
    ]'::jsonb,
    '[
      {"id":"1","label":"Spring / Shakeout"},
      {"id":"2","label":"LPS (Last Point of Support)"},
      {"id":"3","label":"SOS (Sign of Strength)"},
      {"id":"4","label":"Test / Mitigation"},
      {"id":"5","label":"UTAD (Upthrust After Distribution)"},
      {"id":"6","label":"MSOW (Major Sign of Weakness)"},
      {"id":"7","label":"UPS (Upthrust)"},
      {"id":"8","label":"ChoCh Entry"},
      {"id":"9","label":"Re-accumulation Entry"},
      {"id":"10","label":"Re-distribution Entry"},
      {"id":"11","label":"Micro Structure Entry"},
      {"id":"12","label":"Back to Edge"}
    ]'::jsonb,
    '[
      {"symbol":"XAUUSD","asset_class":"Commodities","custom":false},
      {"symbol":"EURUSD","asset_class":"Forex","custom":false},
      {"symbol":"GBPUSD","asset_class":"Forex","custom":false},
      {"symbol":"US30","asset_class":"Indices","custom":false},
      {"symbol":"NAS100","asset_class":"Indices","custom":false},
      {"symbol":"BTCUSD","asset_class":"Crypto","custom":false}
    ]'::jsonb,
    '[
      {"id":"1","label":"Early Entry"},
      {"id":"2","label":"Late Entry"},
      {"id":"3","label":"Wrong Schematic Read"},
      {"id":"4","label":"Ignored Fundamentals"},
      {"id":"5","label":"Overtraded"},
      {"id":"6","label":"Revenge Trading"},
      {"id":"7","label":"Widened Stop Loss"},
      {"id":"8","label":"Closed Early (Fear)"},
      {"id":"9","label":"Missed Entry (Hesitation)"}
    ]'::jsonb,
    '[
      {"id":"1","name":"Fusion Markets"}
    ]'::jsonb,
    '[
      {"id":"1","name":"CTrader"},
      {"id":"2","name":"MetaTrader 5"}
    ]'::jsonb,
    '[
      {"id":"asia","label":"Asia","start_time":"00:00","end_time":"06:00"},
      {"id":"london","label":"London","start_time":"06:00","end_time":"16:00"},
      {"id":"overlap","label":"London/NYSE Overlap","start_time":"14:30","end_time":"16:00"},
      {"id":"nyse","label":"NYSE","start_time":"16:00","end_time":"21:00"},
      {"id":"off-hours","label":"Off-Hours","start_time":"21:00","end_time":"23:59"}
    ]'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing accounts that still have the old 1000.00 default
--    Only update accounts where no deposits/withdrawals/adjustments exist yet
--    and the balance is still exactly the starting balance (untouched).
UPDATE public.portfolios
SET starting_balance = 0.00,
    current_balance = 0.00
WHERE starting_balance = 1000.00
  AND current_balance = 1000.00
  AND NOT EXISTS (
    SELECT 1 FROM public.account_events ae
    WHERE ae.portfolio_id = portfolios.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.portfolio_id = portfolios.id
  );

UPDATE public.profiles
SET starting_balance = 0.00,
    current_balance = 0.00
WHERE starting_balance = 1000.00
  AND current_balance = 1000.00
  AND NOT EXISTS (
    SELECT 1 FROM public.account_events ae
    WHERE ae.user_id = profiles.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.user_id = profiles.id
  );
