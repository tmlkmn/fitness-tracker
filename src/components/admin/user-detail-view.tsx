"use client";

import { useState, useTransition } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  resendInvite,
  removeUserAction,
  freezeUserAction,
  unfreezeUserAction,
} from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CalendarClock,
  RotateCw,
  Snowflake,
  Play,
  Trash2,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import type {
  UserAdminDetail,
  UserFeedbackItem,
} from "@/actions/admin-user-detail";
import {
  STATUS_CONFIG,
  daysSinceFrozen,
  useStatusLabel,
} from "./admin-labels";
import { ExtendDialog } from "./extend-dialog";
import { ConfirmFreezeDialog } from "./confirm-freeze-dialog";
import { NudgeDialog } from "./nudge-dialog";
import { ActivityTimeline } from "./activity-timeline";
import { ComplianceCard } from "./compliance-card";
import { WeightTrendCard } from "./weight-trend-card";

export function UserDetailView({
  detail,
}: Readonly<{ detail: UserAdminDetail }>) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tDetail = useTranslations("admin.userDetail");
  const tFreeze = useTranslations("admin.freeze");
  const tNudge = useTranslations("admin.nudge");
  const locale = useLocale() as Locale;
  const statusLabel = useStatusLabel();

  const [extendOpen, setExtendOpen] = useState(false);
  const [freezeDialog, setFreezeDialog] = useState<
    "freeze" | "unfreeze" | null
  >(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const onResend = async () => {
    startTransition(async () => {
      try {
        await resendInvite(detail.user.id);
        refresh();
      } catch {
        showToast(t("errors.inviteFailed"));
      }
    });
  };

  const onRemove = async () => {
    if (!confirm(t("actions.confirmDelete", { name: detail.user.name }))) return;
    startTransition(async () => {
      try {
        await removeUserAction(detail.user.id);
        router.push({ pathname: "/admin/kullanicilar" });
      } catch {
        showToast(t("errors.removeFailed"));
      }
    });
  };

  const u = detail.user;
  const cfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG["Aktif"];
  const StatusIcon = cfg.icon;
  const [mountedAt] = useState(() => Date.now());
  const canDelete = u.isFrozen && daysSinceFrozen(u.frozenAt) >= 30;
  const memberDays = Math.floor(
    (mountedAt - new Date(u.createdAt).getTime()) / 86_400_000,
  );

  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href={{ pathname: "/admin/kullanicilar" }}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            aria-label={tDetail("backToList")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold truncate">{u.name}</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-primary">
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{u.name}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusLabel(u.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {u.email}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tDetail("joinDate", {
                    date: formatDate(u.createdAt, locale),
                  })}{" "}
                  · {tDetail("memberSince", { days: memberDays })}
                </p>
                {u.membershipEndDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.membershipType} ·{" "}
                    {formatDate(u.membershipEndDate, locale)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              {u.status !== "Admin" && (
                <button
                  type="button"
                  onClick={() => setExtendOpen(true)}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <CalendarClock className="h-4 w-4" />
                  {t("actions.updateMembership")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setNudgeOpen(true)}
                disabled={pending || u.status === "Admin"}
                className="inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {tDetail("sendNudge")}
              </button>
              {(u.status === "Bekliyor" || u.status === "Süresi Dolmuş") && (
                <button
                  type="button"
                  onClick={onResend}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-input text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                  {t("actions.resendInvite")}
                </button>
              )}
              {u.status !== "Admin" && !u.isFrozen && (
                <button
                  type="button"
                  onClick={() => setFreezeDialog("freeze")}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-input text-blue-400 text-sm font-medium hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                >
                  <Snowflake className="h-4 w-4" />
                  {tFreeze("freezeButton")}
                </button>
              )}
              {u.status === "Dondurulmuş" && (
                <button
                  type="button"
                  onClick={() => setFreezeDialog("unfreeze")}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-input text-green-400 text-sm font-medium hover:bg-green-500/10 transition-colors disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {tFreeze("unfreezeButton")}
                </button>
              )}
              {u.status !== "Admin" && canDelete && (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 h-9 rounded-md border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("actions.delete")}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <ActivityTimeline
          lastSessionAt={detail.lastSessionAt}
          lastAiAt={detail.lastAiAt}
          lastProgressLogAt={detail.lastProgressLogAt}
        />

        <ComplianceCard
          last7={detail.complianceLast7d}
          last14={detail.complianceLast14d}
          last30={detail.complianceLast30d}
        />

        <WeightTrendCard trend={detail.weightTrend30d} />

        <AiMonthCard
          items={detail.aiUsageThisMonth}
          totalCost={detail.aiUsageThisMonthTotalCost}
        />

        <RecentFeedbackCard items={detail.recentFeedback} />
      </div>

      {extendOpen && (
        <ExtendDialog
          user={u}
          onClose={() => setExtendOpen(false)}
          onSuccess={() => {
            setExtendOpen(false);
            refresh();
          }}
        />
      )}
      {freezeDialog && (
        <ConfirmFreezeDialog
          type={freezeDialog}
          userName={u.name}
          onClose={() => setFreezeDialog(null)}
          onConfirm={async () => {
            try {
              if (freezeDialog === "freeze") {
                await freezeUserAction(u.id);
              } else {
                await unfreezeUserAction(u.id);
              }
              setFreezeDialog(null);
              refresh();
            } catch {
              showToast(
                freezeDialog === "freeze"
                  ? tFreeze("freezeFailed")
                  : tFreeze("unfreezeFailed"),
              );
              setFreezeDialog(null);
            }
          }}
        />
      )}
      {nudgeOpen && (
        <NudgeDialog
          userId={u.id}
          userName={u.name}
          onClose={() => setNudgeOpen(false)}
          onSuccess={() => {
            setNudgeOpen(false);
            showToast(tNudge("success"));
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function AiMonthCard({
  items,
  totalCost,
}: Readonly<{
  items: { feature: string; count: number; estCostUsd: number }[];
  totalCost: number;
}>) {
  const t = useTranslations("admin.userDetail");
  const tFeature = useTranslations("admin.featuresShort");
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("aiThisMonth")}
          </h3>
          {items.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("aiTotalCost", { cost: totalCost.toFixed(3) })}
            </p>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("aiEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => {
              const isKnown = [
                "meal",
                "exercise",
                "analyze",
                "chat",
                "workout",
                "daily-meal",
                "weekly",
                "exercise-demo",
              ].includes(item.feature);
              const label = isKnown
                ? tFeature(
                    item.feature as
                      | "meal"
                      | "exercise"
                      | "analyze"
                      | "chat"
                      | "workout"
                      | "daily-meal"
                      | "weekly"
                      | "exercise-demo",
                  )
                : item.feature;
              return (
                <span
                  key={item.feature}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {label}
                  <span className="font-bold tabular-nums">{item.count}</span>
                </span>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentFeedbackCard({
  items,
}: Readonly<{ items: UserFeedbackItem[] }>) {
  const t = useTranslations("admin.userDetail");
  const tStatus = useTranslations("admin.feedbackPage.statuses");
  const locale = useLocale() as Locale;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          {t("recentFeedback")}
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("recentFeedbackEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((fb) => {
              const isKnownStatus =
                fb.status === "open" ||
                fb.status === "responded" ||
                fb.status === "closed";
              return (
                <div
                  key={fb.id}
                  className="rounded-md bg-muted/40 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="uppercase">
                      {isKnownStatus
                        ? tStatus(fb.status as "open" | "responded" | "closed")
                        : fb.status}
                    </span>
                    <span>{formatDate(fb.createdAt, locale)}</span>
                  </div>
                  <p className="text-xs line-clamp-3">{fb.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

