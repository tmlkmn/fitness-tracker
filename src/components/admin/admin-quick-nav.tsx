import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Bot,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

export async function AdminQuickNav() {
  const t = await getTranslations("admin.nav");

  const items = [
    {
      href: { pathname: "/admin/kullanicilar" } as const,
      label: t("users"),
      Icon: Users,
      tone: "text-primary",
    },
    {
      href: { pathname: "/admin/ai-kullanim" } as const,
      label: t("aiUsage"),
      Icon: Bot,
      tone: "text-emerald-400",
    },
    {
      href: { pathname: "/admin/ai-warnings" } as const,
      label: t("warnings"),
      Icon: AlertTriangle,
      tone: "text-amber-500",
    },
    {
      href: { pathname: "/admin/geri-bildirim" } as const,
      label: t("feedback"),
      Icon: MessageSquare,
      tone: "text-purple-400",
    },
  ];

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t("title")}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ href, label, Icon, tone }) => (
          <Link key={label} href={href} className="block">
            <Card className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${tone}`} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
