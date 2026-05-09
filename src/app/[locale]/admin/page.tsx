"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  listAllUsers,
  resendInvite,
  removeUserAction,
  extendMembership,
  freezeUserAction,
  unfreezeUserAction,
  getAdminStats,
  getAiUsageByFeature,
  getAiUsageByUser,
} from "@/actions/admin";
import type { UserWithStatus, MembershipType, AdminStats, FeatureUsage, UserAiUsage } from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  RotateCw,
  Trash2,
  Loader2,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  CalendarClock,
  X,
  BarChart3,
  Bot,
  MessageSquare,
  Snowflake,
  Play,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";

const MEMBERSHIP_KEYS = ["1-month", "3-month", "6-month", "1-year", "unlimited", "custom"] as const;
const FEATURE_KEYS = ["meal", "exercise", "analyze", "chat", "workout", "daily-meal", "weekly", "exercise-demo"] as const;

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string }> = {
  Admin: { icon: Shield, className: "text-purple-400 bg-purple-400/10" },
  Aktif: { icon: CheckCircle, className: "text-green-400 bg-green-400/10" },
  Bekliyor: { icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
  "Süresi Dolmuş": { icon: AlertTriangle, className: "text-red-400 bg-red-400/10" },
  "Üyelik Dolmuş": { icon: AlertTriangle, className: "text-orange-400 bg-orange-400/10" },
  Dondurulmuş: { icon: Snowflake, className: "text-blue-400 bg-blue-400/10" },
};

const MEMBERSHIP_OPTION_VALUES: MembershipType[] = [
  "1-month",
  "3-month",
  "6-month",
  "1-year",
  "unlimited",
  "custom",
];

function daysSinceFrozen(user: UserWithStatus): number {
  if (!user.frozenAt) return 0;
  return (Date.now() - new Date(user.frozenAt).getTime()) / 86400000;
}

function useTimeAgo() {
  const t = useTranslations("admin.timeAgo");
  return (date: Date | null): string => {
    if (!date) return t("none");
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutes", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hours", { n: hours });
    const days = Math.floor(hours / 24);
    return t("days", { n: days });
  };
}

function useFeatureLabel() {
  const t = useTranslations("admin.featuresShort");
  return (key: string): string => {
    if ((FEATURE_KEYS as readonly string[]).includes(key)) {
      return t(key);
    }
    return key;
  };
}

function useStatusLabel() {
  const t = useTranslations("admin.status");
  return (status: string): string => {
    const STATUS_KEYS = ["Admin", "Aktif", "Bekliyor", "Süresi Dolmuş", "Üyelik Dolmuş", "Dondurulmuş"];
    if (STATUS_KEYS.includes(status)) {
      return t(status);
    }
    return status;
  };
}

function useMembershipLabel() {
  const t = useTranslations("admin.membership");
  return (key: string): string => {
    if ((MEMBERSHIP_KEYS as readonly string[]).includes(key)) {
      return t(key);
    }
    return key;
  };
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MembershipBadge({ user }: { user: UserWithStatus }) {
  const locale = useLocale();
  const membershipLabel = useMembershipLabel();
  if (!user.membershipType || user.status === "Admin") return null;
  const label = membershipLabel(user.membershipType);
  const endDate = user.membershipEndDate
    ? new Date(user.membershipEndDate).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")
    : null;
  return (
    <span className="text-xs text-muted-foreground">
      {label}
      {endDate && ` · ${endDate}`}
    </span>
  );
}

function ConfirmFreezeDialog({
  type,
  userName,
  onConfirm,
  onClose,
}: {
  type: "freeze" | "unfreeze";
  userName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("admin.freeze");

  const isFreeze = type === "freeze";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFreeze ? (
                <div className="h-8 w-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <LockKeyhole className="h-4 w-4 text-blue-400" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-green-400/10 flex items-center justify-center">
                  <LockKeyholeOpen className="h-4 w-4 text-green-400" />
                </div>
              )}
              <h2 className="text-base font-semibold">
                {isFreeze ? t("freezeTitle") : t("unfreezeTitle")}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className={`rounded-lg p-3 text-sm ${isFreeze ? "bg-blue-400/10 text-blue-300" : "bg-green-400/10 text-green-300"}`}>
            <p className="font-medium">{userName}</p>
            <p className="mt-1 text-xs opacity-80">
              {isFreeze ? t("freezeWarning") : t("unfreezeWarning")}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                isFreeze
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFreeze ? (
                <><Snowflake className="h-4 w-4" /> {t("freezeButton")}</>
              ) : (
                <><Play className="h-4 w-4" /> {t("unfreezeButton")}</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExtendDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: UserWithStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("admin");
  const tMembership = useTranslations("admin.membership");
  const [type, setType] = useState<MembershipType>(
    (user.membershipType as MembershipType) ?? "1-month"
  );
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (type === "custom" && !customEndDate) {
      setError(t("errors.endDateRequired"));
      return;
    }
    if (type === "custom" && new Date(customEndDate) <= new Date()) {
      setError(t("errors.endDateAfterToday"));
      return;
    }

    setLoading(true);
    try {
      await extendMembership(user.id, type, type === "custom" ? customEndDate : undefined);
      onSuccess();
    } catch {
      setError(t("errors.membershipUpdateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("extendDialog.title")}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{user.name}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MembershipType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MEMBERSHIP_OPTION_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === "custom" ? tMembership("customDate") : tMembership(value)}
                </option>
              ))}
            </select>
            {type === "custom" && (
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            )}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("extendDialog.submit")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tFreeze = useTranslations("admin.freeze");
  const formatTimeAgo = useTimeAgo();
  const featureLabel = useFeatureLabel();
  const statusLabel = useStatusLabel();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [extendUser, setExtendUser] = useState<UserWithStatus | null>(null);
  const [freezeDialog, setFreezeDialog] = useState<{ type: "freeze" | "unfreeze"; userId: string; name: string } | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [userAiUsage, setUserAiUsage] = useState<UserAiUsage[]>([]);

  const fetchUsers = async () => {
    try {
      const data = await listAllUsers();
      setUsers(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      if (message === "Forbidden") {
        router.push("/");
        return;
      }
      setError(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const [s, f, u] = await Promise.all([
        getAdminStats(),
        getAiUsageByFeature(),
        getAiUsageByUser(),
      ]);
      setStats(s);
      setFeatureUsage(f);
      setUserAiUsage(u);
    } catch {
      // silent — report fetch failure doesn't block user list
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async (userId: string) => {
    setActionLoading(userId);
    try {
      await resendInvite(userId);
      await fetchUsers();
    } catch {
      setError(t("errors.inviteFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(t("actions.confirmDelete", { name }))) {
      return;
    }
    setActionLoading(userId);
    try {
      await removeUserAction(userId);
      await fetchUsers();
    } catch {
      setError(t("errors.removeFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreeze = (userId: string, name: string) => {
    setFreezeDialog({ type: "freeze", userId, name });
  };

  const handleUnfreeze = (userId: string, name: string) => {
    setFreezeDialog({ type: "unfreeze", userId, name });
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{t("title")}</h1>
          </div>
          <Link
            href="/admin/davet"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t("inviteButton")}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/admin/geri-bildirim"
            className="inline-flex items-center justify-center gap-2 h-10 rounded-md border border-primary/50 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t("feedback")}
          </Link>
          <Link
            href="/admin/ai-warnings"
            className="inline-flex items-center justify-center gap-2 h-10 rounded-md border border-amber-500/40 text-amber-500 text-sm font-medium hover:bg-amber-500/10 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            {t("aiWarnings")}
          </Link>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("stats.totalUsers")}
              value={stats.totalUsers}
              sub={t("stats.totalUsersSub", {
                active: stats.activeUsers,
                pending: stats.pendingUsers,
                admin: stats.adminUsers,
              })}
            />
            <StatCard label={t("stats.aiUsageToday")} value={stats.aiUsageToday} />
            <StatCard label={t("stats.aiUsageWeek")} value={stats.aiUsageThisWeek} />
            <StatCard label={t("stats.aiUsageTotal")} value={stats.aiUsageTotal} />
          </div>
        )}

        {featureUsage.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{t("featureUsage")}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">{t("tableHead.feature")}</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">{t("tableHead.today")}</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">{t("tableHead.week")}</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">{t("tableHead.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureUsage.map((f) => (
                      <tr key={f.feature} className="border-b border-border/50">
                        <td className="py-1.5">{featureLabel(f.feature)}</td>
                        <td className="text-right py-1.5 tabular-nums">{f.today}</td>
                        <td className="text-right py-1.5 tabular-nums">{f.thisWeek}</td>
                        <td className="text-right py-1.5 tabular-nums font-medium">{f.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {userAiUsage.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{t("userUsage")}</h2>
              </div>
              <div className="space-y-2.5">
                {userAiUsage.map((u) => (
                  <div key={u.userId} className="border-b border-border/50 pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatTimeAgo(u.lastUsed)}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{u.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(u.features).map(([feature, count]) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px]"
                        >
                          {featureLabel(feature)}
                          <span className="font-bold">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground">{t("users")}</h2>
        </div>

        <div className="space-y-3">
          {users.map((user) => {
            const cfg = statusConfig[user.status] ?? statusConfig["Aktif"];
            const StatusIcon = cfg.icon;
            const isActionUser = actionLoading === user.id;
            const canDelete = user.isFrozen && daysSinceFrozen(user) >= 30;

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                            date: new Date(user.frozenAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR"),
                            days: Math.floor(daysSinceFrozen(user)),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {user.status !== "Admin" && (
                        <button
                          onClick={() => setExtendUser(user)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                          title={t("actions.updateMembership")}
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      )}
                      {(user.status === "Bekliyor" || user.status === "Süresi Dolmuş") && (
                        <button
                          onClick={() => handleResend(user.id)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                          title={t("actions.resendInvite")}
                        >
                          {isActionUser ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {user.status !== "Admin" && !user.isFrozen && (
                        <button
                          onClick={() => handleFreeze(user.id, user.name)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-blue-500/10 text-blue-400 transition-colors disabled:opacity-50"
                          title={tFreeze("tooltipFreeze")}
                        >
                          {isActionUser ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Snowflake className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {user.status === "Dondurulmuş" && (
                        <button
                          onClick={() => handleUnfreeze(user.id, user.name)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-green-500/10 text-green-400 transition-colors disabled:opacity-50"
                          title={tFreeze("tooltipUnfreeze")}
                        >
                          {isActionUser ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {user.status !== "Admin" && canDelete && (
                        <button
                          onClick={() => handleRemove(user.id, user.name)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                          title={t("actions.delete")}
                        >
                          {isActionUser ? (
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
          })}

          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("emptyUsers")}
            </p>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/ayarlar"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t("backToSettings")}
          </Link>
        </div>
      </div>

      {extendUser && (
        <ExtendDialog
          user={extendUser}
          onClose={() => setExtendUser(null)}
          onSuccess={() => {
            setExtendUser(null);
            fetchUsers();
          }}
        />
      )}
      {freezeDialog && (
        <ConfirmFreezeDialog
          type={freezeDialog.type}
          userName={freezeDialog.name}
          onClose={() => setFreezeDialog(null)}
          onConfirm={async () => {
            setActionLoading(freezeDialog.userId);
            try {
              if (freezeDialog.type === "freeze") {
                await freezeUserAction(freezeDialog.userId);
              } else {
                await unfreezeUserAction(freezeDialog.userId);
              }
              setFreezeDialog(null);
              await fetchUsers();
            } catch {
              setError(freezeDialog.type === "freeze" ? tFreeze("freezeFailed") : tFreeze("unfreezeFailed"));
              setFreezeDialog(null);
            } finally {
              setActionLoading(null);
            }
          }}
        />
      )}
    </div>
  );
}
