# AI Notes — WJournal

> Working notes for AI coding agents. Update as work progresses.

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
