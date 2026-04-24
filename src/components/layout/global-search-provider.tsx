"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { GlobalSearchDialog } from "./global-search-dialog";

interface GlobalSearchCtx {
  open: () => void;
}

const Ctx = createContext<GlobalSearchCtx | null>(null);

export function useGlobalSearch() {
  const v = useContext(Ctx);
  if (!v) throw new Error("GlobalSearchProvider missing");
  return v;
}

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openFn = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Ctx.Provider value={{ open: openFn }}>
      {children}
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </Ctx.Provider>
  );
}
