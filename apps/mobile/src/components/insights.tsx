import { formatDate, intlLocale, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { useMacroTargets, useWeeklyTotals } from "@/hooks/plan";
import { addDays, todayStr, weekday } from "@/lib/dates";
import { colors, macroColors, radius, spacing, withAlpha } from "@/lib/theme";

import { BarChart } from "./charts";
import { AppText, Card } from "./ui";
import { CardHeading } from "./visual";

// ── 7-day calories ──────────────────────────────────────────────────────────

/** Calories eaten on each of the 7 days ending at `endDate`, against the day's target (web: MacroTrendSparkline). */
export function CalorieTrendCard({ endDate, planType }: { endDate: string; planType?: string | null }) {
  const t = useTranslations("meals.macroTrend");
  const td = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const totals = useWeeklyTotals(endDate);
  const targets = useMacroTargets(planType);
  const points = totals.data ?? [];
  if (points.length === 0) return null;

  const nf = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 });
  const target = Math.round(targets.data?.targets?.calories ?? 0);
  const avg = Math.round(points.reduce((sum, p) => sum + p.calories, 0) / points.length);
  const bars = points.map((p) => ({
    key: p.date,
    x: 0,
    label: formatDate(parseDateOnly(p.date), locale, { weekday: "short" }),
    value: Math.round(p.calories),
  }));

  return (
    <Card>
      <CardHeading
        icon="trending-up"
        color={macroColors.calories}
        title={t("titleDefault", { label: t("calories") })}
        right={
          target > 0
            ? t("averageWithTarget", { value: nf.format(avg), unit: " kcal", target: nf.format(target) })
            : t("average", { value: nf.format(avg), unit: " kcal" })
        }
      />
      <BarChart
        bars={bars}
        color={macroColors.calories}
        format={(v) => nf.format(v)}
        unit="kcal"
        height={150}
        reference={target > 0 ? { value: target, label: `${td("target")} ${nf.format(target)}` } : undefined}
        accessibilityLabel={`${t("titleDefault", { label: t("calories") })}: ${bars.map((b) => `${b.label} ${b.value}`).join(", ")}`}
      />
    </Card>
  );
}

// ── Activity heatmap ────────────────────────────────────────────────────────

type Status = "full" | "partial" | "none" | "empty";
const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;

const STATUS_COLOR: Record<Status, string> = {
  full: colors.primary,
  partial: withAlpha(colors.primary, 0.4),
  none: withAlpha(colors.textMuted, 0.22),
  empty: withAlpha(colors.textMuted, 0.08),
};

/** The last 365 days, one column per week (Mon → Sun), like the web's activity heatmap. Tap a day to see it. */
export function ActivityHeatmap({ completionMap }: { completionMap: Record<string, "full" | "partial" | "none"> }) {
  const t = useTranslations("gamification.heatmap");
  const locale = useLocale() as Locale;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const dayLabels = t.raw("dayLabels") as string[];
  const monthLabels = t.raw("monthLabels") as string[];
  const today = todayStr();

  const { weeks, months, full, partial } = useMemo(() => {
    let start = addDays(today, -364);
    start = addDays(start, -((weekday(start) + 6) % 7)); // back to Monday
    const weeks: (string | null)[][] = [];
    const months: { index: number; label: string }[] = [];
    let lastMonth = -1;
    for (let monday = start; monday <= today; monday = addDays(monday, 7)) {
      const month = Number(monday.slice(5, 7)) - 1;
      if (month !== lastMonth) {
        months.push({ index: weeks.length, label: monthLabels[month] ?? "" });
        lastMonth = month;
      }
      weeks.push(Array.from({ length: 7 }, (_, d) => {
        const date = addDays(monday, d);
        return date <= today ? date : null;
      }));
    }
    let full = 0;
    let partial = 0;
    for (const week of weeks) {
      for (const date of week) {
        if (date && completionMap[date] === "full") full++;
        else if (date && completionMap[date] === "partial") partial++;
      }
    }
    return { weeks, months, full, partial };
  }, [completionMap, monthLabels, today]);

  const statusOf = (date: string): Status => completionMap[date] ?? "empty";
  const statusLabel: Record<Status, string> = {
    full: t("statusFull"),
    partial: t("statusPartial"),
    none: t("statusNone"),
    empty: t("statusEmpty"),
  };

  // One touch target for the whole grid: the cell comes from the tap position.
  const pick = (e: GestureResponderEvent) => {
    const w = Math.floor(e.nativeEvent.locationX / STEP);
    const d = Math.floor(e.nativeEvent.locationY / STEP);
    const date = weeks[w]?.[d] ?? null;
    setPicked(date);
  };

  return (
    <Card>
      <CardHeading icon="calendar" title={t("title")} right={t("subtitle")} />
      <View style={styles.heatmap}>
        <View style={styles.dayLabels}>
          {dayLabels.map((label, i) => (
            <Text key={i} style={styles.axisText}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          <View>
            <View style={[styles.months, { width: weeks.length * STEP }]}>
              {months.map((m) => (
                <Text key={`${m.index}-${m.label}`} style={[styles.axisText, styles.month, { left: m.index * STEP }]}>
                  {m.label}
                </Text>
              ))}
            </View>
            <Pressable onPress={pick} accessibilityRole="image" accessibilityLabel={t("summary", { full, partial })}>
              <View style={styles.grid}>
                {weeks.map((week, w) => (
                  <View key={w} style={styles.column}>
                    {week.map((date, d) => (
                      <View
                        key={d}
                        style={[
                          styles.cell,
                          date ? { backgroundColor: STATUS_COLOR[statusOf(date)] } : null,
                          date && date === picked ? styles.cellPicked : null,
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      {picked ? (
        <AppText variant="small">
          {formatDate(parseDateOnly(picked), locale, { day: "numeric", month: "long", weekday: "long" })} · {statusLabel[statusOf(picked)]}
        </AppText>
      ) : null}
      <View style={styles.footer}>
        <AppText variant="small" style={styles.grow}>
          {t("summary", { full, partial })}
        </AppText>
        <AppText variant="small">{t("less")}</AppText>
        {(["empty", "none", "partial", "full"] as const).map((s) => (
          <View key={s} style={[styles.cell, { backgroundColor: STATUS_COLOR[s] }]} />
        ))}
        <AppText variant="small">{t("more")}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  heatmap: { flexDirection: "row", gap: spacing.xs },
  dayLabels: { paddingTop: 16, gap: GAP },
  axisText: { color: colors.textMuted, fontSize: 9, height: CELL, lineHeight: CELL },
  months: { height: 16, position: "relative" },
  month: { position: "absolute", top: 0 },
  grid: { flexDirection: "row", gap: GAP },
  column: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: radius.sm / 3 },
  cellPicked: { borderWidth: 1.5, borderColor: colors.text },
  footer: { flexDirection: "row", alignItems: "center", gap: 3 },
});
