"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, ShieldCheck } from "lucide-react";
import { hasAiConsent, hasDataConsent } from "@fitmusc/shared/consent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPrivacyCard } from "@/components/settings/data-privacy-card";
import { Link, useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { useConsents, useSetConsents } from "@/hooks/use-consents";
import { refreshConsentSession } from "@/actions/consent";

/**
 * KVKK explicit consent, asked once before the app (proxy / ConsentGuard send
 * every account without it here). Health data + hosting abroad are required;
 * the AI transfer to Anthropic is a separate, optional choice. Someone who
 * won't consent can still export or delete their account from here.
 */
export function ConsentForm() {
  const t = useTranslations("consent");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const { refetch } = useSession();
  const consents = useConsents();
  const save = useSetConsents();
  const [health, setHealth] = useState(false);
  const [abroad, setAbroad] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const [showDecline, setShowDecline] = useState(false);

  const alreadyGiven = hasDataConsent(consents.data?.dataConsentAt);
  useEffect(() => {
    if (!alreadyGiven) return;
    // Given elsewhere (e.g. the mobile app) while this browser's session
    // cache still says otherwise — refresh it, or the proxy sends us back.
    void (async () => {
      await refreshConsentSession().catch(() => {});
      await refetch();
      router.replace("/");
    })();
  }, [alreadyGiven, router, refetch]);

  if (consents.isLoading || alreadyGiven) {
    return <Skeleton className="h-96 w-full max-w-md rounded-xl" />;
  }

  // Until touched, the AI box mirrors a consent the user already gave.
  const aiChecked = ai ?? hasAiConsent(consents.data?.aiConsentAt);

  const submit = async () => {
    setError(false);
    try {
      await save.mutateAsync({ data: true, ai: aiChecked });
      // The action dropped the session cookie cache; reload the session so
      // the proxy and ConsentGuard see the consent before navigating.
      await refetch();
      router.replace("/");
      router.refresh();
    } catch {
      setError(true);
    }
  };

  const linkClass = "text-primary underline underline-offset-2 hover:text-primary/80";

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("intro")}</p>
          <p className="text-sm">
            {t("readFirst")}{" "}
            <Link href="/kvkk" target="_blank" className={linkClass}>
              {t("kvkkLink")}
            </Link>
            {" · "}
            <Link href="/gizlilik" target="_blank" className={linkClass}>
              {t("privacyLink")}
            </Link>
          </p>

          <div className="space-y-4">
            <ConsentBox id="consent-health" checked={health} onChange={setHealth} label={t("healthLabel")} />
            <ConsentBox id="consent-abroad" checked={abroad} onChange={setAbroad} label={t("abroadLabel")} />
            <ConsentBox
              id="consent-ai"
              checked={aiChecked}
              onChange={setAi}
              label={t("aiLabel")}
              hint={t("aiHint")}
            />
          </div>

          <p className="text-xs text-muted-foreground">{t("required")}</p>
          {error ? <p className="text-sm text-destructive">{t("error")}</p> : null}

          <Button className="w-full" disabled={!health || !abroad || save.isPending} onClick={submit}>
            {t("submit")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-2"
            aria-expanded={showDecline}
            onClick={() => setShowDecline((v) => !v)}
          >
            {t("declineTitle")}
          </button>
          {showDecline ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("declineBody")}</p>
              <DataPrivacyCard />
            </div>
          ) : null}
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await signOut();
              router.push("/giris");
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            {tNav("signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentBox({
  id,
  checked,
  onChange,
  label,
  hint,
}: Readonly<{
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}>) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <label htmlFor={id} className="text-sm leading-relaxed cursor-pointer">
        {label}
        {hint ? <span className="block text-xs text-muted-foreground mt-1">{hint}</span> : null}
      </label>
    </div>
  );
}
