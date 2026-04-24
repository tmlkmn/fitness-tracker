"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
  warning?: boolean;
  external?: boolean;
}

export function SettingsMenuItem({
  icon: Icon,
  title,
  subtitle,
  href,
  warning,
  external,
}: Props) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {warning && (
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" aria-label="Eksik bilgi" />
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );

  if (external) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
