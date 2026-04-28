"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Settings2 } from "lucide-react";
import { saveCookieConsent } from "@/actions/cookie-consent";
import Link from "next/link";

const CONSENT_KEY = "fitmusc_cookie_consent";
const DISMISS_EVENT = "fitmusc:cookie-consent-dismissed";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  timestamp: number;
}

function readHasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) !== null;
  } catch {
    return false;
  }
}

function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

function storeConsent(consent: ConsentState) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // localStorage may be unavailable (private mode, quota, disabled cookies).
    // Swallow — banner will be dismissed for this session via state.
  }
  // Notify same-tab listeners (the `storage` event only fires cross-tab).
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export function CookieConsent() {
  // useSyncExternalStore handles SSR safely (server snapshot = `true` —
  // hasConsent treated as already given, so banner doesn't render on the
  // server) and re-renders the moment localStorage changes.
  const hasConsent = useSyncExternalStore(
    subscribeConsent,
    readHasConsent,
    () => true,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  if (hasConsent) return null;

  const dismissWith = (analyticsValue: boolean) => {
    const consent: ConsentState = {
      necessary: true,
      analytics: analyticsValue,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    void saveCookieConsent({ necessary: true, analytics: analyticsValue }).catch(
      () => {
        // Server-side persistence is best-effort; local consent already stored.
      },
    );
  };

  const handleAcceptAll = () => dismissWith(true);
  const handleAcceptSelected = () => dismissWith(analytics);
  const handleRejectOptional = () => dismissWith(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto rounded-xl border border-border bg-card shadow-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Çerez Politikası</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bu uygulama, oturum yönetimi için zorunlu çerezler kullanır.
              Ayrıca deneyiminizi iyileştirmek için analitik çerezler kullanmak
              istiyoruz.{" "}
              <Link href="/gizlilik" className="underline hover:text-foreground">
                Gizlilik Politikası
              </Link>
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-2 pl-8">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked
                disabled
                className="rounded border-border"
              />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Zorunlu Çerezler</strong> — Oturum yönetimi, güvenlik
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Analitik Çerezler</strong> — Kullanım istatistikleri, performans ölçümü
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 pl-8">
          {!showDetails ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1"
              >
                Tümünü Kabul Et
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRejectOptional}
                className="flex-1"
              >
                Sadece Zorunlu
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(true)}
                className="px-2"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handleAcceptSelected}
                className="flex-1"
              >
                Seçimi Kaydet
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAcceptAll}
                className="flex-1"
              >
                Tümünü Kabul Et
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
