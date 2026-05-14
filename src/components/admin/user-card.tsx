"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import type { UserWithStatus } from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarClock,
  RotateCw,
  Snowflake,
  Play,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  STATUS_CONFIG,
  daysSinceFrozen,
  useStatusLabel,
} from "./admin-labels";
import { MembershipBadge } from "./membership-badge";

export interface UserCardProps {
  user: UserWithStatus;
  actionLoading: boolean;
  onExtend: (user: UserWithStatus) => void;
  onResend: (userId: string) => void;
  onFreeze: (userId: string, name: string) => void;
  onUnfreeze: (userId: string, name: string) => void;
  onRemove: (userId: string, name: string) => void;
  onOpenDetail?: (userId: string) => void;
}

export function UserCard({
  user,
  actionLoading,
  onExtend,
  onResend,
  onFreeze,
  onUnfreeze,
  onRemove,
  onOpenDetail,
}: UserCardProps) {
  const t = useTranslations("admin");
  const tFreeze = useTranslations("admin.freeze");
  const locale = useLocale() as Locale;
  const statusLabel = useStatusLabel();

  const cfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG["Aktif"];
  const StatusIcon = cfg.icon;
  const canDelete = user.isFrozen && daysSinceFrozen(user.frozenAt) >= 30;

  const handleOpen = () => {
    if (onOpenDetail) onOpenDetail(user.id);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenDetail ? handleOpen : undefined}
            className={`min-w-0 flex-1 text-left ${onOpenDetail ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
            disabled={!onOpenDetail}
          >
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{user.name}</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusLabel(user.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
            <MembershipBadge user={user} />
            {user.isFrozen && user.frozenAt && (
              <p className="text-xs text-blue-400 mt-0.5">
                {tFreeze("frozenAt", {
                  date: formatDate(user.frozenAt, locale),
                  days: Math.floor(daysSinceFrozen(user.frozenAt)),
                })}
              </p>
            )}
          </button>

          <div className="flex items-center gap-1">
            {user.status !== "Admin" && (
              <button
                onClick={() => onExtend(user)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                title={t("actions.updateMembership")}
              >
                <CalendarClock className="h-4 w-4" />
              </button>
            )}
            {(user.status === "Bekliyor" ||
              user.status === "Süresi Dolmuş") && (
              <button
                onClick={() => onResend(user.id)}
                disabled={actionLoading}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                title={t("actions.resendInvite")}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
              </button>
            )}
            {user.status !== "Admin" && !user.isFrozen && (
              <button
                onClick={() => onFreeze(user.id, user.name)}
                disabled={actionLoading}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-blue-500/10 text-blue-400 transition-colors disabled:opacity-50"
                title={tFreeze("tooltipFreeze")}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Snowflake className="h-4 w-4" />
                )}
              </button>
            )}
            {user.status === "Dondurulmuş" && (
              <button
                onClick={() => onUnfreeze(user.id, user.name)}
                disabled={actionLoading}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-green-500/10 text-green-400 transition-colors disabled:opacity-50"
                title={tFreeze("tooltipUnfreeze")}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            )}
            {user.status !== "Admin" && canDelete && (
              <button
                onClick={() => onRemove(user.id, user.name)}
                disabled={actionLoading}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                title={t("actions.delete")}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
