"use client";

import { useState } from "react";
import { signIn, signOut, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Loader2 } from "lucide-react";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GirisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Geçerli bir e-posta adresi girin.");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn.email({ email: trimmed, password });
      if (result.error) {
        setError("E-posta veya şifre hatalı.");
      } else {
        const { data: sessionData } = await authClient.getSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = sessionData?.user as any;

        if (user?.mustChangePassword) {
          if (
            user.inviteExpiresAt &&
            new Date(user.inviteExpiresAt) < new Date()
          ) {
            setError("Davet süreniz dolmuş. Yöneticinizle iletişime geçin.");
            await signOut();
            return;
          }
          router.push("/sifre-degistir");
        } else if (user?.isApproved) {
          if (user.membershipEndDate && new Date(user.membershipEndDate) < new Date()) {
            router.push("/uyelik-doldu");
          } else if (!user.height || !user.weight) {
            router.push("/profil-tamamla");
          } else {
            router.push("/");
          }
        } else {
          router.push("/bekliyor");
        }
        router.refresh();
      }
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
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">FitTrack</h1>
            <p className="text-sm text-muted-foreground">
              Hesabınıza giriş yapın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="ornek@mail.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
                "Giriş Yap"
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              href={email.trim() ? `/sifremi-unuttum?email=${encodeURIComponent(email.trim())}` : "/sifremi-unuttum"}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Şifremi Unuttum
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
