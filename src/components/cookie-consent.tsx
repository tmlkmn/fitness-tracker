"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, Settings2 } from "lucide-react";
import { saveCookieConsent } from "@/actions/cookie-consent";
import Link from "next/link";

const CONSENT_KEY = "fitmusc_cookie_consent";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  timestamp: number;
}

function getStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeConsent(consent: ConsentState) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(() => !getStoredConsent());
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const handleAcceptAll = async () => {
    setSaving(true);
    const consent: ConsentState = { necessary: true, analytics: true, timestamp: Date.now() };
    storeConsent(consent);
    try {
      await saveCookieConsent({ necessary: true, analytics: true });
    } catch {
      // Silent — consent stored locally
    }
    setVisible(false);
    setSaving(false);
  };

  const handleAcceptSelected = async () => {
    setSaving(true);
    const consent: ConsentState = { necessary: true, analytics, timestamp: Date.now() };
    storeConsent(consent);
    try {
      await saveCookieConsent({ necessary: true, analytics });
    } catch {
      // Silent
    }
    setVisible(false);
    setSaving(false);
  };

  const handleRejectOptional = async () => {
    setSaving(true);
    const consent: ConsentState = { necessary: true, analytics: false, timestamp: Date.now() };
    storeConsent(consent);
    try {
      await saveCookieConsent({ necessary: true, analytics: false });
    } catch {
      // Silent
    }
    setVisible(false);
    setSaving(false);
  };

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
                size="sm"
                onClick={handleAcceptAll}
                disabled={saving}
                className="flex-1"
              >
                Tümünü Kabul Et
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectOptional}
                disabled={saving}
                className="flex-1"
              >
                Sadece Zorunlu
              </Button>
              <Button
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
                size="sm"
                onClick={handleAcceptSelected}
                disabled={saving}
                className="flex-1"
              >
                Seçimi Kaydet
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAcceptAll}
                disabled={saving}
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
