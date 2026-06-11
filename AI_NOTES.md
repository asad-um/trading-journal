# AI Notes — WJournal

> Working notes for AI coding agents. Update as work progresses.

---

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

### Supabase SQL Answer
**YES** — You need to run SQL in Supabase for:
1. **New timeframe columns** in `trades` table (highest_timeframe, analysis_timeframe, entry_timeframe)
2. **Existing users won't see new assets** — The schema.sql `handle_new_user()` trigger only runs for NEW signups. Existing users need an UPDATE query or manual addition.

**Migration file created:** `supabase/migrations/add_timeframe_columns.sql`
- Run this in Supabase SQL Editor to add the three new columns
- Existing trades will be backfilled with defaults: Daily / 1H / 15M

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
