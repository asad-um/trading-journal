# WJournal Project Audit

> Last updated: 2026-06-10
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

### CRITICAL (Open)
| # | Issue | File | Risk |
|---|-------|------|------|
| 2 | **No CSRF Protection** — State-changing API routes lack CSRF tokens | All API routes | High |
| 3 | **Cloudinary Unsigned Upload Fallback** — Falls back to unsigned preset if signed fails | `trade-form.tsx` | High |
| 4 | **XSS via Stored HTML** — TipTap content stored raw; DOMPurify only on render | `trade-form.tsx`, `trades/[id]/page.tsx` | Medium |
| 5 | **Trade Detail No User Filter** — Fetches by ID only, relies solely on RLS | `trades/[id]/page.tsx` | Medium |

### HIGH (Open)
| # | Issue | File | Risk |
|---|-------|------|------|
| 6 | **No Rate Limiting** — API routes unprotected | All API routes | High |
| 7 | **Client-Side File Validation Only** — Image upload validation bypassable | `trade-form.tsx` | Medium |
| 8 | **Sensitive Data in localStorage** — Trade drafts stored unencrypted | `trade-form.tsx` | Low |

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

---

## 8. Recommended Next Fixes (Priority Order)

1. **Add CSRF tokens** to all state-changing API routes
2. **Add rate limiting** (Vercel Edge Config or API middleware)
3. **Refactor TradeForm** into sub-components
4. **Add React Query / SWR** for client-side caching
5. **Add DB indexes** on `trades(user_id, portfolio_id, trade_date)`
6. **Add pagination** to trades list
7. **Add server-side validation** to CSV import
8. **Add error boundaries** around data-fetching components
