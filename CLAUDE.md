# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Monorepo Layout

npm workspaces (root `package.json`: `apps/web` + `packages/*`). One lockfile at the root for those; run `npm install` from the root. `apps/mobile` is the exception (below).

- `apps/web` (`@fitmusc/web`) — this Next.js app. **Every `src/`, `scripts/`, `drizzle/`, `public/` path in this file is relative to `apps/web/`.** `.env.local`, `.env.sentry-build-plugin`, `vercel.json` and `eval-results/` live there too.
- `packages/shared` (`@fitmusc/shared`) — pure TypeScript used by web and mobile: locale / date / unit helpers, meal labels + macros, food reference data, sync payloads, reminder templates, the weekly plan's default day split (`day-modes-default`), meal emoji presets (`meal-icons`), the v1 API contract (`api/schemas` zod request schemas, `api/dto` response types, `api/errors` error codes) and the i18n catalogs (`packages/shared/messages/{tr,en}.json`). Shipped as TS source, no build step (`transpilePackages` in `next.config.ts`). Import as `@fitmusc/shared/<module>`, e.g. `@fitmusc/shared/date-format`, `@fitmusc/shared/foods`. **Rules:** nothing from `apps/*`, `@/`, db, next, React or Node APIs — the code must also run in React Native; relative imports inside the package. `npm run typecheck:shared` type-checks it without DOM/Node globals.
- `apps/mobile` (`@fitmusc/mobile`) — Expo SDK 58 app (expo-router, React Native 0.88, React 19.3). Consumes `/api/v1/*` only; never connects to Neon directly. **Not an npm workspace**: it has its own `package-lock.json` and is installed with `npm install` inside `apps/mobile`, so React Native never shares a dependency tree or React version with the web app (and Vercel's `npm ci` never installs it). It reads `packages/shared` through a `file:` dependency; `apps/mobile/metro.config.js` watches the package and resolves its imports from the app's own `node_modules`. See `apps/mobile/CLAUDE.md`.
- Vercel project Root Directory must be `apps/web`.

## Build & Development Commands

Run from the repo root — each script proxies to the `@fitmusc/web` workspace (cwd `apps/web`).

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
| `npm run eval:plans -- --label <name>` | Plan-quality eval (spends real API money; see below) |
| `npm run check:macro-engine` | Assertion checks for the macro engine |
| `npm run typecheck:shared` | Type-check `packages/shared` (no DOM/Node globals) |

No test framework is configured.

**Deliberate dependency pins** (`apps/web/package.json`):
- `better-auth`, `@better-auth/core` and `@better-auth/expo` stay on `~1.6.x`, on both web and mobile. 1.7 adds a required `accounts.issuer` column (a production DB migration plus backfill) and makes the expo client's `getCookie()` async. The advisories npm audit still lists for 1.6.x need plugins this app doesn't use: device authorization, OAuth proxy, Magic Link with social login.
- `eslint-plugin-react-hooks` is pinned to `7.0.1`, with `eslint-config-next` kept at 16.2.x for it. 7.1.x reports 15 existing set-state-in-effect / refs patterns in the web UI; adopting it is a separate cleanup.

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Neon PostgreSQL · Drizzle ORM · TanStack React Query · Tailwind CSS v4 · shadcn/ui · better-auth

**Data flow pattern** (three layers):
1. **Server Actions** (`src/actions/`) — all DB operations via Drizzle ORM, marked `"use server"`. Mutations call `revalidatePath()`. Actions that access user data call `getAuthUser()` for session-based userId.
2. **Custom Hooks** (`src/hooks/`) — TanStack React Query wrappers. Queries call server actions as `queryFn`; mutations invalidate relevant keys on success. 60s stale time.
3. **Components** — client components consume hooks; server components (e.g. `src/app/gun/[dayId]/page.tsx`) call server actions directly with `await`.

**Routing** — bilingual (Turkish + English) via `next-intl` localized pathnames. All pages live under `src/app/[locale]/*` and the canonical (TR) → localized mapping is defined in `src/i18n/routing.ts`. URLs always carry a `/tr` or `/en` prefix.

- `/tr` ↔ `/en` — dashboard
- `/tr/takvim` ↔ `/en/calendar` — weekly calendar (date-based, real dates)
- `/tr/gun/[dayId]` ↔ `/en/day/[dayId]` — single day detail (meals + workout tabs)
- `/tr/ilerleme` ↔ `/en/progress` — progress tracking (weight chart, measurements)
- `/tr/alisveris` ↔ `/en/shopping` — shopping list (per-week, grouped by category)
- `/tr/ayarlar` ↔ `/en/settings` — settings/profile + sign out
- `/tr/ogunlerim` ↔ `/en/my-meals` — meal library (saved meals + saved daily plans, tabbed)
- `/tr/giris` ↔ `/en/login` — login page
- `/tr/bekliyor` ↔ `/en/pending` — approval waiting page
- `/tr/sifre-degistir` ↔ `/en/change-password` — forced password change (after invite)
- `/tr/sifremi-unuttum` ↔ `/en/forgot-password` — forgot password (public)
- `/tr/sifre-sifirla` ↔ `/en/reset-password` — reset password with token (public)
- `/tr/paylasilan` ↔ `/en/shared` — list of plans shared with the current user
- `/tr/paylasilan/hafta/[weeklyPlanId]` ↔ `/en/shared/week/[weeklyPlanId]` — shared weekly plan detail (read-only)
- `/tr/paylasilan/gun/[dayId]` ↔ `/en/shared/day/[dayId]` — shared daily plan detail (read-only, meals + workout tabs)
- `/tr/asistan` ↔ `/en/assistant` — AI fitness coach chat
- `/tr/admin` ↔ `/en/admin` — admin user management panel
- `/tr/admin/davet` ↔ `/en/admin/invite` — invite new user form
- `/tr/kvkk` — TR-only (T.C. mevzuat terimi, kept untranslated)
- `/tr/acik-riza` ↔ `/en/consent` — KVKK explicit consent (status page; see **KVKK consents**)

**Authentication** (better-auth):
- Server config: `src/lib/auth.ts` — betterAuth with drizzle adapter, emailAndPassword provider, admin plugin
- Client: `src/lib/auth-client.ts` — createAuthClient with useSession, signIn, signOut, adminClient plugin
- API route: `src/app/api/auth/[...all]/route.ts` — toNextJsHandler
- Proxy: `src/proxy.ts` — composes `next-intl` middleware with auth; redirects unauthenticated users to `/{locale}/giris` (or `/{locale}/login`). Public paths (locale-stripped): `/giris`, `/bekliyor`, `/sifremi-unuttum`, `/sifre-sifirla`, `/api/auth`, `/api/cron`
- Auth utility: `src/lib/auth-utils.ts` — `getAuthUser()` for regular actions, `getAuthAdmin()` for admin actions
- Email service: `src/lib/email.ts` — Mailjet for invite and password reset emails
- Admin actions: `src/actions/admin.ts` — inviteUser, listAllUsers, resendInvite, removeUserAction
- Password actions: `src/actions/password.ts` — forceChangePassword, requestPasswordReset
- Ownership: `src/lib/ownership.ts` — entity ownership verification helpers + read-access checks for shared plans
- Sharing actions: `src/actions/sharing.ts` — shareWeeklyPlan (by e-mail or a previous recipient's id; returns `{ ok, error }`), revokeShare, getMySharesForPlan, getPlansSharedWithMe, getShareableUsers (previous recipients only); core in `src/lib/sharing.ts`
- Shared plan actions: `src/actions/shared-plans.ts` — read-only data access for shared weekly/daily plans, meals, exercises, supplements, shopping lists
- Seeded credentials: `user@fitmusc.app` / `fitmusc123`, `temel.ekmen28@gmail.com` / `Admin123` (admin)

**Database**: 17 tables defined in `src/db/schema.ts` — `users` (text PK), `sessions`, `accounts`, `verifications` (auth), `weeklyPlans`, `dailyPlans`, `meals`, `exercises`, `supplements`, `progressLogs`, `shoppingLists`, `shares`, `notifications`, `pushSubscriptions`, `notificationPreferences`, `reminders`, `userFoods`. Connection is a lazy singleton Proxy in `src/db/index.ts` requiring `DATABASE_URL` env var.

**Recent schema additions** (meal flow improvements):
- `meals.icon` — nullable text; emoji override that takes precedence over label-based `getMealIcon()` fallback
- `users.target_calories`, `target_protein_g`, `target_carbs_g`, `target_fat_g` — manual macro targets; if null, `computeDefaultTargets()` calculates via Mifflin-St Jeor BMR × 1.55 activity
- `shopping_lists.meal_ids` — jsonb `number[]`; tracks which meal ids each shopping item originated from (cleared in `deleteMeal`)
- `user_foods` — user-defined custom foods (name, portion, kcal, macros, category) usable alongside the static Turkish food reference

**Component organization**: UI primitives in `src/components/ui/` (shadcn/ui). Domain components grouped by feature: `meals/`, `workout/`, `progress/`, `shopping/`, `supplements/`, `calendar/`, `ai/`, `sharing/`, `notifications/`, `reminders/`, `layout/`.

## Key Conventions

- **Auth-protected app** — better-auth with email/password. Hybrid onboarding: admins invite users directly *and* there is a public marketing/sign-up flow (Lemon Squeezy + iyzico billing). Users must have `isApproved: true` to access the app; admin invites approve by default, billing flow approves after a successful trial/checkout. Admin role (`role: "admin"`) manages user invitations and operations.
- **Admin-managed users** — Admin invites users via email (Mailjet). Invited users get a temp password (24h expiry), must change it on first login, then become approved.
- **Bilingual (TR + EN) via next-intl** — see the **i18n** section below for layout, navigation, prompts, dates, and email/notification dispatch. User-generated content (meal/exercise/note text) is stored in whatever language it was entered and is not translated.
- **Dark mode only** — hardcoded `className="dark"` on `<html>`, green primary color
- **Mobile-first PWA** — layout constrained to `max-w-lg mx-auto`, persistent bottom nav, standalone manifest
- **Date-based calendar** — dailyPlans have real dates, weeklyPlans have startDate. Program starts 2026-04-13.
- **Path alias**: `@/*` maps to `./src/*`
- **Next.js 16 uses `proxy.ts`** instead of `middleware.ts` for route-level middleware (named export `proxy`)
- **AI features** (Claude API via `@anthropic-ai/sdk`) — six AI integrations: (1) Meal variation suggestions (`src/actions/ai.ts` → `generateMealVariation`) shown via `AiSuggestButton` on each `MealCard`, (2) Exercise form tips (`getExerciseFormTips`) via `ExerciseFormTips` dialog on each `ExerciseCard`, (3) Progress analysis (`/api/ai/analyze` streaming route) with `ProgressAiAnalysis` card on `/ilerleme`, (4) AI coach chat (`/api/ai/chat` streaming route) at `/asistan` page, (5) Daily meal plan regeneration (`generateDailyMealPlan` in `src/actions/ai-meals.ts`) for full-day meal swaps, (6) Weekly plan generation (`/api/ai/weekly` route + `useGenerateWeeklyPlan` hook) producing both nutrition and workout for a week. Meal variation context now includes today's running macro totals and user targets so suggestions respect remaining macro budget — see `buildUserContext` in `src/lib/ai-context.ts`. Infrastructure: `src/lib/ai.ts` (singleton client, rate limiter, model constants), `src/lib/ai-context.ts` (user context builder with 5-min TTL cache), `src/lib/ai-prompts.ts` (Turkish system prompts). Models: Haiku 4.5 (`claude-haiku-4-5`) for fast tasks (meals, exercises), Sonnet 5.5 (`claude-sonnet-5-5`) for complex tasks (analysis, chat). The three plan-generation flows (weekly plan, `generateDailyMeals`, `generateWorkoutReplacement`) run at an explicit `output_config.effort: "high"` (`AI_EFFORT` in `src/lib/ai-config.ts`; same as the model default — `xhigh` was tried and reverted; in the 2026-09-29 eval it pushed the weekly nutrition call past 32k max_tokens and the workout leg's retry past the time budget, so raise it only on new eval evidence) over a streamed request with 32k max_tokens and longer timeouts; the weekly run is capped by a shared 720s budget, and the pages hosting the daily actions (`gun/[dayId]`, `takvim` via its layout) export `maxDuration = 800`. All other AI calls send no effort. Cost optimization: prompt caching (`cache_control: { type: "ephemeral" }`) on all system prompts, feature-based daily rate limits (meal: 10/day, exercise: 15/day, analyze: 3/day, chat: 20/day), server-side exercise tips cache (Map by exercise name), buildUserContext 5-min TTL cache, chat max_tokens 512 + 12-message history limit, progress analysis limited to 10 logs + 3 segment rows. Quota transparency: every AI button renders `<AiQuotaBadge feature={...} />` (`src/components/ai/ai-quota-badge.tsx`); all AI mutation hooks invalidate `["ai.quota"]` in `onSettled`.
- **Plan generation pipeline** — cores live in `src/lib/ai-weekly-service.ts`, `src/lib/ai-daily-meal-service.ts` (`prepareDailyMeals` / `executeDailyMeals`) and `src/lib/ai-workout-service.ts`; the server actions/route only add auth, rate limit, ownership and `logAiUsage`. All three request structured output (`output_config.format` JSON schemas in `src/lib/ai-output-schemas.ts`); validators still run as a second line. **Daily meals go through the macro engine** (`src/lib/macro-engine.ts`): the model returns ingredients (grams, per-100g values, role) plus a `{n}` recipe template; code sums the macros, overrides per-100g values that deviate >25% from the static food DB, scales protein/carb/fat portions onto the day's targets (bounded multipliers) and renders `content`. The weekly nutrition leg keeps the prose format — in the eval the ingredient reply overran the 32k max_tokens for a 7-day call. Before muscle-volume checks, unknown English exercise names are batch-resolved into `exercise_demos` (`src/lib/exercise-demo-service.ts`, one Haiku call, not counted against user quota), and the weekly workout leg's sets are nudged into MEV–MRV bands (`src/lib/volume-adjuster.ts`). Tagged notes for fixes the system already applied (`[engine-scaled]`, `[volume-adjusted]`, …) are telemetry only — filter with `userFacingWarnings` / `isSystemNote` (`src/lib/ai-warning-telemetry.ts`) before showing warnings to users.
- **Plan-quality eval** — `scripts/eval-plans.ts` runs those cores against the admin test account's fixed plans (no real user data), persists nothing in the app, scores with the app's own validators and writes `eval-results/` (gitignored). Every run costs real API money; cumulative spend is capped at $15 in `eval-results/spend.json`. `--compare a,b` re-summarizes saved runs (per-run category counts, weekly per-leg gap scores). Measure any prompt/effort/model change with it before and after; revert changes that score worse.
- **Macro targets** — `src/lib/macro-targets.ts` computes defaults via Mifflin-St Jeor (kcal × 1.55 activity, protein = weight × 1.8 g, fat = 25% kcal, carbs = remainder). Manual overrides via `updateMacroTargets` in `src/actions/user.ts`. `DailyMacroSummary` renders progress bars with color bands (<90% amber, 90–110% primary, >110% destructive). 7-day trend powered by `getWeeklyMacroTotals` server action and `MacroTrendSparkline` (Recharts). Macro totals memoized via `@fitmusc/shared/meal-macros` to avoid per-render reduces. Portion math + custom-food multipliers in `@fitmusc/shared/food-math`.
- **Query key namespacing** — TanStack Query keys follow `["entity.action", ...params]` convention. Active namespaces: `meals.*` (`meals.byDay`, `meals.saved`, `meals.saved-plans`, `meals.frequent`, `meals.history`), `ai.*` (`ai.quota`, `ai.suggestions`). Older flat keys (`plans`, `exercises`, `today-dashboard`, `week-plans-date`, `dates-with-plans`) are intentionally kept for cross-domain queries. Invalidation relies on prefix matching — never rename a key without updating every `invalidateQueries` / `refetchQueries` / `setQueryData` site that touches it.
- **Revalidation strategy** — server actions use `revalidatePath()` (typically `revalidatePath("/")`), NOT `revalidateTag()`. Tag-based revalidation requires wrapping fetches in `unstable_cache({ tags })`, which loses request context and breaks cookie-based `getAuthUser()` (cross-user cache key collisions / auth bypass risk). Phase 5.1 of the meal flow plan deliberately skipped tag migration for this reason.
- **Unified meal picker** — `src/components/meals/unified-meal-picker.tsx` is the single entry point for picking meals in `meal-form-dialog.tsx`. Its tabs (Sık Kullanılan / Geçmiş / Kayıtlılarım / Günlük Planlar) cover all candidate sources via `searchMealCandidates` in `src/actions/meal-picker.ts`. The legacy `recent-meal-chips.tsx`, `meal-copy-picker.tsx`, and `meal-template-picker.tsx` were removed — do not reintroduce them.
- **Mobile API (`/api/v1`)** — stable REST surface for the Expo app in `src/app/api/v1/**`; each route is a thin adapter over an existing server action via `apiRoute()` (`src/lib/api/handler.ts`: `requireApiUser` gate → zod params/input from `@fitmusc/shared/api/schemas` → action → JSON, `undefined` → 204). Conventions: annotate the handler return as `Promise<JsonSource<XDto>>` so the action result is compile-checked against `@fitmusc/shared/api/dto`; ownership failures and malformed path ids are 404 (never 401 — that signs the mobile user out); id-keyed reads use `orNotFound()`, date-keyed reads return `null`; PUT when the action overwrites every field, PATCH (schema with `atLeastOneField`) when it only writes the keys sent; business-rule errors thrown by the action map through the route's `errors` option to an `ApiErrorCode` declared in `@fitmusc/shared/api/errors`. Never change a shipped v1 contract in place — old app builds stay installed; add `/api/v2` instead. Admin, billing and password endpoints are not in v1 yet. **AI (`/api/v1/ai/**`)**: short calls are synchronous; daily meals, workout replacement and the weekly plan run as background jobs (`src/lib/ai-jobs.ts`, table `ai_jobs`) — `POST /ai/jobs` checks quota + ownership, returns 202 and runs the same action / `generateWeeklyPlan` (`src/lib/ai-weekly-generate.ts`) in `after()` within the route's 800s; the app polls `GET /ai/jobs/[id]` and gets an Expo push (`tag: "ai-job"`) when it ends. Job DTOs (list and detail) carry the request `input` (the POST body minus `kind`), so the app can apply a result it reopens from a push. A "workout" job with `section` + `sectionLabel` regenerates only that section (`generateSectionReplacement`, same "workout" quota — no new kind, so no `ai_jobs_kind_check` migration); the app applies it through `/ai/workout-section/apply`. One unfinished job per user and kind (partial unique index); jobs older than 15 min are marked `JOB_TIMEOUT`. Chat / progress analysis / target weight share their cores with the web routes (`src/lib/ai-coach-chat.ts`, `ai-progress-analysis.ts`, `ai-target-weight.ts`); v1 chat also stores the reply server-side.
- **Plan sharing** — users can share weekly plans (read-only) with other approved users. **The app never lists its users**: the sharer types the recipient's e-mail (`findRecipientByEmail` in `src/lib/sharing.ts`: approved, non-frozen accounts only, any other address is the same `RECIPIENT_NOT_FOUND`, 10 lookups / 10 min per sharer), and `getShareableUsers` / `GET /api/v1/shareable-users` only return people the user shared with before. Owner manages shares via `ShareManager` on settings page. Shared plans are browsed under `/paylasilan` routes. Access is verified via `verifyWeeklyPlanReadAccess` / `verifyDailyPlanReadAccess` in `src/lib/ownership.ts`.
- **KVKK consents** — `users.data_consent_at` (required: health data + hosting abroad) and `users.ai_consent_at` (optional: sending data to Anthropic); helpers and the `*_SINCE` versions in `@fitmusc/shared/consent` (move a `*_SINCE` forward when the consent texts change materially and everyone is asked again). `getAuthUser()` throws `ConsentRequired` and `requireApiUser()` answers 403 `ConsentRequired` without the data consent (admins pass); `userHasDataConsent` (`src/lib/consent.ts`) re-checks the DB when the 5-minute session cookie cache still says "missing". Only giving the consent, account export / deletion, push unsubscribe, checkout and invoices skip it (`getAuthUserWithoutConsent`, `requireDataConsent: false`). Pages: the proxy (`resolveStatusRouteKey`) and the client `ConsentGuard` send such accounts to `/acik-riza`. `checkRateLimit` (`src/lib/ai.ts`) refuses every AI feature except exercise demos with `AI_CONSENT_REQUIRED` (v1: 403) without the AI consent; on the web each AI surface sits in `<AiConsentGate>`. Consents are read/written through `src/actions/consent.ts` (web) and `GET/PUT /api/v1/me/consents` (mobile). The privacy policy (`/gizlilik`) and KVKK text (`/kvkk`) list exactly what goes to which processor — update them with any new data flow or processor.
- **Notification system** — three channels: in-app (DB-stored, bell icon with popover dropdown), email (Mailjet), push (web-push via VAPID + Serwist service worker, plus Expo push for the mobile app — `src/lib/expo-push.ts`, device tokens in `expo_push_tokens`, registered through `POST /api/v1/push/expo-token`). Central dispatch in `src/lib/notifications.ts`; its push step sends to both. Expo reports dead devices on delivery receipts ~15 min after sending, so sent tickets are kept in `expo_push_tickets` and the reminders cron reads the receipts and prunes `DeviceNotRegistered` tokens. Per-user preferences in `notificationPreferences` table. Push subscriptions stored in `pushSubscriptions`. Triggers: plan sharing (`sharing.ts`), user invite (`admin.ts`), reminders (cron). Unread count polled every 30s. Auto-mark-as-read on dropdown open. Server logs route user ids and push endpoints through `src/lib/log-redact.ts` so production Vercel logs only contain SHA-256 prefixes (set `DEBUG_NOTIFICATIONS=1` to see raw values during debugging).
- **Reminder system** — three types: custom (user-defined time + recurrence), meal (X min before each meal's `mealTime`), workout (X min before `defaultWorkoutTime`). Preset templates in `@fitmusc/shared/reminder-templates` (server-side text lookup: `src/lib/reminder-template-text.ts`) (su iç, esneme, duruş kontrolü, etc.). CRUD via `src/actions/reminders.ts`. Vercel Cron (`vercel.json`) triggers `/api/cron/reminders` every 5 minutes with a 5-minute look-back tolerance; the route queries due reminders per user timezone and dispatches via `sendNotification()`. Recurrence options: daily, weekdays, weekends, once, custom days. Settings card on `/ayarlar`. `CRON_SECRET` env var for cron auth.

## i18n (next-intl)

The app is fully bilingual (Turkish + English). All page content, AI prompts, emails, push notifications, and the PWA manifest render in the user's locale.

- **Library**: `next-intl` v3+. Locale prefix is always present in URLs (`/tr/...`, `/en/...`); default is `tr`.
- **Routing**: `src/i18n/routing.ts` defines the TR-canonical → localized pathname mapping. All app pages live under `src/app/[locale]/*`. Use `@/i18n/navigation` (not `next/link` / `next/navigation`) so `Link`, `useRouter`, and `redirect` automatically apply the active locale's pathname.
- **Messages**: `packages/shared/messages/tr.json` and `en.json` (loaded through `src/i18n/messages.ts`; the mobile app reads the same catalogs). Top-level namespaces: `metadata`, `manifest`, `layout`, `nav`, `auth`, `common`, `dashboard`, `calendar`, `day`, `meals`, `mealLabels`, `workout`, `exercises`, `progress`, `shopping`, `settings`, `ogunlerim`, `asistan`, `admin`, `sharing`, `notifications`, `reminders`, `achievements`, `foods`, `goals`, `gender`, `activity`, `errors`, `validation`, `ai`, `email`, `legal`, etc. Use `useTranslations(ns)` (client) / `getTranslations({ locale, namespace })` (server).
- **Locale type**: `Locale = "tr" | "en"` (`@fitmusc/shared/locale`, also the source of next-intl's `routing.locales`). Helpers: `normalizeLocale(value)`, `isLocale(value)`, `getUserLocale(user)` reads `user.locale` from a better-auth session user.
- **User locale storage**: `users.locale` column (`'tr' | 'en'`, default `'tr'`). Admin picks the locale at invite time (`inviteUser(email, name, membership, locale)`). Users change it via the settings toggle, which calls `updateLocale` server action; the action `revalidatePath`s and the toggle `router.replace`s to the localized equivalent of the current pathname.
- **Meal labels**: stored canonically in Turkish (`Kahvaltı`, `Öğle Yemeği`, …) with a CHECK constraint on `meals.meal_label`. Display layer routes through `getLocalizedMealLabel(label, locale)` (`@fitmusc/shared/meal-labels`); `coerceMealLabel(input)` accepts either canonical TR or any locale display string (e.g. `"Breakfast"`) and normalizes back to canonical TR for storage. AI prompts always operate on canonical TR — the *response* is rendered in the user's locale, but persisted labels stay TR.
- **AI prompts**: `src/lib/ai-prompts.ts` exposes `getXxxPrompt(locale: Locale)` builders for all 15 prompts (meal variation, exercise tips, progress analysis, coach chat, weekly plan, daily meal plan, etc.). TR and EN system prompts are separate strings so Anthropic prompt caching works per-locale. `buildUserContext(userId, { locale })` (`src/lib/ai-context.ts`) renders all section headers/labels in the requested locale and uses cache key `${userId}:${locale}` (5-min TTL).
- **Emails**: `src/lib/email.ts` — `sendInviteEmail`, `sendResetEmail`, `sendNotificationEmail`, `sendMembershipExpiryEmail` all take a `locale: Locale = "tr"` argument. `emailLayout(content, locale)` sets `<html lang="...">` and footer link to `/en/settings` or `/tr/ayarlar`.
- **Notifications**: `sendNotification` (`src/lib/notifications.ts`) reads the *recipient's* `users.locale` and passes it to the email channel. Cross-user dispatchers (`sharing.ts`, `admin.ts`, `feedback.ts`) fetch the recipient's locale before calling `sendNotification`. Cron (`src/app/api/cron/reminders/route.ts`) joins `users.locale` and renders meal/workout/membership reminders per recipient.
- **Dates / numbers**: `@fitmusc/shared/date-format` exposes `formatDate(input, locale, options?)`, `formatTime(input, locale, options?)`, `parseDateOnly("YYYY-MM-DD")`, and `intlLocale(locale)`. Always go through these instead of inline `toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", …)`.
- **Foods**: `@fitmusc/shared/foods` exports `getFoodsByLocale(locale)` returning either `TURKISH_FOODS` (~73 entries) or `ENGLISH_FOODS` (~73 Western entries). Both share the same `FoodCategory` keys (`protein`, `karbonhidrat`, `yag`, `sebze_meyve`, `sut_urunleri`); category display labels live in the `foods.categories` namespace.
- **Manifest**: `src/app/manifest.ts` is a dynamic locale-aware PWA manifest served at `/manifest.webmanifest`. It reads the `NEXT_LOCALE` cookie (set by next-intl middleware), looks up the `manifest` namespace, and emits localized `name`/`short_name`/`description`/`shortcuts` plus a localized `start_url`. The old static `public/manifest.json` has been removed.
- **Adding new strings**: prefer i18n keys over hardcoded literals. Inline ternaries (`locale === "en" ? "Foo" : "Bar"`) are acceptable for one-off short labels but anything user-visible across multiple sites should be a key in `packages/shared/messages/{tr,en}.json`.

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Secret for better-auth session signing
- `BETTER_AUTH_URL` — Base URL for better-auth (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_APP_URL` — Public app URL for auth client
- `MJ_APIKEY_PUBLIC` — Mailjet API public key
- `MJ_APIKEY_PRIVATE` — Mailjet API private key
- `EMAIL_FROM_ADDRESS` — (optional) Sender email address (default: `noreply@fitmusc.com`)
- `EMAIL_FROM_NAME` — (optional) Sender display name (default: `FitMusc`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key for web push (generate with `npx tsx scripts/generate-vapid-keys.ts`)
- `VAPID_PRIVATE_KEY` — VAPID private key for web push (server-only)
- `CRON_SECRET` — Secret for Vercel Cron job authentication (used by `/api/cron/reminders`)
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude AI features (server-only, used by `@anthropic-ai/sdk`)
- `EXPO_ACCESS_TOKEN` — (optional) Expo access token; only needed once "Enhanced push security" is enabled for the Expo project

## Development Guidelines

Security, SEO, responsive, performance, accessibility, and code quality rules are defined in [`.github/copilot-instructions.md`](.github/copilot-instructions.md). All AI assistants and contributors must follow those rules.

### Security Checklist (yeni kod yazarken)
- **better-auth user fields**: `/update-user` is disabled (`disabledPaths` in `src/lib/auth.ts`) and every access-gate / billing / consent field is `input: false`. A new `additionalFields` entry the client must never set gets `input: false` too.
- **Sentry**: `sendDefaultPii: false` — no IP, cookies or headers in error reports; don't attach user data to events.
- **API route'lar**: `requireApiUser()` / `requireApiAdmin()` wrapper'ı (`src/lib/api-auth.ts`) ile auth + isApproved + (varsayılan olarak) aktif billing entitlement kontrolü zorunlu. Checkout / push subscribe-unsubscribe / invoice PDF / account export gibi billing veya approval olmadan da çalışması gereken route'larda `requireApproved` ve `requireActiveBilling` flag'leri ile bilinçli olarak gevşetilebilir. İstisnalar — wrapper kullanmayan route'lar: `api/auth/*` (better-auth), `api/cron/*` (CRON_SECRET), `api/webhooks/*` (HMAC), `api/push/diagnostic` (anon log toplar).
- **Cron endpoint'ler**: `if (!cronSecret || authHeader !== ...)` pattern'i — secret yoksa deny
- **Input validation**: `request.json()` body'si mutlaka doğrulanmalı (type check + max length)
- **Push subscriptions**: endpoint URL `https://` olarak validate edilmeli
- **Security headers**: `next.config.ts` `headers()` fonksiyonunda tanımlı (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control)
- **Env güvenliği**: `.env*` gitignore'da, `NEXT_PUBLIC_` prefix'i ile DB/API key paylaşılmamalı

### SEO & Erişilebilirlik Kuralları
- Uygulama yarı-açık — public marketing/legal sayfaları (`/fiyatlandirma`, `/tanitim`, `/kvkk`, vs.) `robots.txt` ile indekslenebilir; uygulama içi route'lar (`/`, `/takvim`, `/gun/...` vs.) `robots: { index: false }` ile noindex tutulur. `public/robots.txt` explicit `Allow` listesinin sonunda `Disallow: /` ile bu hibridi sağlar.
- Root layout'ta `title.template`, `openGraph`, `robots` metadata tanımlı
- `<nav>` elementlerinde `aria-label` zorunlu, aktif link'te `aria-current="page"`
- Heading hiyerarşisi: her sayfada tek `<h1>`, altında `<h2>`, `<h3>`
