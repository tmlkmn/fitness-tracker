import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { resolveGateway } from "@/lib/billing/resolve-gateway";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.trialExpired");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function TrialExpiredPage() {
  const t = await getTranslations("auth.trialExpired");
  const gateway = await resolveGateway();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </CardContent>
      </Card>

      <PlanComparison mode="checkout" gateway={gateway} />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/giris" className="text-primary hover:underline">
          {t("cta")}
        </Link>
      </p>
    </div>
  );
}
