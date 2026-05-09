"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertTriangle, BarChart3 } from "lucide-react";
import { getAiWarningsAnalytics, type AiWarningsAnalytics } from "@/actions/admin";
import {
  CHART_TOOLTIP_CURSOR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";

const FEATURE_LABELS: Record<string, string> = {
  meal: "Öğün Önerisi",
  exercise: "Egzersiz İpucu",
  analyze: "İlerleme Analizi",
  chat: "AI Asistan",
  workout: "Antrenman Önerisi",
  "daily-meal": "Günlük Öğün",
  weekly: "Haftalık Plan",
  "exercise-demo": "Egzersiz Demo",
  shopping: "Alışveriş Listesi",
  "target-weight": "Hedef Kilo",
};

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-500/40 bg-amber-500/5" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-amber-500" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AiWarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<AiWarningsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const analytics = await getAiWarningsAnalytics();
        if (!cancelled) setData(analytics);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "";
        if (message === "Forbidden") {
          router.push("/");
          return;
        }
        if (!cancelled) setError("Veriler yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh p-6 text-center">
        <p className="text-sm text-destructive">{error || "Veri yok."}</p>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-primary mt-3 inline-block"
        >
          Admin paneline dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI Uyarıları</h1>
              <p className="text-[11px] text-muted-foreground">Son 14 günün success_with_warnings dağılımı</p>
            </div>
          </div>
        </div>

        {/* ── Top-line stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Toplam Run" value={data.totalRuns} />
          <StatCard
            label="Uyarılı Run"
            value={data.runsWithWarnings}
            sub="success_with_warnings"
            highlight={data.runsWithWarnings > 0}
          />
          <StatCard
            label="Uyarı Oranı"
            value={`%${data.warningRatePct}`}
            highlight={data.warningRatePct > 20}
          />
        </div>

        {/* ── Daily timeline ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">14 Günlük Trend</h2>
            </div>
            {data.daily.every((d) => d.success === 0 && d.warnings === 0) ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Bu pencerede AI çağrısı yok.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={data.daily.map((d) => ({
                    date: formatShortDate(d.date),
                    Başarılı: d.success,
                    Uyarılı: d.warnings,
                  }))}
                  margin={{ top: 6, right: 6, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    cursor={CHART_TOOLTIP_CURSOR}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Başarılı" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Uyarılı" stackId="a" fill="rgb(245, 158, 11)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Per-feature breakdown ── */}
        {data.perFeature.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">Feature Bazında</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 text-muted-foreground font-medium">Feature</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Başarılı</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Uyarılı</th>
                      <th className="text-right py-1.5 text-muted-foreground font-medium">Oran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perFeature.map((f) => (
                      <tr key={f.feature} className="border-b border-border/50">
                        <td className="py-1.5">{FEATURE_LABELS[f.feature] ?? f.feature}</td>
                        <td className="text-right py-1.5 tabular-nums">{f.successCount}</td>
                        <td className="text-right py-1.5 tabular-nums text-amber-500">
                          {f.warningCount}
                        </td>
                        <td
                          className={`text-right py-1.5 tabular-nums font-medium ${
                            f.warningRatePct > 30
                              ? "text-destructive"
                              : f.warningRatePct > 10
                                ? "text-amber-500"
                                : ""
                          }`}
                        >
                          %{f.warningRatePct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Top warning patterns ── */}
        {data.topPatterns.length > 0 ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold">En Sık Uyarı Tipleri</h2>
              <p className="text-[10px] text-muted-foreground">
                Numerik değerler ve gün indeksleri normalize edildi. Aynı kalıbın varyasyonları gruplanır.
              </p>
              <div className="space-y-2.5">
                {data.topPatterns.map((p) => (
                  <div
                    key={p.pattern}
                    className="border-b border-border/50 pb-2 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-[11px] leading-snug flex-1 break-all">
                        {p.pattern}
                      </code>
                      <span className="shrink-0 rounded-full bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                        {p.count}
                      </span>
                    </div>
                    {p.samples.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.samples.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {FEATURE_LABELS[s.feature] ?? s.feature}
                            <span className="text-muted-foreground/60">·</span>
                            {new Date(s.createdAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : data.totalRuns > 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Bu pencerede uyarı kaydedilmemiş. Pipeline temiz.
          </p>
        ) : null}
      </div>
    </div>
  );
}
