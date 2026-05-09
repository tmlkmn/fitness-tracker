"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export function AdminLinkButton() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as Record<string, unknown>)?.role === "admin";
  const t = useTranslations("nav");

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
      aria-label={t("adminPanel")}
    >
      <Shield className="h-5 w-5" />
    </Link>
  );
}
