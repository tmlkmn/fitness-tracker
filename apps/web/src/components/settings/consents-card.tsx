"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@fitmusc/shared/date-format";
import { hasAiConsent, hasDataConsent } from "@fitmusc/shared/consent";
import { normalizeLocale } from "@fitmusc/shared/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { useConsents, useSetConsents } from "@/hooks/use-consents";

/** Settings → My data: the KVKK consents with their dates; AI on/off, data consent withdrawal. */
export function ConsentsCard() {
  const t = useTranslations("consent.settings");
  const locale = normalizeLocale(useLocale());
  const router = useRouter();
  const { data: session, refetch } = useSession();
  const consents = useConsents();
  const save = useSetConsents();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string | null } | undefined)?.role === "admin";

  if (consents.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  const dataAt = consents.data?.dataConsentAt ?? null;
  const aiAt = consents.data?.aiConsentAt ?? null;
  const date = (iso: string) => formatDate(iso, locale, { day: "numeric", month: "long", year: "numeric" });

  const change = async (value: { data?: boolean; ai?: boolean }) => {
    try {
      await save.mutateAsync(value);
      return true;
    } catch {
      toast.error(t("error"));
      return false;
    }
  };

  const withdrawData = async () => {
    if (!(await change({ data: false }))) return;
    setConfirmOpen(false);
    await refetch();
    router.replace("/acik-riza");
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <span className="text-sm font-medium">{t("title")}</span>

        {/* Admins run the service and are never asked, so there's nothing to withdraw. */}
        {isAdmin ? null : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">{t("dataTitle")}</span>
            </div>
            {hasDataConsent(dataAt) && dataAt ? (
              <>
                <p className="text-sm text-muted-foreground">{t("dataGiven", { date: date(dataAt) })}</p>
                <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
                  {t("dataWithdraw")}
                </Button>
              </>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm">{t("aiTitle")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {hasAiConsent(aiAt) && aiAt ? t("aiGiven", { date: date(aiAt) }) : t("aiNotGiven")}
          </p>
          <Button
            size="sm"
            variant={hasAiConsent(aiAt) ? "outline" : "default"}
            disabled={save.isPending}
            onClick={() => void change({ ai: !hasAiConsent(aiAt) })}
          >
            {hasAiConsent(aiAt) ? t("aiRevoke") : t("aiAllow")}
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dataWithdrawTitle")}</DialogTitle>
            <DialogDescription>{t("dataWithdrawBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" disabled={save.isPending} onClick={() => void withdrawData()}>
              {t("dataWithdraw")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
