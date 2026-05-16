"use client";

import { useState } from "react";
import { signIn, signOut, authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GirisPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("errors.emailRequired"));
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (!password) {
      setError(t("errors.passwordRequired"));
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.email({ email: trimmed, password });
      if (result.error) {
        setError(t("errors.invalidCredentials"));
      } else {
        const { data: sessionData } = await authClient.getSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = sessionData?.user as any;

        if (user?.mustChangePassword) {
          if (
            user.inviteExpiresAt &&
            new Date(user.inviteExpiresAt) < new Date()
          ) {
            setError(t("errors.inviteExpired"));
            await signOut();
            return;
          }
          router.push("/sifre-degistir");
        } else if (user?.frozenAt) {
          await signOut();
          setError(t("errors.accountFrozen"));
          return;
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
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <Image
              src="/icon-192.png"
              alt="FitMusc"
              width={56}
              height={56}
              className="mx-auto rounded-2xl"
              priority
            />
            <h1 className="text-xl font-bold">FitMusc</h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium leading-none"
              >
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                t("signIn")
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              href={email.trim() ? `/sifremi-unuttum?email=${encodeURIComponent(email.trim())}` : "/sifremi-unuttum"}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
