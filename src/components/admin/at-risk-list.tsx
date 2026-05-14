"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AtRiskUser, RiskTag } from "@/actions/admin-operations-types";
import { RISK_PRIORITY } from "@/actions/admin-operations-types";
import { RiskBadge } from "./risk-badge";

// Sorted by RISK_PRIORITY descending — most urgent first
const FILTER_TAGS: RiskTag[] = [
  "expiring",
  "pending_feedback",
  "inactive",
  "low_compliance",
];

// Visual urgency classes per tag, mapped via RISK_PRIORITY level:
//   priority 4 (expiring)         → destructive (most urgent)
//   priority 3 (pending_feedback) → destructive (also high urgency)
//   priority 2 (inactive)         → amber
//   priority 1 (low_compliance)   → amber
function urgencyClass(tag: RiskTag, isActive: boolean): string {
  const priority = RISK_PRIORITY[tag];
  if (isActive) {
    return priority >= 3
      ? "bg-destructive text-destructive-foreground border-destructive"
      : "bg-warning text-warning-foreground border-warning";
  }
  return "bg-muted text-muted-foreground border-transparent hover:bg-accent";
}

export function AtRiskList({ users }: { users: AtRiskUser[] }) {
  const t = useTranslations("admin.atRisk");
  const [active, setActive] = useState<Set<RiskTag>>(new Set());

  const filtered = useMemo(() => {
    if (active.size === 0) return users;
    return users.filter((u) => u.risks.some((r) => active.has(r)));
  }, [users, active]);

  const toggle = (tag: RiskTag) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const counts = useMemo(() => {
    const m = new Map<RiskTag, number>();
    for (const u of users) {
      for (const r of u.risks) m.set(r, (m.get(r) ?? 0) + 1);
    }
    return m;
  }, [users]);

  const urgentCount = useMemo(
    () =>
      users.filter((u) =>
        u.risks.some((r) => RISK_PRIORITY[r] >= 3),
      ).length,
    [users],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">{t("title")}</h2>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("totalsLine", { total: users.length, urgent: urgentCount })}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TAGS.map((tag) => {
          const count = counts.get(tag) ?? 0;
          const isActive = active.has(tag);
          const isDisabled = count === 0;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={isDisabled}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${urgencyClass(tag, isActive)} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span>{t(`filters.${camelCase(tag)}` as never)}</span>
              <span
                className={`inline-flex items-center justify-center min-w-5 h-4 px-1 rounded-full text-[10px] tabular-nums font-semibold ${
                  isActive ? "bg-white/25" : "bg-background/80 text-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        {active.size > 0 && (
          <button
            type="button"
            onClick={() => setActive(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <AtRiskRow key={u.user.id} user={u} />
          ))}
        </div>
      )}
    </section>
  );
}

function AtRiskRow({ user }: { user: AtRiskUser }) {
  const sortedRisks = [...user.risks].sort(
    (a, b) => RISK_PRIORITY[b] - RISK_PRIORITY[a],
  );
  return (
    <Link
      href={{
        pathname: "/admin/kullanicilar/[userId]",
        params: { userId: user.user.id },
      }}
      className="block"
    >
      <Card className="hover:bg-accent/30 transition-colors">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {user.user.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.user.email}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {sortedRisks.map((r) => (
                  <RiskBadge key={r} risk={r} user={user} />
                ))}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function camelCase(tag: RiskTag): string {
  switch (tag) {
    case "expiring":
      return "expiring";
    case "inactive":
      return "inactive";
    case "low_compliance":
      return "lowCompliance";
    case "pending_feedback":
      return "pendingFeedback";
  }
}
