"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { HeartPulse } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const ACK_KEY = "fitmusc_health_disclaimer_ack";
const COOKIE_KEY = "fitmusc_cookie_consent";
const ACK_EVENT = "fitmusc:health-disclaimer-ack";
const COOKIE_EVENT = "fitmusc:cookie-consent-dismissed";

/**
 * One-time medical/AI disclaimer notice (not a legal consent record, so it lives
 * in localStorage only — no server action). Mirrors CookieConsent's
 * useSyncExternalStore pattern so it disappears immediately on acknowledgement.
 * Shown only after the cookie banner has been dealt with, so the two cards never
 * stack on top of each other.
 */
function readShouldShow(): boolean {
  try {
    const acknowledged = localStorage.getItem(ACK_KEY) !== null;
    const cookieDecided = localStorage.getItem(COOKIE_KEY) !== null;
    return !acknowledged && cookieDecided;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(ACK_EVENT, onChange);
  window.addEventListener(COOKIE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ACK_EVENT, onChange);
    window.removeEventListener(COOKIE_EVENT, onChange);
  };
}

function storeAck() {
  try {
    localStorage.setItem(ACK_KEY, String(Date.now()));
  } catch {
    // localStorage may be unavailable (private mode, quota, disabled cookies).
    // Swallow — banner will be dismissed for this session via the event below.
  }
  // Notify same-tab listeners (the `storage` event only fires cross-tab).
  window.dispatchEvent(new Event(ACK_EVENT));
}

export function HealthDisclaimerConsent() {
  const shouldShow = useSyncExternalStore(
    subscribe,
    readShouldShow,
    () => false,
  );
  const t = useTranslations("disclaimer.consent");

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto rounded-xl border border-border bg-card shadow-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <HeartPulse className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("body")}{" "}
              <Link
                href="/feragatname"
                className="underline hover:text-foreground"
              >
                {t("moreInfo")}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <Button
            type="button"
            size="sm"
            onClick={storeAck}
            className="flex-1"
          >
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
