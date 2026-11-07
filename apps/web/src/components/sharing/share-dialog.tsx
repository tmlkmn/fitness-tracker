"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useShareableUsers, useShareWeeklyPlan } from "@/hooks/use-sharing";
import type { ShareResult, ShareTarget } from "@/actions/sharing";
import { useTranslations } from "next-intl";

interface ShareDialogProps {
  weeklyPlanId: number;
  existingShareUserIds: string[];
  trigger?: "default" | "icon";
  existingShareCount?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

// ShareResult error → its text in shareManager.errors.
const ERROR_KEY: Record<Extract<ShareResult, { ok: false }>["error"], string> = {
  RECIPIENT_NOT_FOUND: "notFound",
  CANNOT_SHARE_WITH_SELF: "self",
  PAST_WEEK: "pastWeek",
  ALREADY_SHARED: "alreadyShared",
  RATE_LIMITED: "rateLimited",
};

/**
 * Shares a week with someone the user names by e-mail — the app never lists
 * its users. People the user shared with before are offered for one tap.
 */
export function ShareDialog({
  weeklyPlanId,
  existingShareUserIds,
  trigger = "default",
  existingShareCount,
}: Readonly<ShareDialogProps>) {
  const t = useTranslations("shareManager");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previous = useShareableUsers();
  const shareMutation = useShareWeeklyPlan();

  const previousAvailable = previous.data?.filter((u) => !existingShareUserIds.includes(u.id)) ?? [];

  const share = async (target: ShareTarget) => {
    setError(null);
    try {
      const result = await shareMutation.mutateAsync({ weeklyPlanId, target });
      if (!result.ok) {
        setError(t(`errors.${ERROR_KEY[result.error]}`));
        return;
      }
      toast.success(t("shared"));
      setEmail("");
      setOpen(false);
    } catch {
      setError(t("errors.generic"));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    void share({ email: value });
  };

  const triggerNode =
    trigger === "icon" ? (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 relative"
        aria-label={t("shareButton")}
      >
        <Share2 className="h-3.5 w-3.5" />
        {existingShareCount != null && existingShareCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] tabular-nums"
          >
            {existingShareCount}
          </Badge>
        )}
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
        <UserPlus className="h-3.5 w-3.5" />
        {t("shareButton")}
      </Button>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("emailHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-2" noValidate>
          <Label htmlFor={`share-email-${weeklyPlanId}`}>{t("emailLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id={`share-email-${weeklyPlanId}`}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
            />
            <Button type="submit" disabled={shareMutation.isPending || email.trim().length === 0}>
              {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shareButton")}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        {previousAvailable.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("previousTitle")}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {previousAvailable.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void share({ userId: user.id })}
                  disabled={shareMutation.isPending}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {t("select")}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
