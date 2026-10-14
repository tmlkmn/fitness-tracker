import type { ReactNode } from "react";

// page.tsx is a client component and can't export segment config, so the limit
// lives on this pass-through layout. It covers the server actions called from
// the calendar's day panel, including the AI plan flows (daily meals, daily
// workout): up to 300s initial call + 2×200s retries — see AI_RETRY_TIMEOUT_MS.
export const maxDuration = 800;

export default function TakvimLayout({ children }: { children: ReactNode }) {
  return children;
}
