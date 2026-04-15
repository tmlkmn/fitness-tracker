"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listAllUsers, resendInvite, removeUserAction, extendMembership } from "@/actions/admin";
import type { UserWithStatus, MembershipType } from "@/actions/admin";
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
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle; className: string }
> = {
  Admin: { icon: Shield, className: "text-purple-400 bg-purple-400/10" },
  Aktif: { icon: CheckCircle, className: "text-green-400 bg-green-400/10" },
  Bekliyor: { icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
  "Süresi Dolmuş": {
    icon: AlertTriangle,
    className: "text-red-400 bg-red-400/10",
  },
  "Üyelik Dolmuş": {
    icon: AlertTriangle,
    className: "text-orange-400 bg-orange-400/10",
  },
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  unlimited: "Sınırsız",
  "1-month": "1 Ay",
  "3-month": "3 Ay",
  "6-month": "6 Ay",
  "1-year": "1 Yıl",
  custom: "Özel",
};

const MEMBERSHIP_OPTIONS: { value: MembershipType; label: string }[] = [
  { value: "1-month", label: "1 Ay" },
  { value: "3-month", label: "3 Ay" },
  { value: "6-month", label: "6 Ay" },
  { value: "1-year", label: "1 Yıl" },
  { value: "unlimited", label: "Sınırsız" },
  { value: "custom", label: "Özel Tarih" },
];

function MembershipBadge({ user }: { user: UserWithStatus }) {
  if (!user.membershipType || user.status === "Admin") return null;
  const label = MEMBERSHIP_LABELS[user.membershipType] ?? user.membershipType;
  const endDate = user.membershipEndDate
    ? new Date(user.membershipEndDate).toLocaleDateString("tr-TR")
    : null;
  return (
    <span className="text-xs text-muted-foreground">
      {label}
      {endDate && ` · ${endDate}`}
    </span>
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
      setError("Bitiş tarihi seçin.");
      return;
    }
    if (type === "custom" && new Date(customEndDate) <= new Date()) {
      setError("Bitiş tarihi bugünden sonra olmalı.");
      return;
    }

    setLoading(true);
    try {
      await extendMembership(
        user.id,
        type,
        type === "custom" ? customEndDate : undefined
      );
      onSuccess();
    } catch {
      setError("Üyelik güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Üyelik Güncelle</h2>
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
              {MEMBERSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Güncelle"
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [extendUser, setExtendUser] = useState<UserWithStatus | null>(null);

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
      setError("Kullanıcılar yüklenemedi.");
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
      setError("Davet gönderilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoading(userId);
    try {
      await removeUserAction(userId);
      await fetchUsers();
    } catch {
      setError("Kullanıcı silinemedi.");
    } finally {
      setActionLoading(null);
    }
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
            <h1 className="text-xl font-bold">Kullanıcı Yönetimi</h1>
          </div>
          <Link
            href="/admin/davet"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Davet Et
          </Link>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <div className="space-y-3">
          {users.map((user) => {
            const config = statusConfig[user.status];
            const StatusIcon = config.icon;
            const isActionUser = actionLoading === user.id;

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.name}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                      <MembershipBadge user={user} />
                    </div>

                    <div className="flex items-center gap-1">
                      {user.status !== "Admin" && (
                        <button
                          onClick={() => setExtendUser(user)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                          title="Üyelik Güncelle"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      )}
                      {(user.status === "Bekliyor" ||
                        user.status === "Süresi Dolmuş") && (
                        <button
                          onClick={() => handleResend(user.id)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                          title="Tekrar Davet"
                        >
                          {isActionUser ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {user.status !== "Admin" && (
                        <button
                          onClick={() => handleRemove(user.id, user.name)}
                          disabled={isActionUser}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                          title="Sil"
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
              Henüz kullanıcı yok.
            </p>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/ayarlar"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Ayarlara Dön
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
    </div>
  );
}
