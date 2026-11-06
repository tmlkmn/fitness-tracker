# CLAUDE.md — apps/mobile

@AGENTS.md

FitMusc's Expo app. The repo-root `CLAUDE.md` covers the web app and the `/api/v1` contract this app consumes; everything here is relative to `apps/mobile/`.

## Setup & commands

Own install, not an npm workspace — run these inside `apps/mobile`:

| Command | Purpose |
|---|---|
| `npm install` | Install (own `package-lock.json`; add Expo modules with `npx expo install <pkg>`) |
| `npx expo start` | Dev server — scan the QR code with Expo Go (same Wi-Fi, or `--tunnel`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npx expo-doctor` | Dependency / config checks |
| `npx expo export --platform android` | Full bundle without a device (catches Metro resolution errors) |

`EXPO_PUBLIC_API_URL` (see `.env.local.example`) points the app at a backend; default is production `https://www.fitmusc.com`. Production data is real — the app is used with the owner's admin account.

## Architecture

- **Routes** (`src/app/`, expo-router): root `_layout.tsx` holds the providers and three `Stack.Protected` groups — signed out → `sign-in`; signed in but blocked → `blocked`; otherwise `(tabs)` (native tabs `(today)`, `calendar`, `progress`, `settings`, one `Stack` per tab) plus pushed screens `day/[dayId]`, `shopping` (`?week=`) and the modals `progress-log` (`?id=` to edit) and `sleep/[date]`. **Declare every new screen inside the signed-in `Stack.Protected` group** — an undeclared route is reachable without the guard. Past days are view-only, like the web (no completion toggles, water or sleep edits).
- **Session** (`src/lib/session.tsx`): better-auth `useSession` via `src/lib/auth-client.ts` (`@better-auth/expo`, cookie in SecureStore). A 401 from the API signs out; a 403 with an `AccessDenial` code (or `mustChangePassword` on the session user) shows the blocked screen. No purchases in the app — renewals and password flows open the web (`src/lib/web-links.ts`).
- **Origin**: Expo Go reports `exp://…` as `expo-origin`; `auth-client.ts` rewrites it to `fitmusc://`, the only app origin the server trusts. Never add `exp://` to the server's `trustedOrigins` in production — it would also accept password-reset redirects to any Expo Go bundle.
- **API** (`src/lib/api.ts`): `api<T>(path)` calls `/api/v1{path}` with the session cookie and throws `ApiRequestError { status, code }` (`code` = `ApiErrorCode` or `NETWORK`). Request/response types come from `@fitmusc/shared/api/{schemas,dto,errors}` — never redeclare them here.
- **Data** (`src/hooks/`): TanStack Query, 60s stale time, no retries on 4xx; completion toggles update the cached lists optimistically and roll back on error. Query keys are `["entity.action", ...params]` like the web.
- **i18n** (`src/lib/i18n.tsx`): `use-intl` with the web's catalogs (`@fitmusc/shared/messages`). Reuse the web's keys; app-only strings go in the `mobile` namespace of both `tr.json` and `en.json`. Locale = the user's (`PUT /me/locale`), the device's before sign-in.
- **Push** (`src/lib/push.ts`): registers the Expo token after sign-in, unregisters before sign-out. Needs a physical device and an EAS `projectId` (`eas init`); Expo Go on Android has no remote push (use a development build).
- **Dates** (`src/lib/dates.ts`): `YYYY-MM-DD` strings throughout; arithmetic in UTC so the phone's zone or a DST switch never shifts a day; "today" is Europe/Istanbul (`todayStr()`), like the server. The week starts on the user's `weekStartsOn` preference.
- **Charts** (`src/components/charts.tsx`): `LineChart` / `BarChart` on `react-native-svg`, one series per chart (the card title names it, no legend), tap or drag to read a value. Series colours are `seriesColors` (`theme.ts`); plan-type colour + icon live in `components/plan-type.tsx` — workout/swimming/rest were validated as a categorical set on the dark surface, so re-check the trio before recolouring one.
- **Forms** (`src/components/form.tsx`): `DateField` / `TimeField` use `@react-native-community/datetimepicker` (compact inline on iOS, system dialog on Android). Decimal inputs accept a comma (TR keyboard), are normalized to a dot and validated with the shared zod schema before sending.
- **Styling**: React Native `StyleSheet` with the web's dark palette (`src/lib/theme.ts`); dark mode only. Shared primitives in `src/components/ui.tsx`.
