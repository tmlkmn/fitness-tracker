"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { requestPasswordReset } from "@/actions/password";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SifremiUnuttumForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(trimmed);
      setSent(true);
    } catch (err) {
      if (err instanceof Error && err.message === "UserNotFound") {
        setError("Bu e-posta adresi sistemde kayıtlı değil.");
      } else {
        setError("Bir hata oluştu. Tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-7 w-7 text-green-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold">E-posta Gönderildi</h1>
                <p className="text-sm text-muted-foreground">
                  Şifre sıfırlama bağlantısı e-postanıza gönderildi. Lütfen
                  gelen kutunuzu kontrol edin.
                </p>
              </div>
              <Link
                href="/giris"
                className="inline-flex items-center justify-center w-full h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                Giriş Sayfasına Dön
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Şifremi Unuttum</h1>
                <p className="text-sm text-muted-foreground">
                  E-posta adresinizi girin, şifre sıfırlama bağlantısı
                  göndereceğiz.
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

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sıfırlama Bağlantısı Gönder"
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link
                  href="/giris"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SifremiUnuttumPage() {
  return (
    <Suspense>
      <SifremiUnuttumForm />
    </Suspense>
  );
}
