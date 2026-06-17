# WJournal Project Audit

> Last updated: 2026-06-12
> Auditor: AI Code Review (Cline)
> Scope: Full codebase architecture, security, and scalability review

---

## 1. Architecture Summary

**Stack:** Next.js 14.2.35 + TypeScript + Supabase + Tailwind CSS + shadcn/ui

**Pattern:** SPA-style client-side app. All pages use `"use client"`. No SSR/SSG.

**Data Flow:**
```
Browser → Supabase Client → PostgreSQL (RLS protected)
              ↓
        Realtime subscriptions → Live UI updates
```

**Core Tables:**
- `profiles` — user profile data
- `portfolios` — multi-account support
- `trades` — trade journal entries (JSONB arrays)
- `account_events` — deposits/withdrawals
- `user_settings` — customizable lists
- `daily_checkins` — psychology tracking

---

## 2. Security Findings

### CRITICAL (Fixed)
| # | Issue | File | Status |
|---|-------|------|--------|
| 1 | **Service Role Key Exposure** — API returned `SUPABASE_SERVICE_ROLE_KEY` name in error messages | `api/delete-account/route.ts`, `settings/page.tsx` | ✅ Fixed |

### CRITICAL (Fixed)
| # | Issue | File | Status |
|---|-------|------|--------|
| 2 | **Trade Detail No User Filter** — Fetches by ID only, relies solely on RLS | `trades/[id]/page.tsx` | ✅ Fixed |
| 3 | **XSS via Stored HTML** — TipTap content stored raw; DOMPurify only on render | `trade-form.tsx` | ✅ Fixed |
| 4 | **Cloudinary Unsigned Upload Fallback** — Falls back to unsigned preset if signed fails | `trade-form.tsx`, `api/sign-cloudinary` | ✅ Fixed |

### CRITICAL (Open)
| # | Issue | File | Risk |
|---|-------|------|------|
| 5 | **No CSRF Protection** — State-changing API routes lack CSRF tokens | All API routes | High |

### HIGH (Open)
| # | Issue | File | Risk |
|---|-------|------|------|
| 6 | **Client-Side File Validation Only** — Image upload validation bypassable | `trade-form.tsx` | Medium |
| 7 | **Sensitive Data in localStorage** — Trade drafts stored unencrypted | `trade-form.tsx` | Low |

### HIGH (Fixed)
| # | Issue | File | Status |
|---|-------|------|--------|
| 8 | **No Rate Limiting** — API routes unprotected | All API routes | ✅ Fixed |
| 9 | **Portfolio Switch = Full Reload** | `app-layout.tsx`, `account/page.tsx` | ✅ Fixed |
| 10 | **Duplicate Danger Zone Code** | `settings/page.tsx` | ✅ Fixed |

---

## 3. Design Flaws

### Critical
| # | Issue | Impact |
|---|-------|--------|
| 1 | **100% Client-Side Rendering** — No SSR/SSG anywhere | Poor SEO, slower loads, higher bundle |
| 2 | **No Query Caching** — Every page re-fetches same data | Redundant API calls, inconsistent state |
| 3 | **Portfolio Switch = Full Reload** | Terrible UX, state loss |
| 4 | **Trade Form is 905 lines** | Unmaintainable, untestable |
| 5 | **Duplicate Danger Zone Code** | Maintenance risk |

### High
| # | Issue | Impact |
|---|-------|--------|
| 6 | **No Pagination** — `.limit(100)` hardcoded | Users with >100 trades lose data |
| 7 | **CSV Import No Validation** | Corrupt data possible |
| 8 | **No Error Boundaries** | One failure crashes page |

---

## 4. Scalability Concerns

| Concern | Current | Risk at Scale |
|---------|---------|---------------|
| No DB indexes beyond PK/FK | Slow queries on filtered trade lists |
| Realtime channel per page | Connection limit exhaustion |
| Client-side calculations | Browser freeze with 10k+ trades |
| No data archiving | Table bloat |
| No image lifecycle policy | Unbounded Cloudinary costs |

---

## 5. Technical Debt

| Area | Level | Notes |
|------|-------|-------|
| Type Safety | High | Multiple `as any` casts, `// eslint-disable` |
| Component Size | High | 905-line trade form, 651-line settings |
| Code Duplication | High | Danger zone logic ×2, fetch patterns ×6 |
| Testing | Critical | Zero tests found |
| Documentation | Medium | No inline API docs |

---

## 6. Positive Decisions

- ✅ RLS on all tables
- ✅ DB triggers for balance recalculation
- ✅ Multi-portfolio support
- ✅ Cloudinary signed uploads attempted
- ✅ Privacy mode (`blurMoney`)
- ✅ PWA manifest
- ✅ Realtime subscriptions
- ✅ Zod form validation

---

## 7. Fix Log

| Date | Issue | Files | Commit |
|------|-------|-------|--------|
| 2026-06-10 | Service Role Key exposure | `api/delete-account/route.ts`, `settings/page.tsx` | ✅ Applied |
| 2026-06-10 | Trade Detail No User Filter | `trades/[id]/page.tsx` | ✅ Applied |
| 2026-06-10 | XSS via Stored HTML | `trade-form.tsx` | ✅ Applied |
| 2026-06-10 | Cloudinary Unsigned Upload Fallback | `trade-form.tsx`, `api/sign-cloudinary` | ✅ Applied |
| 2026-06-10 | No Rate Limiting | `src/lib/rate-limit.ts`, all API routes | ✅ Applied |
| 2026-06-10 | Portfolio Switch = Full Reload | `app-layout.tsx`, `account/page.tsx` | ✅ Applied |
| 2026-06-10 | Duplicate Danger Zone Code | `settings/page.tsx` | ✅ Applied |
| 2026-06-11 | 3-Tier Timeframe Fields | `trade-form.tsx`, `types/index.ts`, `validations/trade.ts` | ✅ Applied |
| 2026-06-11 | Smart Status Sync (TP/SL auto-status) | `trade-form.tsx` | ✅ Applied |
| 2026-06-11 | Collapsible Sidebar | `app-layout.tsx` | ✅ Applied |
| 2026-06-11 | Remove Non-Functional "Generate Secure Link" | `settings/page.tsx` | ✅ Applied |
| 2026-06-11 | Modern Abstract App Icons | `public/`, `generate_icons.py` | ✅ Applied |
| 2026-06-11 | Timeframe Performance Analytics | `statistics/page.tsx`, `types/index.ts` | ✅ Applied |
| 2026-06-11 | SQL Check Constraint Fix (missing 4H/15M) | `supabase/migrations/` | ✅ Applied |
| 2026-06-11 | Top 5 → Top 3 Best/Worst Trades | `statistics/page.tsx` | ✅ Applied |
| 2026-06-11 | Strategy/Criteria Card Mobile Containment | `statistics/page.tsx` | ✅ Applied |
| 2026-06-11 | Password Reset on Login Page | `login/page.tsx` | ✅ Applied |
| 2026-06-11 | Mental Edge Duplicate Key Fix (UPSERT) | `dashboard/page.tsx` | ✅ Applied |
| 2026-06-11 | Dashboard Recent Trades Limit (10→5) | `dashboard/page.tsx` | ✅ Applied |
| 2026-06-11 | Danger Zone Standalone Settings Tab | `settings/page.tsx` | ✅ Applied |
| 2026-06-12 | Nested Strategy Playbooks Editor | `settings/page.tsx`, `components/settings/playbooks-editor.tsx`, `types/index.ts`, `lib/defaults.ts` | ✅ Applied |
| 2026-06-12 | Expanded Asset List + Migration | `supabase/migrations/batch5_playbooks_and_assets.sql`, `lib/defaults.ts` | ✅ Applied |
| 2026-06-12 | MASTER_FIX SQL Cascade Fix | `supabase/migrations/MASTER_FIX_2026_06_11.sql` | ✅ Applied |
| 2026-06-12 | Dedicated /reset-password Page | `login/page.tsx`, `reset-password/page.tsx` | ✅ Applied |
| 2026-06-12 | Reset-Password Middleware Allowlist | `middleware.ts` | ✅ Applied |
| 2026-06-12 | Select Empty-Value Crash Fix | `trade-filters.tsx` | ✅ Applied |
| 2026-06-12 | Collapsible Playbooks Editor | `playbooks-editor.tsx` | ✅ Applied |
| 2026-06-12 | Customizable Trading Sessions | `settings/page.tsx`, `types/index.ts`, `schema.sql`, `defaults.ts` | ✅ Applied |
| 2026-06-12 | Criteria Auto-fill Refined | `trade-form.tsx` | ✅ Applied |
| 2026-06-12 | Image Label Dropdown | `trade-form.tsx` | ✅ Applied |

---

## 8. Recent UX Fixes (Batch 8 — 2026-06-12)

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Strategy-aligned validation criteria auto-fill | `src/lib/defaults.ts`, `src/components/trades/trade-form.tsx` |
| 2 | Trading sessions now support custom UTC time windows | `src/types/index.ts`, `src/lib/calculations.ts`, `src/app/settings/page.tsx`, `supabase/migrations/batch6_sessions_list.sql` |
| 3 | Collapsible filters panel with active-filter badge | `src/components/trades/trade-filters.tsx` |
| 4 | Removed duplicate "Filter symbols" input from trade table | `src/components/trades/data-table.tsx` |
| 5 | Help & Guides updated + added to mobile nav | `src/app/help/page.tsx`, `src/components/layout/app-layout.tsx` |
| 6 | Reset-password "Link Expired" false-positive fixed | `src/app/reset-password/page.tsx`, `src/middleware.ts` |
| 7 | Mobile logout icon fades on scroll | `src/components/layout/app-layout.tsx` |
| 8 | Smart Insights v3: categorized cards + new analytics | `src/app/dashboard/page.tsx` |

## 9. New Issues Identified (2026-06-17)

### CRITICAL (Open)
| # | Issue | File | Root Cause |
|---|-------|------|------------|
| 9 | **New Account Invisible on Dashboard** | `account/page.tsx` | Portfolio created with `is_active: false`, no activation logic |
| 10 | **Trade Status Infinite Loop (React #185)** | `trade-form.tsx` | Two `useEffect` hooks fight each other, even with dependencies |
| 11 | **Trade Outcome Logic Too Rigid** | `calculations.ts`, `trade-form.tsx` | Assumes remaining position = full loss; doesn't support adjusted SL/breakeven |

### HIGH (Open)
| # | Issue | File | Impact |
|---|-------|------|--------|
| 12 | **Missing Trade Open/Close Time** | `trades` table, `trade-form.tsx` | Can't track trade duration or multi-day trades |
| 13 | **No Clipboard Image Paste** | `trade-form.tsx` | Manual file selection only, slower workflow |
| 14 | **Danger Zone Mobile Layout Broken** | `settings/page.tsx` | Previous fix didn't take effect |
| 15 | **Horizontal Scrollbar in Nav Tabs (Mobile)** | `app-layout.tsx` | Overflow-x issue in section bar |

### MEDIUM (Open)
| # | Issue | File | Impact |
|---|-------|------|--------|
| 16 | **Statistics Page Architecture** | `statistics/page.tsx` | Needs componentization + responsive improvements |
| 17 | **Smart Insights Limited** | `dashboard/page.tsx` | Narrow rule set, needs expansion |
| 18 | **Psychological Metrics Basic** | `dashboard/page.tsx` | Missing revenge-trading detection, discipline trends |
| 19 | **Gamification System Weak** | `user_gamification` table | XP curve flat, badges not meaningful |

---

## 10. Batched Fix Plan (2026-06-17)

### BATCH 1 — Quick Wins (Low Risk)
- **1a.** Activate new account on creation (set `is_active: true`, deactivate others)
- **1b.** Fix Danger Zone mobile layout (proper responsive stack)
- **1c.** Remove horizontal scrollbar in nav tabs (overflow-x / flex-wrap)

### BATCH 2 — Trade Outcome Logic Overhaul (Medium Risk)
- **2a.** Add `trade_open_time`, `trade_close_time` columns (DB migration) + form fields
- **2b.** Decouple status from checkboxes (remove auto-sync `useEffect`, make independent)
- **2c.** Add `exit_type` field (`Final TP`, `Stop Loss`, `Breakeven`, `Adjusted SL`) + `adjusted_sl_price`
- **2d.** Rewrite `calculateGrossPnL` to handle adjusted SL / breakeven scenarios
- **2e.** Enable full edit workflow (open → partial → closed with correct TP/SL combinations)

### BATCH 3 — Clipboard Image Paste (Medium Risk)
- Add paste event listener to Trade Screenshots section
- Use same Cloudinary signed upload pipeline

### BATCH 4 — Statistics Page Enhancement (Medium-High Risk)
- Componentize large sections
- Improve responsive layout
- Add clearer metric visualizations

### BATCH 5 — Intelligence Upgrades (High Effort)
- **5a.** Expand Smart Insights rule engine (best/worst sessions, RR efficiency, overtrading, win-streak/cooldown, strategy edge decay)
- **5b.** Enhance Psychological metrics (revenge-trading detection, discipline score trend, tilt warnings)
- **5c.** Improve Gamification (better XP curve, meaningful badges, streaks)

---

## 11. Recommended Next Fixes (Priority Order)

1. **Execute Batch 1+2** (critical bugs + trade logic redesign)
2. **Add CSRF tokens** to all state-changing API routes
3. **Refactor TradeForm** into sub-components
4. **Add React Query / SWR** for client-side caching
5. **Add DB indexes** on `trades(user_id, portfolio_id, trade_date)`
6. **Add pagination** to trades list
7. **Add server-side validation** to CSV import
8. **Add error boundaries** around data-fetching components
