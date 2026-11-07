import { DarkTheme } from "expo-router";

/** The web app's dark palette (apps/web/src/app/globals.css `.dark`). Dark mode only, like the web. */
export const colors = {
  background: "#0c0a09",
  card: "#1c1917",
  cardPressed: "#292524",
  border: "#27272a",
  text: "#f2f2f2",
  textMuted: "#a1a1aa",
  primary: "#22c55e",
  primaryText: "#052e16",
  warning: "#f59e0b",
  danger: "#f87171",
  dangerBg: "#7f1d1d",
} as const;

/** Accent hues the web dashboard uses (Tailwind 500/400 steps): calories, protein, streak flame. */
export const accents = {
  orange: "#f97316",
  orangeLight: "#fb923c",
  amber: "#fbbf24",
  red: "#ef4444",
  sky: "#0ea5e9",
  violet: "#a78bfa",
} as const;

/** Macro chips and rings: each also carries its label, never colour alone. */
export const macroColors = {
  calories: accents.orange,
  protein: accents.sky,
  carbs: accents.amber,
  fat: accents.violet,
} as const;

/** `#rrggbb` + alpha → `rgba()`, for tinted backgrounds and ring tracks. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, full: 999 } as const;

export const navigationTheme: typeof DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

/**
 * Single-series chart colours (one per card, never side by side; each ≥3:1 on `card`).
 * Water/sleep follow the web's blue/indigo.
 */
export const seriesColors = {
  weight: colors.primary,
  water: "#38bdf8",
  sleep: "#818cf8",
} as const;
