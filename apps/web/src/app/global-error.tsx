"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4 p-4">
          <h1 className="text-xl font-bold">Bir hata oluştu</h1>
          <p className="text-sm text-muted-foreground">
            Beklenmedik bir sorun oluştu. Lütfen tekrar deneyin.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
