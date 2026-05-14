"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  listAllUsers,
  resendInvite,
  removeUserAction,
  freezeUserAction,
  unfreezeUserAction,
} from "@/actions/admin";
import type { UserWithStatus } from "@/actions/admin";
import {
  Users,
  UserPlus,
  Loader2,
  Search,
  ArrowLeft,
} from "lucide-react";
import { ExtendDialog } from "@/components/admin/extend-dialog";
import { ConfirmFreezeDialog } from "@/components/admin/confirm-freeze-dialog";
import { UserCard } from "@/components/admin/user-card";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";

type StatusFilter =
  | "all"
  | "active"
  | "pending"
  | "frozen"
  | "expired"
  | "expiring";

export default function AdminUsersPage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tList = useTranslations("admin.usersList");
  const tFreeze = useTranslations("admin.freeze");
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [extendUser, setExtendUser] = useState<UserWithStatus | null>(null);
  const [freezeDialog, setFreezeDialog] = useState<{
    type: "freeze" | "unfreeze";
    userId: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const f = searchParams.get("filter");
    if (
      f === "active" ||
      f === "pending" ||
      f === "frozen" ||
      f === "expired" ||
      f === "expiring"
    ) {
      return f;
    }
    return "all";
  });

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

  useEffect(() => {
    fetchUsers();
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
    if (!confirm(t("actions.confirmDelete", { name }))) return;
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

  const handleFreeze = (userId: string, name: string) =>
    setFreezeDialog({ type: "freeze", userId, name });
  const handleUnfreeze = (userId: string, name: string) =>
    setFreezeDialog({ type: "unfreeze", userId, name });

  const filtered = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
        return false;
      }
      switch (statusFilter) {
        case "active":
          return u.status === "Aktif";
        case "pending":
          return u.status === "Bekliyor" || u.status === "Süresi Dolmuş";
        case "frozen":
          return u.status === "Dondurulmuş";
        case "expired":
          return u.status === "Üyelik Dolmuş";
        case "expiring": {
          if (!u.membershipEndDate) return false;
          const d = new Date(u.membershipEndDate);
          return d >= now && d <= sevenDaysFromNow;
        }
        default:
          return true;
      }
    });
  }, [users, search, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: tList("filterAll") },
    { key: "active", label: tList("filterActive") },
    { key: "pending", label: tList("filterPending") },
    { key: "frozen", label: tList("filterFrozen") },
    { key: "expired", label: tList("filterExpired") },
  ];

  return (
    <div className="min-h-dvh pb-8">
      <AdminBreadcrumb
        segments={[
          { label: t("breadcrumbRoot"), href: "/admin" },
          { label: tList("title") },
        ]}
      />
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={{ pathname: "/admin" }}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              aria-label={tList("title")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">{tList("title")}</h1>
            </div>
          </div>
          <Link
            href={{ pathname: "/admin/davet" }}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {t("inviteButton")}
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tList("searchPlaceholder")}
            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {tList("countLabel", { count: filtered.length })}
        </p>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="space-y-3">
          {filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              actionLoading={actionLoading === user.id}
              onExtend={setExtendUser}
              onResend={handleResend}
              onFreeze={handleFreeze}
              onUnfreeze={handleUnfreeze}
              onRemove={handleRemove}
              onOpenDetail={(uid) =>
                router.push({
                  pathname: "/admin/kullanicilar/[userId]",
                  params: { userId: uid },
                })
              }
            />
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {tList("noResults")}
            </p>
          )}
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
              setError(
                freezeDialog.type === "freeze"
                  ? tFreeze("freezeFailed")
                  : tFreeze("unfreezeFailed"),
              );
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
