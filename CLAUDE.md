# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema directly to DB |
| `npm run db:seed` | Seed DB with 4-week program data |
| `npm run db:studio` | Open Drizzle Studio GUI |

No test framework is configured.

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Neon PostgreSQL · Drizzle ORM · TanStack React Query · Tailwind CSS v4 · shadcn/ui · better-auth

**Data flow pattern** (three layers):
1. **Server Actions** (`src/actions/`) — all DB operations via Drizzle ORM, marked `"use server"`. Mutations call `revalidatePath()`. Actions that access user data call `getAuthUser()` for session-based userId.
2. **Custom Hooks** (`src/hooks/`) — TanStack React Query wrappers. Queries call server actions as `queryFn`; mutations invalidate relevant keys on success. 60s stale time.
3. **Components** — client components consume hooks; server components (e.g. `src/app/gun/[dayId]/page.tsx`) call server actions directly with `await`.

**Routing** — Turkish-language route names:
- `/` — dashboard
- `/takvim` — weekly calendar (date-based, real dates)
- `/gun/[dayId]` — single day detail (meals + workout tabs)
- `/ilerleme` — progress tracking (weight chart, measurements)
- `/alisveris` — shopping list (per-week, grouped by category)
- `/ayarlar` — settings/profile + sign out
- `/giris` — login page
- `/bekliyor` — approval waiting page
- `/sifre-degistir` — forced password change (after invite)
- `/sifremi-unuttum` — forgot password (public)
- `/sifre-sifirla` — reset password with token (public)
- `/paylasilan` — list of plans shared with the current user
- `/paylasilan/hafta/[weeklyPlanId]` — shared weekly plan detail (read-only)
- `/paylasilan/gun/[dayId]` — shared daily plan detail (read-only, meals + workout tabs)
- `/asistan` — AI fitness coach chat
- `/admin` — admin user management panel
- `/admin/davet` — invite new user form

**Authentication** (better-auth):
- Server config: `src/lib/auth.ts` — betterAuth with drizzle adapter, emailAndPassword provider, admin plugin
- Client: `src/lib/auth-client.ts` — createAuthClient with useSession, signIn, signOut, adminClient plugin
- API route: `src/app/api/auth/[...all]/route.ts` — toNextJsHandler
- Proxy: `src/proxy.ts` — redirects unauthenticated users to `/giris`, public paths: `/giris`, `/bekliyor`, `/sifremi-unuttum`, `/sifre-sifirla`, `/api/auth`, `/api/cron`
- Auth utility: `src/lib/auth-utils.ts` — `getAuthUser()` for regular actions, `getAuthAdmin()` for admin actions
- Email service: `src/lib/email.ts` — Resend for invite and password reset emails
- Admin actions: `src/actions/admin.ts` — inviteUser, listAllUsers, resendInvite, removeUserAction
- Password actions: `src/actions/password.ts` — forceChangePassword, requestPasswordReset
- Ownership: `src/lib/ownership.ts` — entity ownership verification helpers + read-access checks for shared plans
- Sharing actions: `src/actions/sharing.ts` — shareWeeklyPlan, revokeShare, getMySharesForPlan, getPlansSharedWithMe, getShareableUsers
- Shared plan actions: `src/actions/shared-plans.ts` — read-only data access for shared weekly/daily plans, meals, exercises, supplements, shopping lists
- Seeded credentials: `user@fitmusc.app` / `fitmusc123`, `temel.ekmen28@gmail.com` / `Admin123` (admin)

**Database**: 16 tables defined in `src/db/schema.ts` — `users` (text PK), `sessions`, `accounts`, `verifications` (auth), `weeklyPlans`, `dailyPlans`, `meals`, `exercises`, `supplements`, `progressLogs`, `shoppingLists`, `shares`, `notifications`, `pushSubscriptions`, `notificationPreferences`, `reminders`. Connection is a lazy singleton Proxy in `src/db/index.ts` requiring `DATABASE_URL` env var.

**Component organization**: UI primitives in `src/components/ui/` (shadcn/ui). Domain components grouped by feature: `meals/`, `workout/`, `progress/`, `shopping/`, `supplements/`, `calendar/`, `ai/`, `sharing/`, `notifications/`, `reminders/`, `layout/`.

## Key Conventions

- **Auth-protected app** — better-auth with email/password. Invite-only model (no public sign-up). Users must have `isApproved: true` to access the app. Admin role (`role: "admin"`) manages user invitations.
- **Admin-managed users** — Admin invites users via email (Resend). Invited users get a temp password (24h expiry), must change it on first login, then become approved.
- **All UI content is in Turkish** — route names, labels, meal descriptions, exercise names
- **Dark mode only** — hardcoded `className="dark"` on `<html>`, green primary color
- **Mobile-first PWA** — layout constrained to `max-w-lg mx-auto`, persistent bottom nav, standalone manifest
- **Date-based calendar** — dailyPlans have real dates, weeklyPlans have startDate. Program starts 2026-04-13.
- **Path alias**: `@/*` maps to `./src/*`
- **Next.js 16 uses `proxy.ts`** instead of `middleware.ts` for route-level middleware (named export `proxy`)
- **AI features** (Claude API via `@anthropic-ai/sdk`) — four AI integrations: (1) Meal variation suggestions (`src/actions/ai.ts` → `generateMealVariation`) shown via `AiSuggestButton` on each `MealCard`, (2) Exercise form tips (`getExerciseFormTips`) via `ExerciseFormTips` dialog on each `ExerciseCard`, (3) Progress analysis (`/api/ai/analyze` streaming route) with `ProgressAiAnalysis` card on `/ilerleme`, (4) AI coach chat (`/api/ai/chat` streaming route) at `/asistan` page. Infrastructure: `src/lib/ai.ts` (singleton client, rate limiter, model constants), `src/lib/ai-context.ts` (user context builder with 5-min TTL cache), `src/lib/ai-prompts.ts` (Turkish system prompts). Models: Haiku 4.5 for fast tasks (meals, exercises), Sonnet 4.6 for complex tasks (analysis, chat). Cost optimization: prompt caching (`cache_control: { type: "ephemeral" }`) on all system prompts, feature-based daily rate limits (meal: 10/day, exercise: 15/day, analyze: 3/day, chat: 20/day), server-side exercise tips cache (Map by exercise name), buildUserContext 5-min TTL cache, chat max_tokens 512 + 12-message history limit, progress analysis limited to 10 logs + 3 segment rows.
- **Plan sharing** — users can share weekly plans (read-only) with other approved users. Owner manages shares via `ShareManager` on settings page. Shared plans are browsed under `/paylasilan` routes. Access is verified via `verifyWeeklyPlanReadAccess` / `verifyDailyPlanReadAccess` in `src/lib/ownership.ts`.
- **Notification system** — three channels: in-app (DB-stored, bell icon with popover dropdown), email (Resend), push (web-push via VAPID + Serwist service worker). Central dispatch in `src/lib/notifications.ts`. Per-user preferences in `notificationPreferences` table. Push subscriptions stored in `pushSubscriptions`. Triggers: plan sharing (`sharing.ts`), user invite (`admin.ts`), reminders (cron). Unread count polled every 30s. Auto-mark-as-read on dropdown open.
- **Reminder system** — three types: custom (user-defined time + recurrence), meal (X min before each meal's `mealTime`), workout (X min before `defaultWorkoutTime`). Preset templates in `src/lib/reminder-templates.ts` (su iç, esneme, duruş kontrolü, etc.). CRUD via `src/actions/reminders.ts`. Vercel Cron (`vercel.json`) triggers `/api/cron/reminders` every minute, which queries due reminders per user timezone and dispatches via `sendNotification()`. Recurrence options: daily, weekdays, weekends, once, custom days. Settings card on `/ayarlar`. `CRON_SECRET` env var for cron auth.

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for better-auth session signing
- `BETTER_AUTH_URL` — Base URL for better-auth (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_APP_URL` — Public app URL for auth client
- `RESEND_API_KEY` — Resend API key for sending invite and password reset emails
- `EMAIL_FROM` — (optional) From address for emails (default: `FitMusc <onboarding@resend.dev>`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key for web push (generate with `npx tsx scripts/generate-vapid-keys.ts`)
- `VAPID_PRIVATE_KEY` — VAPID private key for web push (server-only)
- `CRON_SECRET` — Secret for Vercel Cron job authentication (used by `/api/cron/reminders`)
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude AI features (server-only, used by `@anthropic-ai/sdk`)

## Development Guidelines

Security, SEO, responsive, performance, accessibility, and code quality rules are defined in [`.github/copilot-instructions.md`](.github/copilot-instructions.md). All AI assistants and contributors must follow those rules.

### Security Checklist (yeni kod yazarken)
- **API route'lar**: `auth.api.getSession()` ile auth kontrolü zorunlu (cron endpoint'ler hariç)
- **Cron endpoint'ler**: `if (!cronSecret || authHeader !== ...)` pattern'i — secret yoksa deny
- **Input validation**: `request.json()` body'si mutlaka doğrulanmalı (type check + max length)
- **Push subscriptions**: endpoint URL `https://` olarak validate edilmeli
- **Security headers**: `next.config.ts` `headers()` fonksiyonunda tanımlı (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control)
- **Env güvenliği**: `.env*` gitignore'da, `NEXT_PUBLIC_` prefix'i ile DB/API key paylaşılmamalı

### SEO & Erişilebilirlik Kuralları
- Uygulama **invite-only** — `robots: { index: false }` ve `public/robots.txt` → `Disallow: /`
- Root layout'ta `title.template`, `openGraph`, `robots` metadata tanımlı
- `<nav>` elementlerinde `aria-label` zorunlu, aktif link'te `aria-current="page"`
- Heading hiyerarşisi: her sayfada tek `<h1>`, altında `<h2>`, `<h3>`
