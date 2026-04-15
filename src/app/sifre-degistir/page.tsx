"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { forceChangePassword } from "@/actions/password";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Loader2 } from "lucide-react";

export default function SifreDegistirPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isPending) return null;

  if (!session?.user) {
    router.push("/giris");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      await forceChangePassword(newPassword);
      router.push("/profil-tamamla");
      router.refresh();
    } catch {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Şifre Değiştir</h1>
            <p className="text-sm text-muted-foreground">
              Devam etmek için yeni bir şifre belirleyin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium leading-none"
              >
                Yeni Şifre
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="En az 8 karakter"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium leading-none"
              >
                Şifre Tekrar
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="••••••••"
              />
            </div>

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
                "Şifreyi Değiştir"
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
