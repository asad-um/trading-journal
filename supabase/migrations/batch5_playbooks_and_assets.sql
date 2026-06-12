-- ============================================================
-- BATCH 5: Playbooks nested structure + expanded assets
-- Date: 2026-06-12
-- Run after MASTER_FIX_2026_06_11.sql
-- ============================================================

-- 1. Ensure strategies_list column exists
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS strategies_list jsonb DEFAULT '[]';

-- 2. Seed default nested strategies for users with empty/null strategies_list
UPDATE user_settings
SET strategies_list = '[
  {"id":"wyckoff","name":"Wyckoff","playbooks":[
    {"id":"blue-box","name":"Blue Box Strategy"},
    {"id":"spring-utad","name":"Spring/UTAD Strategy"},
    {"id":"classical","name":"Classical Strategy"},
    {"id":"reaccumulation","name":"Re-accumulation Entry"},
    {"id":"redistribution","name":"Re-distribution Entry"}
  ]},
  {"id":"smc","name":"SMC (Smart Money)","playbooks":[
    {"id":"choch","name":"ChoCh Entry"},
    {"id":"continuation","name":"Continuation"},
    {"id":"liquidity-sweep","name":"Liquidity Sweep"},
    {"id":"breaker-block","name":"Breaker Block"},
    {"id":"mitigation-block","name":"Mitigation Block"}
  ]},
  {"id":"ict","name":"ICT","playbooks":[
    {"id":"silver-bullet","name":"Silver Bullet"},
    {"id":"2022-model","name":"2022 Model"},
    {"id":"judas-swing","name":"Judas Swing"},
    {"id":"killzone","name":"Killzone"},
    {"id":"ote","name":"OTE (Optimal Trade Entry)"}
  ]},
  {"id":"price-action","name":"Price Action","playbooks":[
    {"id":"pin-bar","name":"Pin Bar"},
    {"id":"engulfing","name":"Engulfing"},
    {"id":"inside-bar","name":"Inside Bar"},
    {"id":"fakeout-trap","name":"Fakeout / Trap"}
  ]},
  {"id":"supply-demand","name":"Supply & Demand","playbooks":[
    {"id":"fresh-zone","name":"Fresh Zone"},
    {"id":"reclaimed-zone","name":"Reclaimed Zone"},
    {"id":"drop-base-drop","name":"Drop-Base-Drop"},
    {"id":"rally-base-rally","name":"Rally-Base-Rally"}
  ]},
  {"id":"trend-following","name":"Trend Following","playbooks":[
    {"id":"pullback","name":"Pullback Entry"},
    {"id":"breakout","name":"Breakout Entry"},
    {"id":"ma-cross","name":"Moving Average Cross"},
    {"id":"channel","name":"Channel Trading"}
  ]},
  {"id":"mean-reversion","name":"Mean Reversion","playbooks":[
    {"id":"ob-os","name":"Overbought/Oversold"},
    {"id":"bb-reversal","name":"Bollinger Band Reversal"},
    {"id":"range-bound","name":"Range Bound"},
    {"id":"divergence","name":"Divergence Play"}
  ]},
  {"id":"session-trading","name":"Session Trading","playbooks":[
    {"id":"london-open","name":"London Open"},
    {"id":"ny-open","name":"NY Open"},
    {"id":"london-close","name":"London Close"},
    {"id":"asian","name":"Asian Session"}
  ]},
  {"id":"multi-timeframe","name":"Multi-Timeframe","playbooks":[
    {"id":"top-down","name":"Top-Down Analysis"},
    {"id":"htf-ltf","name":"HTF + LTF Confluence"},
    {"id":"3-timeframe","name":"3-Timeframe Rule"}
  ]},
  {"id":"fundamental","name":"Fundamental","playbooks":[
    {"id":"news-release","name":"News Release"},
    {"id":"central-bank","name":"Central Bank Play"},
    {"id":"earnings","name":"Earnings Play"}
  ]}
]'::jsonb
WHERE strategies_list IS NULL OR jsonb_array_length(strategies_list) = 0;

-- 3. Convert old flat strategies_list ("Strategy | Playbook" strings) to nested structure
DO $$
DECLARE
  rec RECORD;
  old_item jsonb;
  new_strategies jsonb := '[]'::jsonb;
  strategy_name text;
  playbook_name text;
  strategy_id text;
  playbook_id text;
  existing_strategy jsonb;
  existing_strategies jsonb;
BEGIN
  FOR rec IN SELECT id, strategies_list FROM user_settings LOOP
    IF rec.strategies_list IS NULL OR jsonb_array_length(rec.strategies_list) = 0 THEN
      -- Empty/null: leave as-is, app will fall back to DEFAULT_STRATEGIES
      CONTINUE;
    END IF;

    -- Check if already nested (first item has playbooks array)
    IF (rec.strategies_list->0) ? 'playbooks' THEN
      CONTINUE;
    END IF;

    existing_strategies := '[]'::jsonb;

    FOR old_item IN SELECT * FROM jsonb_array_elements(rec.strategies_list) LOOP
      strategy_name := split_part(COALESCE(old_item->>'label', old_item->>'name', ''), '|', 1);
      playbook_name := split_part(COALESCE(old_item->>'label', old_item->>'name', ''), '|', 2);
      strategy_name := trim(strategy_name);
      playbook_name := trim(playbook_name);

      IF strategy_name = '' THEN
        strategy_name := 'Custom';
      END IF;
      IF playbook_name = '' THEN
        playbook_name := strategy_name;
      END IF;

      strategy_id := lower(regexp_replace(strategy_name, '[^a-zA-Z0-9]+', '-', 'g'));
      playbook_id := substr(md5(random()::text), 1, 10);

      -- Find existing strategy in our working array
      existing_strategy := null;
      FOR i IN 0 .. jsonb_array_length(existing_strategies) - 1 LOOP
        IF (existing_strategies->i->>'name') = strategy_name THEN
          existing_strategy := existing_strategies->i;
          EXIT;
        END IF;
      END LOOP;

      IF existing_strategy IS NULL THEN
        existing_strategies := existing_strategies || jsonb_build_object(
          'id', strategy_id,
          'name', strategy_name,
          'playbooks', jsonb_build_array(
            jsonb_build_object('id', playbook_id, 'name', playbook_name)
          )
        );
      ELSE
        existing_strategies := jsonb_set(
          existing_strategies,
          ARRAY[
            (SELECT i FROM generate_series(0, jsonb_array_length(existing_strategies) - 1) AS i
             WHERE (existing_strategies->i->>'name') = strategy_name)::text,
            'playbooks'
          ]::text[],
          (existing_strategy->'playbooks') || jsonb_build_object('id', playbook_id, 'name', playbook_name),
          false
        );
      END IF;
    END LOOP;

    UPDATE user_settings
    SET strategies_list = existing_strategies
    WHERE id = rec.id;
  END LOOP;
END
$$;

-- 4. Expand default asset list for existing users (merge, preserving custom assets)
DO $$
DECLARE
  default_assets jsonb := '[
    {"symbol":"XAUUSD","asset_class":"Commodities","custom":false},
    {"symbol":"XAGUSD","asset_class":"Commodities","custom":false},
    {"symbol":"USOIL","asset_class":"Commodities","custom":false},
    {"symbol":"UKOIL","asset_class":"Commodities","custom":false},
    {"symbol":"NATGAS","asset_class":"Commodities","custom":false},
    {"symbol":"COPPER","asset_class":"Commodities","custom":false},
    {"symbol":"WTI","asset_class":"Commodities","custom":false},
    {"symbol":"BRENT","asset_class":"Commodities","custom":false},
    {"symbol":"EURUSD","asset_class":"Forex","custom":false},
    {"symbol":"GBPUSD","asset_class":"Forex","custom":false},
    {"symbol":"USDCAD","asset_class":"Forex","custom":false},
    {"symbol":"NZDUSD","asset_class":"Forex","custom":false},
    {"symbol":"USDCHF","asset_class":"Forex","custom":false},
    {"symbol":"GBPJPY","asset_class":"Forex","custom":false},
    {"symbol":"EURJPY","asset_class":"Forex","custom":false},
    {"symbol":"AUDUSD","asset_class":"Forex","custom":false},
    {"symbol":"USDJPY","asset_class":"Forex","custom":false},
    {"symbol":"AUDJPY","asset_class":"Forex","custom":false},
    {"symbol":"CADJPY","asset_class":"Forex","custom":false},
    {"symbol":"CHFJPY","asset_class":"Forex","custom":false},
    {"symbol":"EURAUD","asset_class":"Forex","custom":false},
    {"symbol":"EURCHF","asset_class":"Forex","custom":false},
    {"symbol":"EURGBP","asset_class":"Forex","custom":false},
    {"symbol":"GBPAUD","asset_class":"Forex","custom":false},
    {"symbol":"GBPCAD","asset_class":"Forex","custom":false},
    {"symbol":"NZDJPY","asset_class":"Forex","custom":false},
    {"symbol":"EURNZD","asset_class":"Forex","custom":false},
    {"symbol":"AUDCHF","asset_class":"Forex","custom":false},
    {"symbol":"AUDNZD","asset_class":"Forex","custom":false},
    {"symbol":"CADCHF","asset_class":"Forex","custom":false},
    {"symbol":"GBPNZD","asset_class":"Forex","custom":false},
    {"symbol":"GBPCHF","asset_class":"Forex","custom":false},
    {"symbol":"BTCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ETHUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SOLUSD","asset_class":"Crypto","custom":false},
    {"symbol":"XRPUSD","asset_class":"Crypto","custom":false},
    {"symbol":"DOGEUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ADAUSD","asset_class":"Crypto","custom":false},
    {"symbol":"AVAXUSD","asset_class":"Crypto","custom":false},
    {"symbol":"LINKUSD","asset_class":"Crypto","custom":false},
    {"symbol":"DOTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"MATICUSD","asset_class":"Crypto","custom":false},
    {"symbol":"LTCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BNBUSD","asset_class":"Crypto","custom":false},
    {"symbol":"UNIUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ATOMUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ICPUSD","asset_class":"Crypto","custom":false},
    {"symbol":"APTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"NEARUSD","asset_class":"Crypto","custom":false},
    {"symbol":"FILUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ETCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"AAVEUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ALGOUSD","asset_class":"Crypto","custom":false},
    {"symbol":"THETAUSD","asset_class":"Crypto","custom":false},
    {"symbol":"XTZUSD","asset_class":"Crypto","custom":false},
    {"symbol":"FTMUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SANDUSD","asset_class":"Crypto","custom":false},
    {"symbol":"MANAUSD","asset_class":"Crypto","custom":false},
    {"symbol":"AXSUSD","asset_class":"Crypto","custom":false},
    {"symbol":"FLOWUSD","asset_class":"Crypto","custom":false},
    {"symbol":"CHZUSD","asset_class":"Crypto","custom":false},
    {"symbol":"HBARUSD","asset_class":"Crypto","custom":false},
    {"symbol":"QNTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"VETUSD","asset_class":"Crypto","custom":false},
    {"symbol":"IOTAUSD","asset_class":"Crypto","custom":false},
    {"symbol":"EGLDUSD","asset_class":"Crypto","custom":false},
    {"symbol":"XLMUSD","asset_class":"Crypto","custom":false},
    {"symbol":"TRXUSD","asset_class":"Crypto","custom":false},
    {"symbol":"EOSUSD","asset_class":"Crypto","custom":false},
    {"symbol":"DASHUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ZECUSD","asset_class":"Crypto","custom":false},
    {"symbol":"XMRUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BCHUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BSVUSD","asset_class":"Crypto","custom":false},
    {"symbol":"NEOUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ONTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BATUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ENJUSD","asset_class":"Crypto","custom":false},
    {"symbol":"COMPUSD","asset_class":"Crypto","custom":false},
    {"symbol":"MKRUSD","asset_class":"Crypto","custom":false},
    {"symbol":"YFIUSD","asset_class":"Crypto","custom":false},
    {"symbol":"UMAUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BALUSD","asset_class":"Crypto","custom":false},
    {"symbol":"CRVUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SUSHIUSD","asset_class":"Crypto","custom":false},
    {"symbol":"RENUSD","asset_class":"Crypto","custom":false},
    {"symbol":"LRCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"KNCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BANDUSD","asset_class":"Crypto","custom":false},
    {"symbol":"STORJUSD","asset_class":"Crypto","custom":false},
    {"symbol":"OXTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ZRXUSD","asset_class":"Crypto","custom":false},
    {"symbol":"GRTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"CELOUSD","asset_class":"Crypto","custom":false},
    {"symbol":"WAVESUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SNXUSD","asset_class":"Crypto","custom":false},
    {"symbol":"KSMUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ARUSD","asset_class":"Crypto","custom":false},
    {"symbol":"RVNUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ZILUSD","asset_class":"Crypto","custom":false},
    {"symbol":"ONEUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SKLUSD","asset_class":"Crypto","custom":false},
    {"symbol":"RLCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"SXPUSD","asset_class":"Crypto","custom":false},
    {"symbol":"COTIUSD","asset_class":"Crypto","custom":false},
    {"symbol":"KEEPUSD","asset_class":"Crypto","custom":false},
    {"symbol":"TUSD","asset_class":"Crypto","custom":false},
    {"symbol":"PAXUSD","asset_class":"Crypto","custom":false},
    {"symbol":"USDCUSD","asset_class":"Crypto","custom":false},
    {"symbol":"DAIUSD","asset_class":"Crypto","custom":false},
    {"symbol":"BUSDUSD","asset_class":"Crypto","custom":false},
    {"symbol":"USDTUSD","asset_class":"Crypto","custom":false},
    {"symbol":"MSFT","asset_class":"Stocks","custom":false},
    {"symbol":"NVDA","asset_class":"Stocks","custom":false},
    {"symbol":"GOOGL","asset_class":"Stocks","custom":false},
    {"symbol":"AMZN","asset_class":"Stocks","custom":false},
    {"symbol":"TSLA","asset_class":"Stocks","custom":false},
    {"symbol":"AAPL","asset_class":"Stocks","custom":false},
    {"symbol":"META","asset_class":"Stocks","custom":false},
    {"symbol":"AMD","asset_class":"Stocks","custom":false},
    {"symbol":"NFLX","asset_class":"Stocks","custom":false},
    {"symbol":"CRM","asset_class":"Stocks","custom":false},
    {"symbol":"BABA","asset_class":"Stocks","custom":false},
    {"symbol":"UBER","asset_class":"Stocks","custom":false},
    {"symbol":"COIN","asset_class":"Stocks","custom":false},
    {"symbol":"PLTR","asset_class":"Stocks","custom":false},
    {"symbol":"INTC","asset_class":"Stocks","custom":false},
    {"symbol":"ADBE","asset_class":"Stocks","custom":false},
    {"symbol":"PYPL","asset_class":"Stocks","custom":false},
    {"symbol":"NKE","asset_class":"Stocks","custom":false},
    {"symbol":"DIS","asset_class":"Stocks","custom":false},
    {"symbol":"V","asset_class":"Stocks","custom":false},
    {"symbol":"MA","asset_class":"Stocks","custom":false},
    {"symbol":"JPM","asset_class":"Stocks","custom":false},
    {"symbol":"BAC","asset_class":"Stocks","custom":false},
    {"symbol":"WFC","asset_class":"Stocks","custom":false},
    {"symbol":"C","asset_class":"Stocks","custom":false},
    {"symbol":"GS","asset_class":"Stocks","custom":false},
    {"symbol":"MS","asset_class":"Stocks","custom":false},
    {"symbol":"BLK","asset_class":"Stocks","custom":false},
    {"symbol":"BRK.B","asset_class":"Stocks","custom":false},
    {"symbol":"KO","asset_class":"Stocks","custom":false},
    {"symbol":"PEP","asset_class":"Stocks","custom":false},
    {"symbol":"WMT","asset_class":"Stocks","custom":false},
    {"symbol":"COST","asset_class":"Stocks","custom":false},
    {"symbol":"HD","asset_class":"Stocks","custom":false},
    {"symbol":"LOW","asset_class":"Stocks","custom":false},
    {"symbol":"TGT","asset_class":"Stocks","custom":false},
    {"symbol":"MCD","asset_class":"Stocks","custom":false},
    {"symbol":"SBUX","asset_class":"Stocks","custom":false},
    {"symbol":"PFE","asset_class":"Stocks","custom":false},
    {"symbol":"JNJ","asset_class":"Stocks","custom":false},
    {"symbol":"UNH","asset_class":"Stocks","custom":false},
    {"symbol":"ABBV","asset_class":"Stocks","custom":false},
    {"symbol":"MRK","asset_class":"Stocks","custom":false},
    {"symbol":"LLY","asset_class":"Stocks","custom":false},
    {"symbol":"TMO","asset_class":"Stocks","custom":false},
    {"symbol":"ABT","asset_class":"Stocks","custom":false},
    {"symbol":"BMY","asset_class":"Stocks","custom":false},
    {"symbol":"XOM","asset_class":"Stocks","custom":false},
    {"symbol":"CVX","asset_class":"Stocks","custom":false},
    {"symbol":"COP","asset_class":"Stocks","custom":false},
    {"symbol":"OXY","asset_class":"Stocks","custom":false},
    {"symbol":"SLB","asset_class":"Stocks","custom":false},
    {"symbol":"HAL","asset_class":"Stocks","custom":false},
    {"symbol":"BP","asset_class":"Stocks","custom":false},
    {"symbol":"SHEL","asset_class":"Stocks","custom":false},
    {"symbol":"TTE","asset_class":"Stocks","custom":false},
    {"symbol":"BA","asset_class":"Stocks","custom":false},
    {"symbol":"LMT","asset_class":"Stocks","custom":false},
    {"symbol":"RTX","asset_class":"Stocks","custom":false},
    {"symbol":"NOC","asset_class":"Stocks","custom":false},
    {"symbol":"CAT","asset_class":"Stocks","custom":false},
    {"symbol":"DE","asset_class":"Stocks","custom":false},
    {"symbol":"GE","asset_class":"Stocks","custom":false},
    {"symbol":"HON","asset_class":"Stocks","custom":false},
    {"symbol":"UPS","asset_class":"Stocks","custom":false},
    {"symbol":"FDX","asset_class":"Stocks","custom":false},
    {"symbol":"DAL","asset_class":"Stocks","custom":false},
    {"symbol":"UAL","asset_class":"Stocks","custom":false},
    {"symbol":"AAL","asset_class":"Stocks","custom":false},
    {"symbol":"LUV","asset_class":"Stocks","custom":false},
    {"symbol":"TMUS","asset_class":"Stocks","custom":false},
    {"symbol":"VZ","asset_class":"Stocks","custom":false},
    {"symbol":"T","asset_class":"Stocks","custom":false},
    {"symbol":"CMCSA","asset_class":"Stocks","custom":false},
    {"symbol":"CHTR","asset_class":"Stocks","custom":false},
    {"symbol":"SPOT","asset_class":"Stocks","custom":false},
    {"symbol":"SNAP","asset_class":"Stocks","custom":false},
    {"symbol":"TWTR","asset_class":"Stocks","custom":false},
    {"symbol":"PINS","asset_class":"Stocks","custom":false},
    {"symbol":"ZM","asset_class":"Stocks","custom":false},
    {"symbol":"DOCU","asset_class":"Stocks","custom":false},
    {"symbol":"SQ","asset_class":"Stocks","custom":false},
    {"symbol":"SHOP","asset_class":"Stocks","custom":false},
    {"symbol":"SE","asset_class":"Stocks","custom":false},
    {"symbol":"MELI","asset_class":"Stocks","custom":false},
    {"symbol":"JD","asset_class":"Stocks","custom":false},
    {"symbol":"PDD","asset_class":"Stocks","custom":false},
    {"symbol":"BIDU","asset_class":"Stocks","custom":false},
    {"symbol":"TCEHY","asset_class":"Stocks","custom":false},
    {"symbol":"NTES","asset_class":"Stocks","custom":false},
    {"symbol":"ROKU","asset_class":"Stocks","custom":false},
    {"symbol":"FSLY","asset_class":"Stocks","custom":false},
    {"symbol":"NET","asset_class":"Stocks","custom":false},
    {"symbol":"DDOG","asset_class":"Stocks","custom":false},
    {"symbol":"OKTA","asset_class":"Stocks","custom":false},
    {"symbol":"CRWD","asset_class":"Stocks","custom":false},
    {"symbol":"SPLK","asset_class":"Stocks","custom":false},
    {"symbol":"NOW","asset_class":"Stocks","custom":false},
    {"symbol":"TEAM","asset_class":"Stocks","custom":false},
    {"symbol":"ATLASSIAN","asset_class":"Stocks","custom":false},
    {"symbol":"SNOW","asset_class":"Stocks","custom":false},
    {"symbol":"UPST","asset_class":"Stocks","custom":false},
    {"symbol":"SOFI","asset_class":"Stocks","custom":false},
    {"symbol":"RIVN","asset_class":"Stocks","custom":false},
    {"symbol":"LCID","asset_class":"Stocks","custom":false},
    {"symbol":"NIO","asset_class":"Stocks","custom":false},
    {"symbol":"XPEV","asset_class":"Stocks","custom":false},
    {"symbol":"LI","asset_class":"Stocks","custom":false},
    {"symbol":"DIDI","asset_class":"Stocks","custom":false},
    {"symbol":"BEKE","asset_class":"Stocks","custom":false},
    {"symbol":"IQ","asset_class":"Stocks","custom":false},
    {"symbol":"HUYA","asset_class":"Stocks","custom":false},
    {"symbol":"BILI","asset_class":"Stocks","custom":false},
    {"symbol":"IGG","asset_class":"Stocks","custom":false},
    {"symbol":"KWEB","asset_class":"Stocks","custom":false},
    {"symbol":"ARKK","asset_class":"Stocks","custom":false},
    {"symbol":"QQQ","asset_class":"Stocks","custom":false},
    {"symbol":"SPY","asset_class":"Stocks","custom":false},
    {"symbol":"VTI","asset_class":"Stocks","custom":false},
    {"symbol":"YM1!","asset_class":"Futures","custom":false},
    {"symbol":"ES1!","asset_class":"Futures","custom":false},
    {"symbol":"NQ1!","asset_class":"Futures","custom":false},
    {"symbol":"MES1!","asset_class":"Futures","custom":false},
    {"symbol":"MYM1!","asset_class":"Futures","custom":false},
    {"symbol":"MNQ1!","asset_class":"Futures","custom":false},
    {"symbol":"RTY1!","asset_class":"Futures","custom":false},
    {"symbol":"M2K1!","asset_class":"Futures","custom":false},
    {"symbol":"CL1!","asset_class":"Futures","custom":false},
    {"symbol":"GC1!","asset_class":"Futures","custom":false},
    {"symbol":"SI1!","asset_class":"Futures","custom":false},
    {"symbol":"HG1!","asset_class":"Futures","custom":false},
    {"symbol":"ZB1!","asset_class":"Futures","custom":false},
    {"symbol":"ZN1!","asset_class":"Futures","custom":false},
    {"symbol":"DX1!","asset_class":"Futures","custom":false},
    {"symbol":"NG1!","asset_class":"Futures","custom":false},
    {"symbol":"RB1!","asset_class":"Futures","custom":false},
    {"symbol":"HO1!","asset_class":"Futures","custom":false},
    {"symbol":"KC1!","asset_class":"Futures","custom":false},
    {"symbol":"CT1!","asset_class":"Futures","custom":false},
    {"symbol":"SB1!","asset_class":"Futures","custom":false},
    {"symbol":"CC1!","asset_class":"Futures","custom":false},
    {"symbol":"LC1!","asset_class":"Futures","custom":false},
    {"symbol":"LH1!","asset_class":"Futures","custom":false},
    {"symbol":"ZW1!","asset_class":"Futures","custom":false},
    {"symbol":"ZC1!","asset_class":"Futures","custom":false},
    {"symbol":"ZS1!","asset_class":"Futures","custom":false},
    {"symbol":"ZM1!","asset_class":"Futures","custom":false},
    {"symbol":"ZL1!","asset_class":"Futures","custom":false},
    {"symbol":"KE1!","asset_class":"Futures","custom":false},
    {"symbol":"O1!","asset_class":"Futures","custom":false},
    {"symbol":"RR1!","asset_class":"Futures","custom":false},
    {"symbol":"6E1!","asset_class":"Futures","custom":false},
    {"symbol":"6B1!","asset_class":"Futures","custom":false},
    {"symbol":"6J1!","asset_class":"Futures","custom":false},
    {"symbol":"6A1!","asset_class":"Futures","custom":false},
    {"symbol":"6C1!","asset_class":"Futures","custom":false},
    {"symbol":"6S1!","asset_class":"Futures","custom":false},
    {"symbol":"6N1!","asset_class":"Futures","custom":false},
    {"symbol":"6M1!","asset_class":"Futures","custom":false},
    {"symbol":"DXY","asset_class":"Indices","custom":false},
    {"symbol":"VIX","asset_class":"Indices","custom":false},
    {"symbol":"US30","asset_class":"Indices","custom":false},
    {"symbol":"US500","asset_class":"Indices","custom":false},
    {"symbol":"US100","asset_class":"Indices","custom":false},
    {"symbol":"DE40","asset_class":"Indices","custom":false},
    {"symbol":"GER40","asset_class":"Indices","custom":false},
    {"symbol":"UK100","asset_class":"Indices","custom":false},
    {"symbol":"JP225","asset_class":"Indices","custom":false},
    {"symbol":"NIKKEI","asset_class":"Indices","custom":false},
    {"symbol":"JPN225","asset_class":"Indices","custom":false},
    {"symbol":"AU200","asset_class":"Indices","custom":false},
    {"symbol":"AUS200","asset_class":"Indices","custom":false},
    {"symbol":"FR40","asset_class":"Indices","custom":false},
    {"symbol":"EU50","asset_class":"Indices","custom":false},
    {"symbol":"HK50","asset_class":"Indices","custom":false},
    {"symbol":"HSI","asset_class":"Indices","custom":false},
    {"symbol":"CN50","asset_class":"Indices","custom":false},
    {"symbol":"SG30","asset_class":"Indices","custom":false},
    {"symbol":"IN50","asset_class":"Indices","custom":false},
    {"symbol":"SA40","asset_class":"Indices","custom":false},
    {"symbol":"BR50","asset_class":"Indices","custom":false},
    {"symbol":"MX35","asset_class":"Indices","custom":false},
    {"symbol":"RUSS2000","asset_class":"Indices","custom":false},
    {"symbol":"SPX","asset_class":"Indices","custom":false},
    {"symbol":"NDX","asset_class":"Indices","custom":false},
    {"symbol":"DJI","asset_class":"Indices","custom":false},
    {"symbol":"FTSE","asset_class":"Indices","custom":false},
    {"symbol":"CAC","asset_class":"Indices","custom":false},
    {"symbol":"DAX","asset_class":"Indices","custom":false},
    {"symbol":"IBEX","asset_class":"Indices","custom":false},
    {"symbol":"MIB","asset_class":"Indices","custom":false},
    {"symbol":"AEX","asset_class":"Indices","custom":false},
    {"symbol":"SMI","asset_class":"Indices","custom":false},
    {"symbol":"OMXS30","asset_class":"Indices","custom":false},
    {"symbol":"OBX","asset_class":"Indices","custom":false},
    {"symbol":"WIG20","asset_class":"Indices","custom":false},
    {"symbol":"BUX","asset_class":"Indices","custom":false},
    {"symbol":"BET","asset_class":"Indices","custom":false},
    {"symbol":"PX","asset_class":"Indices","custom":false},
    {"symbol":"MOEX","asset_class":"Indices","custom":false},
    {"symbol":"RTS","asset_class":"Indices","custom":false},
    {"symbol":"TAIEX","asset_class":"Indices","custom":false},
    {"symbol":"KOSPI","asset_class":"Indices","custom":false},
    {"symbol":"N225","asset_class":"Indices","custom":false},
    {"symbol":"TOPIX","asset_class":"Indices","custom":false},
    {"symbol":"HSCEI","asset_class":"Indices","custom":false},
    {"symbol":"CSI300","asset_class":"Indices","custom":false},
    {"symbol":"SSE","asset_class":"Indices","custom":false},
    {"symbol":"SZSE","asset_class":"Indices","custom":false}
  ]'::jsonb;
  rec RECORD;
  user_assets jsonb;
  merged jsonb;
BEGIN
  FOR rec IN SELECT id, asset_list FROM user_settings LOOP
    user_assets := COALESCE(rec.asset_list, '[]'::jsonb);

    -- Keep only custom assets (custom = true) and non-default assets not in the new default list
    user_assets := (
      SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
      FROM jsonb_array_elements(user_assets) AS item
      WHERE (item->>'custom')::boolean = true
         OR NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(default_assets) AS d
           WHERE d->>'symbol' = item->>'symbol'
         )
    );

    -- Merge defaults + preserved custom/unique assets
    merged := default_assets || user_assets;

    UPDATE user_settings
    SET asset_list = merged
    WHERE id = rec.id;
  END LOOP;
END
$$;
