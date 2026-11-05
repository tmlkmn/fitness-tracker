"use client";

import { ArrowLeft, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import React from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  icon: Icon,
  showBack,
  backHref = "/",
  rightSlot,
}: HeaderProps) {
  const t = useTranslations("common");
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        {showBack ? (
          <Link
            href={backHref}
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors shrink-0"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : Icon ? (
          <Icon className="h-6 w-6 text-primary shrink-0" />
        ) : (
          <Image
            src="/icon-192.png"
            alt=""
            width={28}
            height={28}
            className="rounded-lg shrink-0"
            priority
          />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-none truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {rightSlot && <div className="ml-auto shrink-0">{rightSlot}</div>}
      </div>
    </header>
  );
}
