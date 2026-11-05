"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { queryPersister } from "./query-persister";
import { OutboxProvider } from "@/components/layout/outbox-provider";

export function QueryProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // Per-query opt-in via `meta: { persist: true }` — see query-persister.ts
            persister: queryPersister.persisterFn,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OutboxProvider />
      {children}
    </QueryClientProvider>
  );
}
