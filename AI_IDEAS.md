# AI Ideas — WJournal Improvements

> Brainstormed by AI (Cline) for the WJournal trading journal project.
> This document serves as a living roadmap for architecture and analytics enhancements.

> **Last Batch Integrated: Batch 4+5 (2026-06-17)** — Statistics enhancements (session/direction/asset/streaks/duration), Smart Insights expansion (regime/day-of-week/exit-type/payoff-ratio), clipboard paste, trade outcome overhaul.

---

## Table of Contents

1. [Architecture Improvements](#1-architecture-improvements)
2. [Statistics to Maximize Edge](#2-statistics-to-maximize-edge)
3. [Implementation Roadmap](#3-implementation-roadmap)
4. [Quick Wins (Do These First)](#4-quick-wins-do-these-first)
5. [User-Requested Features](#5-user-requested-features)
6. [New Ideas — Session 2026-06-17](#6-new-ideas--session-2026-06-17)

---

## 1. Architecture Improvements

### Current State Analysis

```
Pattern: 100% Client-Side SPA
Every page fetches independently via useEffect
No caching layer
Trade form: ~1000 lines (monolithic)
Settings page: 651 lines
No pagination (hardcoded .limit(100))
No virtualized lists
No global state management
```

**Risks at Scale:**
- Browser freezes with 1,000+ trades
- Redundant API calls (dashboard + stats both fetch trades)
- Full page reloads on portfolio switch
- Zero tests anywhere

---

### Tier 1: Critical Fixes (Do These First)

#### 1.1 Add TanStack Query (React Query)

**Why:** Eliminates redundant fetches, adds automatic background refetching, optimistic updates, and cache invalidation.

**Impact:** Bandwidth reduced by ~60%, instant UI updates, smoother UX.

**Implementation:**
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s
      refetchOnWindowFocus: true,
    },
  },
});

// Usage in components
const { data: trades, isLoading } = useQuery({
  queryKey: ['trades', portfolioId],
  queryFn: () => fetchTrades(portfolioId),
});
```

#### 1.2 Split the Trade Form

**Target Structure:**
```
src/components/trades/
├── trade-form/
│   ├── index.tsx           # Main orchestrator (80 lines)
│   ├── trade-details.tsx   # Symbol, direction, price (120 lines)
│   ├── strategy-section.tsx # Strategy, sub-strategy, criteria (150 lines)
│   ├── risk-section.tsx    # Position sizing, SL, TP levels (140 lines)
│   ├── images-section.tsx  # Cloudinary uploads (100 lines)
│   ├── notes-section.tsx   # Pre/post trade notes (80 lines)
│   └── hooks/
│       ├── use-trade-form.ts
│       ├── use-strategy-presets.ts
│       └── use-image-upload.ts
```

**Benefit:** Maintainable, testable, reusable components.

#### 1.3 Add Pagination to Trade List

**Current:** `supabase.from("trades").select("*").eq("portfolio_id", id)` fetches ALL trades.

**Fix:**
```typescript
const PAGE_SIZE = 25;
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['trades', portfolioId],
  queryFn: ({ pageParam = 0 }) => 
    supabase.from("trades")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)
      .order("trade_date", { ascending: false }),
  getNextPageParam: (lastPage, pages) => 
    lastPage.length === PAGE_SIZE ? pages.length : undefined,
});
```

---

### Tier 2: Scalability (Next Phase)

#### 2.1 Virtualize Large Lists

**Why:** When you hit 500+ trades, DOM rendering becomes the bottleneck.

**Library:** `@tanstack/react-virtual`

**Implementation:**
```typescript
// Only renders visible rows
const rowVirtualizer = useVirtualizer({
  count: trades.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72, // px per row
});
```

#### 2.2 Add Global State (Zustand)

**Why:** Eliminates prop drilling through layout, shares active portfolio state across pages.

**Store:**
```typescript
// src/stores/app-store.ts
import { create } from 'zustand';

interface AppStore {
  activePortfolio: Portfolio | null;
  setActivePortfolio: (p: Portfolio) => void;
  userSettings: UserSettings | null;
  setUserSettings: (s: UserSettings) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activePortfolio: null,
  setActivePortfolio: (p) => set({ activePortfolio: p }),
  userSettings: null,
  setUserSettings: (s) => set({ userSettings: s }),
}));
```

#### 2.3 Database Indexing (Run in Supabase)

```sql
-- Critical indexes for performance
CREATE INDEX idx_trades_user_portfolio ON trades(user_id, portfolio_id);
CREATE INDEX idx_trades_date_status ON trades(trade_date DESC, status);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_account_events_portfolio ON account_events(portfolio_id, event_type);
CREATE INDEX idx_daily_checkins_user ON daily_checkins(user_id, checkin_date DESC);
```

#### 2.4 Realtime Channel Consolidation

**Current:** One channel per page (channel exhaustion risk).

**Fix:** Single global realtime channel that broadcasts to all listeners.

---

### Tier 3: Professional Grade (Long Term)

#### 3.1 Server Components Migration

**Why:** Next.js App Router supports Server Components. Move data fetching to the server to reduce client bundle size and improve initial load time.

**What moves to server:**
- Trade list fetching (paginated)
- Statistics calculation (heavy computation)
- Portfolio switching

**What stays client:**
- Trade form (interactivity)
- Chart interactions
- Realtime updates

#### 3.2 Add Testing Suite

**Priority order:**
1. Unit tests for calculation functions
2. Component tests for trade form validation
3. E2E tests for critical flows (login → add trade → view stats)

```typescript
// Example: tests for calculations
import { calculateWinRate } from '@/lib/calculations';

describe('calculateWinRate', () => {
  it('returns 50% for equal wins/losses', () => {
    const trades = [
      { status: 'Closed - Win', net_pnl: 100 },
      { status: 'Closed - Loss', net_pnl: -100 },
    ];
    expect(calculateWinRate(trades).winRate).toBe(50);
  });
});
```

#### 3.3 Code Splitting & Lazy Loading

```typescript
// Lazy load heavy pages
const StatisticsPage = dynamic(() => import('./statistics/page'), {
  loading: () => <PageSkeleton />,
});
```

#### 3.4 Service Worker / PWA Enhancements

**Add:**
- Offline trade entry (syncs when reconnected)
- Background sync for failed requests
- Push notifications for daily check-in reminders

---

## 2. Statistics to Maximize Edge

### Tier 1: Essential (Add These First)

#### 2.1.1 Sharpe Ratio

**Formula:** (Annualized Return - Risk-Free Rate) / Annualized Volatility

**Why:** The gold standard for risk-adjusted returns. Shows if you're being compensated for the risk you take.

**Target:** > 1.0 is good, > 2.0 is excellent.

```typescript
const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedStdDev;
```

#### 2.1.2 Sortino Ratio

**Formula:** (Annualized Return - Risk-Free Rate) / Downside Deviation

**Why:** Like Sharpe, but only penalizes downside volatility. More realistic for traders who welcome upside volatility.

```typescript
const downsideReturns = returns.filter(r => r < target);
const downsideDeviation = Math.sqrt(
  downsideReturns.reduce((sum, r) => sum + Math.pow(r - target, 2), 0) / downsideReturns.length
);
const sortino = (annualizedReturn - riskFreeRate) / downsideDeviation;
```

#### 2.1.3 Calmar Ratio

**Formula:** Annualized Return / |Max Drawdown|

**Why:** How much return per unit of pain. Excellent for assessing consistency.

```typescript
const calmar = annualizedReturn / Math.abs(maxDrawdown);
```

#### 2.1.4 Consecutive Win/Loss Streaks ✅ Done (Batch 4)

**Metrics:**
- Longest winning streak (current & all-time) ✅
- Longest losing streak (current & all-time) ✅
- Current streak status ✅

#### 2.1.5 Monthly Performance Table

```
Month    | Trades | Win% | Avg R | P&L    | vs Avg | Running
---------|--------|------|-------|--------|--------|--------
Jan 2026 |   12   | 58%  | 1.8R  | +$450  |   ↑    | +$450
Feb 2026 |   15   | 47%  | 0.9R  | -$120  |   ↓    | +$330
Mar 2026 |   10   | 60%  | 2.1R  | +$680  |   ↑    | +$1010
```

**Add sparkline chart per month for visual trend.**

#### 2.1.6 Risk of Ruin

**Formula:** Probability of losing X% of account before doubling it.

**Why:** The most important metric most traders ignore. Tells you if your strategy is mathematically viable.

```typescript
// Simple formula (Balsara)
const riskOfRuin = Math.pow(
  (1 - winRate) / winRate,
  accountBalance / avgRiskPerTrade
);
```

---

### Tier 2: Advanced Edge Analysis

#### 2.2.1 Trade Duration Analysis ✅ Done (Batch 4)

**Metrics:**
- Average trade duration (for trades with close time) ✅

**Still to add:**
- Average time in winning trades vs losing trades
- "Winner hold time / Loser hold time" ratio
- **Insight:** "You hold losers 3.2x longer than winners. Cut losses faster."

#### 2.2.2 MAE / MFE Analysis

**Maximum Adverse Excursion (MAE):** How far against you did the trade go?
**Maximum Favorable Excursion (MFE):** How far in your favor did it go?

**Visualization:** Scatter plot with MAE on X, MFE on Y, color-coded by P&L.

**Insight:** "Your trades went +$200 in your favor on average, but you only captured $85. You're leaving 57% on the table."

#### 2.2.3 R-Multiple Distribution

**Histogram showing:**
- How many trades hit +3R, +2R, +1R, 0R, -1R, -2R
- Planned vs achieved R comparison
- Bell curve overlay

**Insight:** "You plan for 3R trades but average 0.8R. Your targets are unrealistic or you're exiting too early."

#### 2.2.4 Entry Timing Heatmap

**24-hour grid:**
```
Hour   | Win% | P&L
-------|------|------
08:00  | 45%  | -$120
09:00  | 62%  | +$340  ← Sweet spot
10:00  | 71%  | +$580  ← Peak
...    | ...  | ...
```

**Add:** Best and worst 2-hour windows.

#### 2.2.5 Position Sizing Efficiency

**Metrics:**
- Kelly Criterion optimal % vs your actual %
- "Optimal" position size per setup
- Portfolio heat map (% risk by asset/class)

**Insight:** "Kelly says risk 2.1% per trade. You risk 1.5%. You're being too conservative, leaving returns on the table."

#### 2.2.6 Session Performance ✅ Done (Batch 4)

- Win rate and avg R:R per session ✅
- Net PnL per session ✅

#### 2.2.7 Asset Performance ✅ Done (Batch 4)

- Win rate per instrument with progress bar ✅
- Net PnL per instrument, ranked ✅

#### 2.2.8 Direction Analysis ✅ Done (Batch 4)

- Long vs Short win rate and PnL breakdown ✅

---

### Tier 3: Professional Grade

#### 2.3.1 Equity Curve vs Benchmark

**Overlay charts:**
- Your equity curve
- S&P 500 (if trading US assets)
- Buy & Hold of your most-traded asset
- Cumulative risk-free rate

**Metrics:**
- Alpha (excess return vs benchmark)
- Beta (market sensitivity)
- Information Ratio

#### 2.3.2 Volatility Regime Performance

**Auto-tag trades by VIX level or realized volatility:**

```
Regime       | Win% | Avg R | P&L
-------------|------|-------|------
Low Vol (<15)|  62% |  1.8R | +$890
Med Vol (15-25)| 48% |  0.9R | -$120
High Vol (>25)|  71% |  2.4R | +$1,240  ← You thrive in chaos
```

**Insight:** "Your win rate increases in high volatility. Consider sizing up when VIX > 25."

#### 2.3.3 Drawdown Recovery Simulator

**Visualization:**
- Timeline showing recovery path from current DD
- "At your pace, you'll be back at equity high by [date]"
- Historical recovery times (avg, min, max)

**Psychological reframing:** "Your last 3 drawdowns averaged 14 days to recover. This is normal."

#### 2.3.4 Trade Expectancy by Setup (Expanded)

```
Setup              | Trades | Win% | Avg Win | Avg Loss | Expectancy | Grade
-------------------|--------|------|---------|----------|------------|------
Wyckoff Spring     |   45   |  71% |  $180   |  -$65    |   +$109    | A+
Blue Box           |   32   |  56% |  $120   |  -$80    |   +$32     | B
UTAD Short         |   18   |  44% |  $95    |  -$110   |   -$28     | D  ← Stop
Custom (untested)  |    5   |  40% |  $80    |  -$90    |   -$22     | F  ← Too early
```

**Auto-grade:** A+ (>+$100), A (>$50), B (>$20), C (-$20 to +$20), D (<-$20), F (<-$50).

#### 2.3.5 Monte Carlo Simulation

**Run 10,000 simulations based on your trade history:**

```
Simulation Results (next 100 trades):
• Median outcome: +$1,240
• 95th percentile: +$3,890
• 5th percentile: -$890
• Probability of new equity high: 78%
• Probability of 20%+ DD: 12%
```

**Why:** Removes recency bias. Shows the statistical reality of your edge.

#### 2.3.6 Correlation Matrix

**Heat map showing:**
- Which assets move together in your portfolio
- Unintentional concentration risk
- Diversification score (0-100)

**Alert:** "You have 3 trades correlated at 0.85 — you're effectively 3x exposed to US Tech."

#### 2.3.7 Psychological Metrics Panel ✅ Done (Batch 5)

```
Discipline Score:     78/100  (trending ↑)
Emotional Variance:   Low     (stable)
Revenge Trade Risk:   Medium  (2 losses in a row)
Optimal Trade Size:   1.8%    (based on current mood)
Recommendation:       Size down 20% today
```

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Add TanStack Query
- [ ] Split trade form into sub-components
- [ ] Add DB indexes
- [ ] Add pagination to trades list

### Phase 2: Essential Stats (Week 3-4)
- [ ] Sharpe, Sortino, Calmar ratios
- [ ] Monthly performance table
- [x] Consecutive streaks ✅ Batch 4
- [ ] Risk of Ruin calculator

### Phase 3: Advanced Analytics (Week 5-6)
- [ ] MAE/MFE scatter plot
- [ ] R-multiple histogram
- [ ] Entry timing heatmap (upgrade from scatter to grid)
- [x] Trade duration analysis ✅ Batch 4 (avg duration)
- [x] Session performance ✅ Batch 4
- [x] Asset performance ✅ Batch 4
- [x] Direction analysis ✅ Batch 4

### Phase 4: Professional Grade (Week 7-8)
- [ ] Benchmark comparison
- [ ] Volatility regime tags
- [ ] Drawdown recovery simulator
- [ ] Monte Carlo (simplified)

### Phase 5: Polish (Week 9-10)
- [ ] Virtualized lists
- [ ] Global state (Zustand)
- [ ] Testing suite
- [ ] PWA enhancements

---

## 5. User-Requested Features

### 5.1 Account Comparison Toggle (Statistics)

**Feature:** Allow users to compare performance across multiple portfolios/accounts side-by-side in the Statistics page.

**Implementation:**
- Portfolio selector dropdown in Statistics header
- Toggle between "Combined View" and "Per-Account View"
- Side-by-side bar charts comparing win rates, profit factors, drawdowns
- Account correlation analysis (does Account A perform when Account B doesn't?)

**Insight:** "Your Forex account is up 12% while your Crypto account is down 8%. Consider rebalancing."

### 5.2 Trade Replay & Chart Heatmap Overlay

**Feature:** Upload trade screenshots → AI analyzes entry/exit zones → Heatmap overlay showing where you typically enter and exit.

**Implementation:**
- Image upload for each trade setup ✅ Done
- Coordinate mapping: user clicks entry/exit points on chart image
- Aggregated heatmap across all trades per asset
- "You enter XAUUSD 73% of the time in the upper 20% of the daily range"

### 5.3 Weekly AI Coaching Reports

**Feature:** Auto-generated weekly report emailed/pushed to user with specific, actionable insights.

**Report Contents:**
- Top 3 things you did well
- Top 3 areas needing improvement
- Specific trade review recommendations
- Discipline score trend
- Goal progress tracker
- Next week's focus area

**Example:** "This week you took 5 trades without confirming volume. Your volume-confirmed trades had a 78% win rate. Next week: No entry without volume confluence."

### 5.4 Gamification System ✅ Partially Done

**Badges (Achievement System):**
- `"10 Trade Win Streak"` — 10 consecutive wins
- `"Discipline Master"` — No rule breaks for 30 days
- `"Risk Manager"` — No single loss > 2% for 60 days
- `"Early Bird"` — Check in before 7 AM for 14 days
- `"Reviewer"` — Review 5 past trades weekly for 4 weeks
- `"Psychology Pro"` — Mood score avg > 4.0 for 30 days
- `"Diversified"` — Traded 5+ different assets in a month

**XP & Leveling:** ✅ Done
- XP per trade logged: +10
- XP per daily check-in: +5
- XP per review completed: +20
- XP per badge earned: +100
- Level titles: Novice → Apprentice → Trader → Senior Trader → Elite → Master → Legend

**Daily Quests:**
- `"Morning Routine"` — Complete pre-market checklist
- `"Trade Logger"` — Log all today's trades before midnight
- `"Mistake Review"` — Review yesterday's losing trade
- `"Check-In Hero"` — Daily mental check-in
- `"Edge Hunter"` — Identify one new pattern in your data

**Leaderboards (Opt-in Anonymous):**
- Monthly win rate percentile
- Profit factor percentile
- Discipline score percentile
- "You rank in the top 15% of traders this month"

### 5.5 Morning Routine Checklist

**Feature:** Mandatory pre-market checklist that must be completed before "unlocking" new trade entry for the day.

**Checklist Items (customizable):**
- [ ] News & economic calendar scanned
- [ ] Key levels marked on charts
- [ ] HTF bias determined
- [ ] Mindset check (mood 3+/5)
- [ ] Yesterday's mistakes reviewed
- [ ] Risk parameters confirmed
- [ ] Correlated assets checked

**Implementation:**
- Modal popup on first "New Trade" click of the day
- Progress bar showing completion
- Can be dismissed but tracks "skipped" count
- Settings to enable/disable requirement

### 5.6 Market Regime Auto-Tagging ✅ Partially Done

**Feature:** Automatically tag each trade with the market condition it was taken in.

**Regime Types:**
- **Trending** — ADX > 25, clear directional bias ✅ Manual tag in form
- **Choppy/Range** — ADX < 20, price oscillating ✅ Manual tag
- **News-Driven** — High volatility spike, economic calendar hit ✅ Manual tag
- **Breakout** — Price breaking key structure ✅ Manual tag
- **Reversal** — Price reversing from extreme ✅ Manual tag

**Still to add:**
- Smart Insights now uses regime data ✅ Batch 5
- Auto-tagging via external API (future)

### 5.7 Multi-Device Sync & Offline Mode

**Feature:** Full PWA with offline trade entry and cross-device sync.

**Implementation:**
- Service worker with background sync
- IndexedDB for offline storage
- Queue system: offline trades sync when reconnected
- Conflict resolution for concurrent edits
- Mobile-optimized trade form (fewer fields, voice input)

### 5.8 Advanced Tilt Detection & Circuit Breakers

**Algorithm:**
```
IF consecutive_losses >= 3 
   AND mood_score <= 2 
   AND session != preferred_session
   AND daily_pnl < -daily_limit
   THEN trigger_cooldown()
```

**Circuit Breakers:**
- **Yellow Alert:** Warning banner with breathing exercise prompt
- **Orange Alert:** 30-minute mandatory cooldown timer
- **Red Alert:** Trade entry locked for 2 hours, requires coaching review
- **Daily Loss Limit:** Auto-lock after X% daily loss

**Psychological Interventions:**
- Forced 5-minute break with guided breathing
- "Why are you trading right now?" reflection prompt
- Historical tilt cost tracker ("Tilt has cost you $X this month")

### 5.9 Post-Trade Interview System

**Feature:** 3-question mandatory popup after marking a trade as closed.

**Questions:**
1. "How did you feel during this trade?" (1-5 scale: Panic → Calm → Euphoric)
2. "Did you follow your plan exactly?" (Yes / Partial / No)
3. "What's the ONE lesson from this trade?" (Free text)

**Outputs:**
- Emotional journey map per trade
- Plan adherence score over time
- Lesson archive with search/filter
- Quarterly "Emotional Audit" report

### 5.10 Webhook/API Broker Integration

**Supported Platforms:**
- **MetaTrader 4/5** — EA pushes trades via webhook
- **TradingView** — Webhook alerts → auto-log trade ideas
- **Interactive Brokers (IBKR)** — API sync
- **cTrader** — cBot webhook integration

**Auto-Import Fields:**
- Symbol, direction, entry price, exit price
- SL/TP levels
- Position size
- Open/close timestamps

**Benefit:** Eliminates manual entry errors, captures exact prices, real-time sync.

---

## 6. New Ideas — Session 2026-06-17

> Brainstormed after completing Batches 1–5. These are fresh ideas not yet in the roadmap.

### 6.1 Trade Calendar View

**Feature:** A full calendar (month/week view) where each day shows a color-coded summary of trades taken.

**Visual:**
- Green day = net positive PnL
- Red day = net negative PnL
- Grey = no trades
- Click a day → expand to show all trades that day

**Why:** Instantly reveals patterns — "I always lose on Mondays", "I overtrade on Fridays", "I'm most profitable mid-week."

**Implementation:** Use a lightweight calendar library (e.g. `react-big-calendar` or custom CSS grid). Data already available from existing trade queries.

---

### 6.2 Trade Notes Search & Tag System

**Feature:** Full-text search across all pre/post trade notes + a tagging system.

**Tags (auto-suggested + custom):**
- `#fomo`, `#revenge`, `#patient`, `#early-exit`, `#perfect-entry`, `#news-spike`
- Auto-suggest tags based on note content (simple keyword matching)

**Why:** Right now notes are write-only. A searchable, tagged archive turns them into a knowledge base.

**Implementation:**
- Add `tags text[]` column to trades table
- Tag input in trade form (comma-separated or chip UI)
- Search bar on Trade Log page that searches `pre_trade_reasoning` + `post_trade_lesson` + `tags`

---

### 6.3 Goal Setting & Progress Tracker

**Feature:** Let users set monthly/quarterly trading goals and track progress.

**Goal Types:**
- Win rate target (e.g. "Achieve 60% win rate this month")
- PnL target (e.g. "+$500 this month")
- Discipline target (e.g. "No trades without full checklist for 30 days")
- Trade count target (e.g. "Log 20 trades this month")
- Streak target (e.g. "5 consecutive winning trades")

**UI:**
- Progress bars on Dashboard
- "You're 73% of the way to your monthly PnL goal"
- Celebration animation on goal completion
- Historical goal completion rate

**DB:** New `goals` table with `type`, `target_value`, `current_value`, `period`, `status`.

---

### 6.4 Trade Comparison Mode

**Feature:** Select 2–3 trades side-by-side to compare their setups, outcomes, and notes.

**Why:** "Why did this XAUUSD Long win 3R but this similar one lost? Let me compare them."

**UI:**
- Checkbox on trade list to select trades
- "Compare Selected" button appears when 2+ selected
- Side-by-side card layout showing all fields
- Highlight differences in red/green

---

### 6.5 Sharpe / Sortino / Calmar Ratios on Statistics Page

**Feature:** Add the three key risk-adjusted return metrics to the Core Performance section.

**Formulas:**
```typescript
// Sharpe: excess return per unit of total volatility
const sharpe = (annualReturn - 0.05) / stdDev;

// Sortino: excess return per unit of downside volatility  
const sortino = (annualReturn - 0.05) / downsideStdDev;

// Calmar: annual return / max drawdown
const calmar = annualReturn / maxDrawdownPercent;
```

**Target benchmarks:**
- Sharpe > 1.0 = good, > 2.0 = excellent
- Sortino > 1.5 = good
- Calmar > 1.0 = good

**Implementation:** All data already available. Pure calculation addition to `statistics/page.tsx`.

---

### 6.6 Monthly Performance Table

**Feature:** A table on the Statistics page showing month-by-month breakdown.

```
Month    | Trades | Win% | Avg R | Net PnL | vs Prior | Cumulative
---------|--------|------|-------|---------|----------|----------
Jan 2026 |   12   | 58%  | 1.8R  | +$450   |    —     | +$450
Feb 2026 |   15   | 47%  | 0.9R  | -$120   |   ↓      | +$330
Mar 2026 |   10   | 60%  | 2.1R  | +$680   |   ↑      | +$1,010
```

**Color coding:** Green rows = profitable months, red = losing months.

**Implementation:** Group existing `closed` trades by `format(trade_date, 'MMM yyyy')`. No new DB columns needed.

---

### 6.7 R-Multiple Distribution Chart

**Feature:** A bar chart showing how your trades distribute across R-multiples.

```
-3R  | ██ (2)
-2R  | ████ (4)
-1R  | ████████ (8)
 0R  | ██ (2)
+1R  | ██████ (6)
+2R  | ████ (4)
+3R  | ██ (2)
+4R+ | █ (1)
```

**Why:** Instantly shows if your edge is real. A positive expectancy system has a right-skewed distribution.

**Implementation:** Bucket `actual_rr_achieved` values into integer R-multiples. Use Recharts `BarChart`.

---

### 6.8 Trade Form — Quick Entry Mode

**Feature:** A minimal "Quick Log" mode for the trade form that shows only the 5 most essential fields.

**Quick Mode Fields:**
1. Symbol
2. Direction (Long/Short toggle)
3. Entry Price
4. Stop Loss
5. Status

**Why:** Sometimes you just want to log a trade fast without filling in 20 fields. Full details can be added later.

**Implementation:**
- Toggle button at top of trade form: "Quick Mode / Full Mode"
- Quick mode hides Sections 2, 3, 5, 6 (strategy, screenshots, outcome, notes)
- Saves with sensible defaults for hidden fields

---

### 6.9 Export to CSV / PDF

**Feature:** Export trade log and statistics to CSV or PDF.

**CSV Export:**
- All trade fields as columns
- Filterable by date range, symbol, status
- Compatible with Excel/Google Sheets

**PDF Export:**
- Statistics summary page
- Equity curve chart
- Top 5 best/worst trades
- Monthly performance table
- Branded with WJournal header

**Implementation:**
- CSV: `papaparse` library, client-side generation
- PDF: `jspdf` + `html2canvas` for chart capture

---

### 6.10 Notification System (In-App)

**Feature:** A notification bell in the header that shows actionable alerts.

**Alert Types:**
- 🔴 "You're on a 3-trade loss streak — consider stepping back"
- 🟡 "You haven't logged a trade in 5 days — are you still active?"
- 🟢 "New personal best: 5 consecutive wins!"
- 🔵 "Your discipline score dropped 20 points this week"
- ⚪ "Daily check-in reminder (9:00 AM)"

**Implementation:**
- `notifications` table in Supabase with `user_id`, `type`, `message`, `read`, `created_at`
- Server-side function generates notifications based on trade data
- Bell icon in `app-layout.tsx` header with unread count badge
- Dropdown panel showing recent notifications

---

### 6.11 Trade Form — Partial Close Tracking

**Feature:** Track partial position closes more granularly.

**Current:** "Partial" status is a single checkbox. No way to track which % was closed at what price.

**Enhancement:**
- Add `partial_closes` JSONB column: `[{ date, price, percent_closed, pnl }]`
- UI: "Add Partial Close" button in Section 5 that adds a row
- Running PnL updates as partials are added
- Final close marks remaining position

**Why:** Many traders scale out of positions. This gives accurate PnL tracking for each partial.

---

### 6.12 AI-Powered Trade Review (Future)

**Feature:** After logging a trade, an AI model reviews the pre/post notes and gives structured feedback.

**Input:** Pre-trade reasoning + post-trade lesson + trade outcome

**Output:**
- "Your pre-trade reasoning was sound but you exited early — this is a pattern in 6 of your last 10 trades"
- Mistake category auto-detection
- Suggested improvement for next similar setup
- Similarity score to past trades ("This setup is 87% similar to your XAUUSD Long on March 12 which hit 3R")

**Implementation:** OpenAI API call via `/api/review-trade` route. Requires `OPENAI_API_KEY` env var.

---

## 4. Quick Wins (Do These First)

**Can implement in <30 minutes each:**

1. **Add DB indexes** → Copy SQL from Section 2.3, run in Supabase
2. **Monthly performance table** → Reuse existing stats calculation (see 6.6)
3. **Sharpe/Sortino/Calmar** → Pure math, data already available (see 6.5)
4. **R-Multiple histogram** → Bucket `actual_rr_achieved`, use BarChart (see 6.7)
5. **Trade calendar view** → CSS grid + existing trade data (see 6.1)
6. **Export to CSV** → `papaparse`, client-side (see 6.9)
7. **Quick Entry Mode** → Toggle to hide non-essential form sections (see 6.8)
8. **Strategy-aligned validation criteria** → ✅ Done in Batch 8
9. **Collapsible filters panel** → ✅ Done in Batch 8
10. **Help/Guides refresh + mobile nav** → ✅ Done in Batch 8
11. **Smart Insights v3** → ✅ Done in Batch 8
12. **Session/Direction/Asset/Streak stats** → ✅ Done in Batch 4
13. **Smart Insights expansion** → ✅ Done in Batch 5
