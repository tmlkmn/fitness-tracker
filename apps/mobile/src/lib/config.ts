/**
 * Base URL of the FitMusc web app — its `/api/*` is this app's only backend.
 * Override with EXPO_PUBLIC_API_URL in apps/mobile/.env.local (e.g. a LAN
 * address like http://192.168.1.20:3000 while running the web app locally).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://www.fitmusc.com").replace(/\/+$/, "");

/** Deep-link scheme (app.json `scheme`); the server trusts `fitmusc://` as origin. */
export const APP_SCHEME = "fitmusc";
