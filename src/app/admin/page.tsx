"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listAllUsers, resendInvite, removeUserAction } from "@/actions/admin";
import type { UserWithStatus } from "@/actions/admin";
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
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

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
                    </div>

                    <div className="flex items-center gap-1">
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
    </div>
  );
}
