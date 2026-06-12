# AI Notes — WJournal

> Working notes for AI coding agents. Update as work progresses.

---

## Session: 2026-06-12

### Re-evaluation after Batch 4 Push

| Batch | Scope | Status |
|-------|-------|--------|
| Batch 1 | Tooltip clipping, Forgot Password input, Mental Edge hide, T Pal rename | ✅ Pushed |
| Batch 2 | Statistics collapsible Strategy/Criteria, Settings compact/editable, T Pal styling | ✅ Pushed |
| Batch 3 | Forgot Password rewrite, Mental Edge DB persistence, Settings collapse, Remove Fees, Rename Assets | ✅ Pushed |
| Batch 4 | Shared trade filters (Playbook + Trade Log), 3 max images with flexible labels | ✅ Pushed |
| Batch 5 | Playbooks nested customization in Settings, expand asset list | ✅ Pushed |
| Batch 6 | Fix MASTER_FIX SQL cascade error, fix password reset flow to force new password | ✅ Pushed |
| Batch 7 | Fix Select empty-value crash, collapsible Playbooks, sessions customization, image label dropdown, reset-password middleware fix | ✅ Pushed |
| Batch 8 | Strategy-aligned criteria, session time ranges, collapsible filters, remove duplicate symbol filter, help/guides refresh, reset-password fix, mobile logout fade, Smart Insights v3 | ✅ Pushed |

### Outstanding Issues from User Feedback
1. **Playbooks Customization** — Settings tab exists but uses flat "Strategy | Playbook" strings. Need nested strategy/playbook editing (add/edit/delete parent strategies and child playbooks). ✅ Implemented in Batch 5/7.
2. **More Assets** — Add GER40, NIKKEI, and additional global instruments beyond current list. ✅ Implemented in Batch 5.
3. **Password Reset Flow Bug** — Reset link logs user in directly without prompting for new password. Need dedicated reset handler. ✅ `/reset-password` created + middleware updated.
4. **MASTER_FIX SQL Error** — `DROP FUNCTION recalculate_balance_v2()` fails because triggers depend on it. ✅ Fixed by dropping `tr_trades_balance` and `tr_account_events_balance` before dropping the function.

### Batch 6 Implementation Notes
- Created `/reset-password` page that handles PKCE `code` query param and legacy hash-token recovery flows.
- Updated forgot-password email `redirectTo` from `/login` to `/reset-password`.
- Reset page validates link, shows new-password form with confirmation, then calls `supabase.auth.updateUser({ password })`.
- Fixed `MASTER_FIX_2026_06_11.sql` Section 2 trigger/function drop order to avoid `2BP01` dependency error.

### Batch 7 Implementation Notes
- Fixed `SelectItem value=""` crash in `TradeFiltersPanel` by using `"all"` sentinel value.
- Made Strategy Playbooks editor card collapsible like other Settings sections.
- Replaced placeholder Trading Sessions text with real editable `sessions_list` in Settings; added `sessions_list` to `UserSettings`, `schema.sql`, `handle_new_user()` trigger, `MASTER_FIX`, and migration `batch6_sessions_list.sql`.
- Refined criteria auto-fill: now syncs checklist with user's settings criteria list while preserving existing checked state, instead of force-checking all boxes.
- Replaced free-text image caption inputs with Pre-Trade/Post-Trade dropdown selects.
- Fixed `/reset-password` not loading from email link by adding the route to `middleware.ts` auth-route allowlist so unauthenticated users can reach it.

### Batch 8 Implementation Notes
- Added `DEFAULT_CRITERIA_BY_STRATEGY` map in `defaults.ts`; `applyStrategyCriteria()` in `trade-form.tsx` now loads strategy-specific criteria on auto-fill.
- Expanded `sessions_list` type to include `start_time` and `end_time`; updated Settings UI to edit time windows; `detectSession()` now matches trades against user-defined UTC windows (supports overnight ranges).
- Made `TradeFiltersPanel` collapsible with an icon toggle, active-filter badge, and smooth expand/collapse; removed standalone "Filter symbols..." input from `DataTable`.
- Refreshed `help/page.tsx` content for new features (sessions, filters, strategy criteria) and added FAQ entries for password reset + Smart Insights.
- Fixed `/reset-password` "Link Expired" false-positive by adding `onAuthStateChange` fallback listener and delaying the error state; allowed authenticated users to remain on `/reset-password` in middleware.
- Updated mobile bottom nav in `app-layout.tsx` to include Help/Guides and made the floating logout icon translucent with scroll-based opacity fade.
- Reworked Smart Insights on Dashboard into categorized cards (edge/risk/behavior/recommendation) with new analytics: strategy/playbook win rate, best timeframe, criteria compliance, R:R capture efficiency.

## Session: 2026-06-11

### User Complaints Summary (All Items)

| # | Complaint | Priority | File(s) | Status |
|---|-----------|----------|---------|--------|
| 1 | **Trade Outcome Logic Bug** — Status doesn't auto-sync with TP/SL hits. Selecting TP1+ should auto-set Partial/Closed-Win. SL hit should auto-set Closed-Loss and clear TPs. Conflicting states possible. | CRITICAL | `trade-form.tsx`, `trades/[id]/page.tsx` | ✅ FIXED |
| 2 | **Three Timeframe Fields** — Need HTF (Monthly/Weekly/Daily/4H), Analysis TF (4H/2H/1H/30M/15M), Entry TF (15M/5M/1M/30S/15S/5S) for statistical edge analysis | HIGH | `trade-form.tsx`, `schema.sql`, `statistics/page.tsx` | ✅ FIXED |
| 3 | **Collapsible Sidebar** — Sidebar should collapse to icons-only or hide completely. Remember preference. | MEDIUM | `app-layout.tsx` | ✅ FIXED |
| 4 | **Remove "Generate Secure Link"** — Public track record feature non-functional (says "next phase"). Remove UI element. | MEDIUM | `settings/page.tsx` | ✅ FIXED |
| 5 | **New App Icon** — Modern abstract icon for PWA (192x192, 512x512, favicon) | LOW | `public/` | ✅ FIXED |
| 6 | **Error Handling & Robustness** — Better error boundaries, loading states, remove unnecessary elements | HIGH | Multiple | ✅ FIXED |
| 7 | **Seamless UI/UX** — All buttons/interactions smooth and functional | HIGH | Multiple | ✅ FIXED |
| 8 | **Statistics Enhancement** — More relevant analytics (timeframe performance, session analysis, etc.) | MEDIUM | `statistics/page.tsx` | ✅ FIXED |
| 9 | **Supabase SQL** — New assets in schema.sql only affect new users. Need migration for existing users. New timeframe fields need DB migration. | HIGH | `supabase/migrations/` | ✅ MIGRATION CREATED |
| 10 | **SQL Check Constraint Error** — `chk_entry_timeframe` missing '15M', `chk_analysis_timeframe` missing '4H' | CRITICAL | `supabase/migrations/` | ✅ FIXED |
| 11 | **Top 5 → Top 3** — User requested fewer trades in best/worst lists | LOW | `statistics/page.tsx` | ✅ FIXED |
| 12 | **Strategy/Playbook Containment** — Numbers overflow on mobile | MEDIUM | `statistics/page.tsx` | ✅ FIXED |
| 13 | **Password Reset** — No forgot password option on login | HIGH | `login/page.tsx` | ✅ FIXED |
| 14 | **Mental Edge Duplicate Key** — `daily_checkins` INSERT fails on re-checkin | CRITICAL | `dashboard/page.tsx` | ✅ FIXED |
| 15 | **Dashboard Recent Trades Overflow** — Shows 10 trades, user wants fewer | LOW | `dashboard/page.tsx` | ✅ FIXED |
| 16 | **Danger Zone Location** — Buried in General tab, needs standalone tab | MEDIUM | `settings/page.tsx` | ✅ FIXED |

### Supabase SQL Answer
**YES** — You need to run SQL in Supabase for:
1. **New timeframe columns** in `trades` table (highest_timeframe, analysis_timeframe, entry_timeframe)
2. **Fix broken constraints** — Run `fix_timeframe_constraints.sql` to correct missing '15M' and '4H' values
3. **Existing users won't see new assets** — The schema.sql `handle_new_user()` trigger only runs for NEW signups. Existing users need an UPDATE query or manual addition.

**Migration files:**
- `supabase/migrations/add_timeframe_columns.sql` — Add columns + constraints (fixed version)
- `supabase/migrations/fix_timeframe_constraints.sql` — Fix broken constraints if already applied

---

## Session: 2026-06-10

### Completed
- ✅ Full codebase read and analyzed (35+ files)
- ✅ Security audit completed (3 perspectives)
- ✅ Highest-impact fix implemented: Service Role Key exposure
  - `src/app/api/delete-account/route.ts` — generic error message + server-side logging
  - `src/app/settings/page.tsx` — generic user-facing error message
- ✅ `PROJECT_AUDIT.md` created with full findings

### Context for Next Session

**Stack:** Next.js 14 SPA, Supabase, Tailwind, shadcn/ui
**Auth:** Supabase Auth with middleware + client-side provider
**Data:** All pages fetch independently via `useEffect` — no caching layer
**Images:** Cloudinary (signed + unsigned fallback)

**Key Files to Know:**
- `src/lib/supabase.ts` — browser client singleton
- `src/middleware.ts` — auth redirect logic
- `src/components/auth-provider.tsx` — session + inactivity timeout
- `src/components/layout/app-layout.tsx` — sidebar + portfolio switcher
- `src/components/trades/trade-form.tsx` — 905-line monolith (needs refactor)
- `src/app/settings/page.tsx` — danger zone logic duplicated

**Open Risks (highest first):**
1. No CSRF protection on API routes
2. No rate limiting
3. Cloudinary unsigned upload fallback
4. Trade form too large (905 lines)
5. No query caching (React Query/SWR)
6. No pagination on trades list
7. No tests anywhere

**Rules from PROJECT_CONTEXT.md:**
- Preserve existing UI
- Do not modify authentication
- Do not modify database schema without approval

**Rules from AI_RULES.md:**
- Lazy context loading — don't scan everything
- Minimal changes — smallest fix possible
- Approval gate for medium/high changes
- Stop if solution fails, try ONE alternative

---

## Quick Reference

### Running the App
```bash
npm run dev     # localhost:3000
npm run build   # production build
npm run lint    # ESLint
```

### Key Env Vars (from .env.example)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Database Migrations Location
`supabase/migrations/`

### API Routes
- `POST /api/delete-account` — deletes user + images
- `POST /api/delete-image` — deletes single Cloudinary image
- `POST /api/delete-images-bulk` — bulk Cloudinary delete
- `GET /api/sign-cloudinary` — generates signed upload signature

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-10 | Fixed service role key exposure with generic messages | Security > debuggability; server logs retain detail |
| 2026-06-10 | Updated PROJECT_AUDIT.md Fix Log to ✅ Applied | Persistence rule compliance |
| 2026-06-10 | Batch 1+2: Trade Detail user filter, XSS sanitize-on-save, Cloudinary signed-only | Defense in depth, remove insecure fallbacks |
| 2026-06-10 | Batch 3+4+5: Rate limiting on all API routes, removed window.reload() usage, deduped Danger Zone | UX improvement + abuse prevention |
| 2026-06-11 | Expanded assets in schema.sql (50+ instruments) | User request for more symbols |
| 2026-06-11 | Expanded strategies in trade-form.tsx (10 strategies, 40+ subs) | User request for more strategies |
| 2026-06-11 | Statistics page title polish | User request for modern look |
| 2026-06-11 | Batch 1: 3-tier timeframe fields + smart status sync | Critical UX fix + new feature |
| 2026-06-11 | Batch 2: Collapsible sidebar | User request for layout flexibility |
| 2026-06-11 | Batch 3: Removed non-functional "Generate Secure Link" | Remove confusing placeholder |
| 2026-06-11 | Batch 4: Modern abstract app icons | Brand refresh |
| 2026-06-11 | Batch 5: Timeframe performance analytics | Statistical edge refinement |
