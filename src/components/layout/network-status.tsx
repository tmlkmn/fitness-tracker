"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useIsFetching, useIsMutating, useQueryClient } from "@tanstack/react-query";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const mutating = useIsMutating();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setShowReconnected(true);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(
          () => setShowReconnected(false),
          3000,
        );
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  const queuedCount = fetching + mutating;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-0 right-0 z-100 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md animate-in slide-in-from-top duration-200 ${
        isOnline
          ? "bg-success text-success-foreground"
          : "bg-destructive text-destructive-foreground"
      }`}
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          Bağlantı yeniden sağlandı
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Çevrimdışısın</span>
          {queuedCount > 0 && (
            <span className="text-xs opacity-90 tabular-nums">
              · {queuedCount} bekliyor
            </span>
          )}
          <button
            type="button"
            onClick={() => qc.refetchQueries()}
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-white/15 hover:bg-white/25 px-2 py-0.5 text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Tekrar Dene
          </button>
        </>
      )}
    </div>
  );
}
