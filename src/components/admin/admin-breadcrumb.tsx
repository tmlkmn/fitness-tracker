import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export type AdminBreadcrumbHref =
  | "/admin"
  | "/admin/kullanicilar"
  | "/admin/ai-kullanim"
  | "/admin/geri-bildirim"
  | "/admin/davet"
  | "/admin/ai-warnings";

export interface AdminBreadcrumbSegment {
  label: string;
  href?: AdminBreadcrumbHref;
}

/**
 * Sticky breadcrumb shown under the page header on admin sub-pages so
 * the admin can always retrace their steps. Last segment is rendered
 * as plain text (current page); earlier segments link back.
 */
export function AdminBreadcrumb({
  segments,
}: Readonly<{ segments: AdminBreadcrumbSegment[] }>) {
  if (segments.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-14 z-30 border-b border-border/60 bg-background/95 backdrop-blur px-4 py-2"
    >
      <ol className="max-w-lg mx-auto flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto scrollbar-none">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <li key={`${seg.label}-${i}`} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />
              )}
              {!isLast && seg.href ? (
                <Link
                  href={seg.href}
                  className="hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {seg.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "text-foreground font-medium whitespace-nowrap"
                      : "whitespace-nowrap"
                  }
                >
                  {seg.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
