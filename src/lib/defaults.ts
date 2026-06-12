import { StrategyPlaybook } from "@/types";

export const DEFAULT_STRATEGIES: StrategyPlaybook[] = [
  {
    id: "wyckoff",
    name: "Wyckoff",
    playbooks: [
      { id: "blue-box", name: "Blue Box Strategy" },
      { id: "spring-utad", name: "Spring/UTAD Strategy" },
      { id: "classical", name: "Classical Strategy" },
      { id: "reaccumulation", name: "Re-accumulation Entry" },
      { id: "redistribution", name: "Re-distribution Entry" },
    ],
  },
  {
    id: "smc",
    name: "SMC (Smart Money)",
    playbooks: [
      { id: "choch", name: "ChoCh Entry" },
      { id: "continuation", name: "Continuation" },
      { id: "liquidity-sweep", name: "Liquidity Sweep" },
      { id: "breaker-block", name: "Breaker Block" },
      { id: "mitigation-block", name: "Mitigation Block" },
    ],
  },
  {
    id: "ict",
    name: "ICT",
    playbooks: [
      { id: "silver-bullet", name: "Silver Bullet" },
      { id: "2022-model", name: "2022 Model" },
      { id: "judas-swing", name: "Judas Swing" },
      { id: "killzone", name: "Killzone" },
      { id: "ote", name: "OTE (Optimal Trade Entry)" },
    ],
  },
  {
    id: "price-action",
    name: "Price Action",
    playbooks: [
      { id: "pin-bar", name: "Pin Bar" },
      { id: "engulfing", name: "Engulfing" },
      { id: "inside-bar", name: "Inside Bar" },
      { id: "fakeout-trap", name: "Fakeout / Trap" },
    ],
  },
  {
    id: "supply-demand",
    name: "Supply & Demand",
    playbooks: [
      { id: "fresh-zone", name: "Fresh Zone" },
      { id: "reclaimed-zone", name: "Reclaimed Zone" },
      { id: "drop-base-drop", name: "Drop-Base-Drop" },
      { id: "rally-base-rally", name: "Rally-Base-Rally" },
    ],
  },
  {
    id: "trend-following",
    name: "Trend Following",
    playbooks: [
      { id: "pullback", name: "Pullback Entry" },
      { id: "breakout", name: "Breakout Entry" },
      { id: "ma-cross", name: "Moving Average Cross" },
      { id: "channel", name: "Channel Trading" },
    ],
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    playbooks: [
      { id: "ob-os", name: "Overbought/Oversold" },
      { id: "bb-reversal", name: "Bollinger Band Reversal" },
      { id: "range-bound", name: "Range Bound" },
      { id: "divergence", name: "Divergence Play" },
    ],
  },
  {
    id: "session-trading",
    name: "Session Trading",
    playbooks: [
      { id: "london-open", name: "London Open" },
      { id: "ny-open", name: "NY Open" },
      { id: "london-close", name: "London Close" },
      { id: "asian", name: "Asian Session" },
    ],
  },
  {
    id: "multi-timeframe",
    name: "Multi-Timeframe",
    playbooks: [
      { id: "top-down", name: "Top-Down Analysis" },
      { id: "htf-ltf", name: "HTF + LTF Confluence" },
      { id: "3-timeframe", name: "3-Timeframe Rule" },
    ],
  },
  {
    id: "fundamental",
    name: "Fundamental",
    playbooks: [
      { id: "news-release", name: "News Release" },
      { id: "central-bank", name: "Central Bank Play" },
      { id: "earnings", name: "Earnings Play" },
    ],
  },
];

const ASSET_SEEDS = [
  // Commodities
  "XAUUSD,XAGUSD,USOIL,UKOIL,NATGAS,COPPER,WTI,BRENT",
  // Forex
  "EURUSD,GBPUSD,USDCAD,NZDUSD,USDCHF,GBPJPY,EURJPY,AUDUSD,USDJPY,AUDJPY,CADJPY,CHFJPY,EURAUD,EURCHF,EURGBP,GBPAUD,GBPCAD,NZDJPY,EURNZD,AUDCHF,AUDNZD,CADCHF,GBPNZD,GBPCHF",
  // Crypto
  "BTCUSD,ETHUSD,SOLUSD,XRPUSD,DOGEUSD,ADAUSD,AVAXUSD,LINKUSD,DOTUSD,MATICUSD,LTCUSD,BNBUSD,UNIUSD,ATOMUSD,ICPUSD,APTUSD,NEARUSD,FILUSD,ETCUSD,AAVEUSD,ALGOUSD,THETAUSD,XTZUSD,FTMUSD,SANDUSD,MANAUSD,AXSUSD,FLOWUSD,CHZUSD,HBARUSD,QNTUSD,VETUSD,IOTAUSD,EGLDUSD,XLMUSD,TRXUSD,EOSUSD,DASHUSD,ZECUSD,XMRUSD,BCHUSD,BSVUSD,NEOUSD,ONTUSD,BATUSD,ENJUSD,COMPUSD,MKRUSD,YFIUSD,UMAUSD,BALUSD,CRVUSD,SUSHIUSD,RENUSD,LRCUSD,KNCUSD,BANDUSD,STORJUSD,OXTUSD,ZRXUSD,GRTUSD,CELOUSD,WAVESUSD,SNXUSD,KSMUSD,ARUSD,RVNUSD,ZILUSD,ONEUSD,SKLUSD,RLCUSD,SXPUSD,COTIUSD,KEEPUSD,TUSD,PAXUSD,USDCUSD,DAIUSD,BUSDUSD,USDTUSD",
  // Stocks
  "MSFT,NVDA,GOOGL,AMZN,TSLA,AAPL,META,AMD,NFLX,CRM,BABA,UBER,COIN,PLTR,INTC,ADBE,PYPL,NKE,DIS,V,MA,JPM,BAC,WFC,C,GS,MS,BLK,BRK.B,KO,PEP,WMT,COST,HD,LOW,TGT,MCD,SBUX,PFE,JNJ,UNH,ABBV,MRK,LLY,TMO,ABT,BMY,XOM,CVX,COP,OXY,SLB,HAL,BP,SHEL,TTE,BA,LMT,RTX,NOC,CAT,DE,GE,HON,UPS,FDX,DAL,UAL,AAL,LUV,TMUS,VZ,T,CMCSA,CHTR,SPOT,SNAP,TWTR,PINS,ZM,DOCU,SQ,SHOP,SE,MELI,JD,PDD,BIDU,TCEHY,NTES,ROKU,FSLY,NET,DDOG,OKTA,CRWD,SPLK,NOW,TEAM,ATLASSIAN,SNOW,UPST,SOFI,RIVN,LCID,NIO,XPEV,LI,DIDI,BEKE,IQ,HUYA,BILI,IGG,KWEB,ARKK,QQQ,SPY,VTI",
  // Futures
  "YM1!,ES1!,NQ1!,MES1!,MYM1!,MNQ1!,RTY1!,M2K1!,CL1!,GC1!,SI1!,HG1!,ZB1!,ZN1!,DX1!,NG1!,RB1!,HO1!,KC1!,CT1!,SB1!,CC1!,LC1!,LH1!,ZW1!,ZC1!,ZS1!,ZM1!,ZL1!,KE1!,O1!,RR1!,6E1!,6B1!,6J1!,6A1!,6C1!,6S1!,6N1!,6M1!",
  // Indices
  "DXY,VIX,US30,US500,US100,DE40,GER40,UK100,JP225,NIKKEI,JPN225,AU200,AUS200,FR40,EU50,HK50,HSI,CN50,SG30,IN50,SA40,BR50,MX35,RUSS2000,SPX,NDX,DJI,FTSE,CAC,DAX,IBEX,MIB,AEX,SMI,OMXS30,OBX,WIG20,BUX,BET,PX,MOEX,RTS,TAIEX,KOSPI,N225,TOPIX,HSCEI,CSI300,SSE,SZSE",
];

export const DEFAULT_SESSIONS = [
  { id: "asia", label: "Asia", start_time: "00:00", end_time: "06:00" },
  { id: "london", label: "London", start_time: "06:00", end_time: "16:00" },
  { id: "overlap", label: "London/NYSE Overlap", start_time: "14:30", end_time: "16:00" },
  { id: "nyse", label: "NYSE", start_time: "16:00", end_time: "21:00" },
  { id: "off-hours", label: "Off-Hours", start_time: "21:00", end_time: "23:59" },
];

export const DEFAULT_CRITERIA_BY_STRATEGY: Record<string, string[]> = {
  Wyckoff: [
    "Valid Accumulation/Distribution Schematic",
    "Spring or UTAD Present",
    "Volume Confirmation",
    "Sign of Strength (SOS) / Weakness (SOW)",
    "LPS or Test of Support",
    "Trend Alignment with Higher TF",
  ],
  "SMC (Smart Money)": [
    "Liquidity Sweep Identified",
    "Fair Value Gap / Imbalance Present",
    "Breaker / Mitigation Block",
    "Order Block Refinement",
    "Inducement Cleared",
    "Trend Alignment with Higher TF",
  ],
  ICT: [
    "Killzone Active",
    "Fair Value Gap (FVG) Present",
    "Optimal Trade Entry Zone",
    "Judas Swing Identified",
    "Market Structure Shift",
    "2022 Model / Silver Bullet Criteria Met",
  ],
  "Price Action": [
    "Clear Reversal Pattern",
    "Pin Bar / Engulfing / Inside Bar",
    "Support/Resistance Context",
    "Trend Alignment",
    "Fakeout / Trap Confirmed",
  ],
  "Supply & Demand": [
    "Fresh Zone or Reclaimed Zone",
    "Drop-Base-Drop / Rally-Base-Rally",
    "Entry at Zone Edge",
    "Momentum into Zone Confirmed",
    "Higher TF Zone Alignment",
  ],
  "Trend Following": [
    "Clear Directional Bias",
    "Pullback / Breakout / MA Cross",
    "Trend Confirmation",
    "No Major S/R Obstruction",
    "Volume on Trend Side",
  ],
  "Mean Reversion": [
    "Overbought/Oversold Signal",
    "Divergence Present",
    "Range Bound Confirmation",
    "Rejection at Range Boundary",
    "Mean Reversion Target Defined",
  ],
  "Session Trading": [
    "Session Time Confirmed",
    "Pre-Session Liquidity Taken",
    "Session-High/Low Reference Set",
    "Killzone or Window Active",
    "Avoid Low-Volume Periods",
  ],
  "Multi-Timeframe": [
    "HTF Bias Aligned",
    "LTF Entry Confirmation",
    "Top-Down Analysis Complete",
    "3-Timeframe Rule Satisfied",
    "Confluence Across TFs",
  ],
  Fundamental: [
    "News/Event Calendar Checked",
    "Expected Volatility Understood",
    "Fundamental Bias Aligned",
    "No Major Conflicting Events",
    "Risk Sized for Event",
  ],
};

export const DEFAULT_ASSETS = ASSET_SEEDS
  .flatMap(group => group.split(",").map(symbol => ({
    symbol,
    asset_class: classifyAsset(symbol),
    custom: false,
  })));

export function normalizeStrategiesList(input: unknown): StrategyPlaybook[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_STRATEGIES;

  // Detect old flat format: [{ id, label/name }]
  const first = input[0];
  if (first && (typeof first.label === "string" || typeof first.name === "string") && !Array.isArray(first.playbooks)) {
    const grouped = new Map<string, { id: string; name: string; playbooks: { id: string; name: string }[] }>();
    input.forEach((item: any) => {
      const raw = (item.label || item.name || "").toString();
      const parts = raw.split("|").map((s: string) => s.trim());
      const strategyName = parts[0] || "Custom";
      const playbookName = parts[1] || raw || "Other";

      if (!grouped.has(strategyName)) {
        grouped.set(strategyName, {
          id: strategyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: strategyName,
          playbooks: [],
        });
      }
      grouped.get(strategyName)!.playbooks.push({
        id: Math.random().toString(36).substring(7),
        name: playbookName,
      });
    });
    return Array.from(grouped.values());
  }

  return input as StrategyPlaybook[];
}

function classifyAsset(symbol: string): string {
  if (["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NATGAS", "COPPER", "WTI", "BRENT"].includes(symbol)) return "Commodities";
  if (["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "DOGEUSD", "ADAUSD", "AVAXUSD", "LINKUSD", "DOTUSD", "MATICUSD", "LTCUSD", "BNBUSD", "UNIUSD", "ATOMUSD", "ICPUSD", "APTUSD", "NEARUSD", "FILUSD", "ETCUSD", "AAVEUSD", "ALGOUSD", "THETAUSD", "XTZUSD", "FTMUSD", "SANDUSD", "MANAUSD", "AXSUSD", "FLOWUSD", "CHZUSD", "HBARUSD", "QNTUSD", "VETUSD", "IOTAUSD", "EGLDUSD", "XLMUSD", "TRXUSD", "EOSUSD", "DASHUSD", "ZECUSD", "XMRUSD", "BCHUSD", "BSVUSD", "NEOUSD", "ONTUSD", "BATUSD", "ENJUSD", "COMPUSD", "MKRUSD", "YFIUSD", "UMAUSD", "BALUSD", "CRVUSD", "SUSHIUSD", "RENUSD", "LRCUSD", "KNCUSD", "BANDUSD", "STORJUSD", "OXTUSD", "ZRXUSD", "GRTUSD", "CELOUSD", "WAVESUSD", "SNXUSD", "KSMUSD", "ARUSD", "RVNUSD", "ZILUSD", "ONEUSD", "SKLUSD", "RLCUSD", "SXPUSD", "COTIUSD", "KEEPUSD", "TUSD", "PAXUSD", "USDCUSD", "DAIUSD", "BUSDUSD", "USDTUSD"].includes(symbol)) return "Crypto";
  if (symbol.endsWith("1!")) return "Futures";
  if (["DXY", "VIX", "US30", "US500", "US100", "DE40", "GER40", "UK100", "JP225", "NIKKEI", "JPN225", "AU200", "AUS200", "FR40", "EU50", "HK50", "HSI", "CN50", "SG30", "IN50", "SA40", "BR50", "MX35", "RUSS2000", "SPX", "NDX", "DJI", "FTSE", "CAC", "DAX", "IBEX", "MIB", "AEX", "SMI", "OMXS30", "OBX", "WIG20", "BUX", "BET", "PX", "MOEX", "RTS", "TAIEX", "KOSPI", "N225", "TOPIX", "HSCEI", "CSI300", "SSE", "SZSE"].includes(symbol)) return "Indices";
  return "Forex";
}
