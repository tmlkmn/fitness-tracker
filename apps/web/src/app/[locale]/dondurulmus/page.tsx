"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Snowflake, LogOut, Mail } from "lucide-react";

export default function DondurulmusPage() {
  const router = useRouter();
  const t = useTranslations("auth.accountFrozen");
  const tNav = useTranslations("nav");

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto">
            <Snowflake className="h-7 w-7 text-sky-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="space-y-2">
            <a
              href="mailto:destek@fitmusc.com"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              {t("contact")}
            </a>
            <button
              onClick={async () => {
                await signOut();
                router.push("/giris");
                router.refresh();
              }}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {tNav("signOut")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
