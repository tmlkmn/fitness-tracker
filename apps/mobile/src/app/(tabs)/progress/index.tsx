import Ionicons from "@expo/vector-icons/Ionicons";
import type { ProgressLogDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AiButton, AiDisclaimer, ErrorBox, Markdown } from "@/components/ai";
import { BarChart, LineChart, type ChartPoint } from "@/components/charts";
import { ActivityHeatmap, CalorieTrendCard } from "@/components/insights";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Screen, SectionTitle, useErrorMessage } from "@/components/ui";
import { CardHeading, type IconName } from "@/components/visual";
import { useInvalidateQuota } from "@/hooks/ai";
import { useActivityStats } from "@/hooks/gamification";
import { useProfile, useProgressLogs, useSleepLogs, useWaterLogs } from "@/hooks/wellness";
import { apiStream } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { CHART_METRICS, type ChartMetric } from "@/lib/progress-metrics";
import { colors, radius, seriesColors, spacing } from "@/lib/theme";

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

function useNumber() {
  const locale = useLocale() as Locale;
  const nf = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 });
  return (value: number) => nf.format(value);
}

function useShortDate() {
  const locale = useLocale() as Locale;
  return (date: string) => formatDate(parseDateOnly(date), locale, { day: "numeric", month: "short" });
}

export default function ProgressScreen() {
  const t = useTranslations("progress");
  const router = useRouter();
  const logs = useProgressLogs();
  const profile = useProfile();
  const water = useWaterLogs();
  const sleep = useSleepLogs();
  const activity = useActivityStats();

  if (logs.isLoading) return <LoadingView />;
  if (!logs.data) return <ErrorView error={logs.error} onRetry={() => logs.refetch()} />;

  const list = logs.data;
  const refresh = () => {
    void logs.refetch();
    void profile.refetch();
    void water.refetch();
    void sleep.refetch();
    void activity.refetch();
  };

  return (
    <Screen refreshing={logs.isRefetching} onRefresh={refresh}>
      <Summary logs={list} startWeight={profile.data?.weight ?? null} targetWeight={profile.data?.targetWeight ?? null} />
      <MetricChart logs={list} />
      {list.length > 0 ? <AiAnalysis /> : null}
      {activity.data ? <ActivityHeatmap completionMap={activity.data.completionMap} /> : null}
      <CalorieTrendCard endDate={todayStr()} />
      <WaterChart />
      <SleepChart />
      <Button icon="add" label={t("addMeasurement")} onPress={() => router.push("/progress-log")} />
      {list.length > 0 ? (
        <>
          <SectionTitle>{t("pastRecords")}</SectionTitle>
          <Card style={styles.historyCard}>
            {list.map((log, i) => (
              <HistoryRow key={log.id} log={log} last={i === list.length - 1} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Summary({ logs, startWeight, targetWeight }: { logs: ProgressLogDto[]; startWeight: string | null; targetWeight: string | null }) {
  const t = useTranslations("progress.summary");
  const tw = useTranslations("progress.weightTarget");
  const router = useRouter();
  const latest = logs.find((l) => l.weight)?.weight ?? null;
  const now = latest ?? startWeight;
  const diff = latest && startWeight ? Number(latest) - Number(startWeight) : null;
  const diffText = diff == null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`;
  // Same convention as the web: losing reads as progress.
  const diffColor = diff == null || diff === 0 ? colors.textMuted : diff < 0 ? colors.primary : colors.danger;
  return (
    <View style={styles.tiles}>
      <Tile icon="scale-outline" value={now ?? "—"} label={t("now")} />
      <Tile
        icon={diff == null || diff === 0 ? "remove-outline" : diff < 0 ? "trending-down" : "trending-up"}
        value={diffText}
        label={t("diff")}
        color={diffColor}
      />
      <Tile
        icon="flag-outline"
        value={targetWeight ?? "—"}
        label={t("target")}
        color={targetWeight ? colors.primary : undefined}
        // Start / target weight + the AI target suggestion (web: the pencil on this tile).
        onPress={() => router.push("/weight-targets")}
        accessibilityLabel={tw("title")}
      />
    </View>
  );
}

function Tile({
  icon,
  value,
  label,
  color,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  value: string;
  label: string;
  color?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const card = (pressed: boolean) => (
    <Card style={[styles.tile, pressed && { backgroundColor: colors.cardPressed }]}>
      {onPress ? <Ionicons name="pencil" size={12} color={colors.textMuted} style={styles.tileEdit} /> : null}
      <Ionicons name={icon} size={18} color={color ?? colors.textMuted} />
      <AppText style={[styles.tileValue, color ? { color } : null]}>{value}</AppText>
      <AppText variant="small" style={styles.center}>
        {label}
      </AppText>
    </Card>
  );
  if (!onPress) return card(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.tilePress}>
      {({ pressed }) => card(pressed)}
    </Pressable>
  );
}

/** Streams the coach's read of the latest measurements (web: ProgressAiAnalysis). */
function AiAnalysis() {
  const t = useTranslations("progress.aiAnalysis");
  const errorMessage = useErrorMessage();
  const invalidateQuota = useInvalidateQuota();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setText("");
    try {
      await apiStream("/ai/analyze", { onText: setText });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      invalidateQuota();
    }
  };

  return (
    <Card>
      <View style={styles.analysisHead}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <AppText variant="heading" style={{ flex: 1 }}>
          {t("title")}
        </AppText>
      </View>
      {error ? <ErrorBox message={error} /> : null}
      {text ? <Markdown>{text}</Markdown> : null}
      <AiButton
        label={loading ? t("analyzing") : text ? t("refresh") : t("analyze")}
        feature="analyze"
        variant={text ? "secondary" : "primary"}
        loading={loading}
        onPress={() => void analyze()}
      />
      {text && !loading ? <AiDisclaimer reportContext={text} /> : null}
    </Card>
  );
}

function MetricChart({ logs }: { logs: ProgressLogDto[] }) {
  const t = useTranslations("progress.chart");
  const tm = useTranslations("mobile.progress");
  const number = useNumber();
  const shortDate = useShortDate();
  const available = CHART_METRICS.filter((m) => m.key === "weight" || logs.some((l) => l[m.key]));
  const [metric, setMetric] = useState<ChartMetric>("weight");
  const current = available.find((m) => m.key === metric) ?? available[0];

  const points: ChartPoint[] = logs
    .filter((l) => l[current.key] != null)
    .map((l) => ({ key: String(l.id), x: dayNumber(l.logDate), label: shortDate(l.logDate), value: Number(l[current.key]) }))
    .sort((a, b) => a.x - b.x);
  const label = t(`metrics.${current.key}`);
  const last = points[points.length - 1];

  let body;
  if (logs.length === 0) body = <AppText variant="muted">{t("empty")}</AppText>;
  else if (points.length === 0) body = <AppText variant="muted">{t("noMetric", { label })}</AppText>;
  else if (points.length === 1) {
    body = <AppText variant="muted">{t("lastMeasurement", { value: number(last.value), unit: current.unit })}</AppText>;
  } else {
    body = (
      <>
        <LineChart
          key={current.key}
          points={points}
          color={seriesColors.weight}
          format={number}
          unit={current.unit || undefined}
          accessibilityLabel={`${label}: ${points.map((p) => `${p.label} ${number(p.value)}`).join(", ")}`}
        />
        <AppText variant="small">{tm("chartHint")}</AppText>
      </>
    );
  }

  return (
    <Card>
      <CardHeading icon="analytics" color={seriesColors.weight} title={label} />
      {available.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {available.map((m) => (
            <Chip key={m.key} label={t(`metrics.${m.key}`)} selected={m.key === current.key} onPress={() => setMetric(m.key)} />
          ))}
        </ScrollView>
      ) : null}
      {body}
    </Card>
  );
}

function WaterChart() {
  const t = useTranslations();
  const number = useNumber();
  const shortDate = useShortDate();
  const logs = useWaterLogs().data ?? [];
  if (logs.length < 2) return null;
  const bars = [...logs].reverse().map((l) => ({ key: l.logDate, x: 0, label: shortDate(l.logDate), value: l.glasses }));
  const target = Math.round(logs.reduce((sum, l) => sum + l.targetGlasses, 0) / logs.length);
  return (
    <Card>
      <CardHeading icon="water" color={seriesColors.water} title={t("water.title")} right={t("water.lastDays", { count: bars.length })} />
      <BarChart
        bars={bars}
        color={seriesColors.water}
        format={number}
        reference={{ value: target, label: `${t("dashboard.target")} ${target}` }}
        accessibilityLabel={`${t("water.title")}: ${bars.map((b) => `${b.label} ${b.value}`).join(", ")}`}
      />
    </Card>
  );
}

function SleepChart() {
  const t = useTranslations();
  const number = useNumber();
  const shortDate = useShortDate();
  const logs = (useSleepLogs().data ?? []).filter((l) => l.durationMinutes != null);
  if (logs.length < 2) return null;
  const bars = [...logs]
    .reverse()
    .map((l) => ({ key: l.logDate, x: 0, label: shortDate(l.logDate), value: Math.round(((l.durationMinutes ?? 0) / 60) * 10) / 10 }));
  return (
    <Card>
      <CardHeading icon="moon" color={seriesColors.sleep} title={t("sleep.title")} right={t("sleep.lastDays", { count: bars.length })} />
      <BarChart
        bars={bars}
        color={seriesColors.sleep}
        format={number}
        unit={t("sleep.hoursShort")}
        accessibilityLabel={`${t("sleep.chart.durationLegend")}: ${bars.map((b) => `${b.label} ${number(b.value)}`).join(", ")}`}
      />
    </Card>
  );
}

function HistoryRow({ log, last }: { log: ProgressLogDto; last: boolean }) {
  const t = useTranslations("progress");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const badges = [
    log.weight ? `${log.weight} kg` : null,
    log.fatPercent ? `%${log.fatPercent} ${t("badges.fat")}` : null,
    log.bmi ? `BMI ${log.bmi}` : null,
    log.waistCm ? `${t("badges.waist")} ${log.waistCm} cm` : null,
  ].filter((b): b is string => b != null);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/progress-log", params: { id: String(log.id) } })}
      style={({ pressed }) => [styles.historyRow, !last && styles.divider, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <View style={styles.grow}>
        <AppText style={styles.historyDate}>
          {formatDate(parseDateOnly(log.logDate), locale, { day: "numeric", month: "short", year: "numeric" })}
        </AppText>
        <View style={styles.badges}>
          {badges.map((b) => (
            <View key={b} style={styles.badge}>
              <AppText variant="small" style={styles.badgeText}>
                {b}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tileEdit: { position: "absolute", top: spacing.sm, right: spacing.sm },
  tilePress: { flex: 1 },
  analysisHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tiles: { flexDirection: "row", gap: spacing.md },
  tile: { flex: 1, alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm },
  tileValue: { fontSize: 20, fontWeight: "700" },
  center: { textAlign: "center" },
  chips: { gap: spacing.sm },
  historyCard: { padding: 0, gap: 0 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  historyDate: { fontWeight: "600" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  badge: { borderRadius: radius.sm, backgroundColor: colors.cardPressed, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.text },
  grow: { flex: 1 },
});
