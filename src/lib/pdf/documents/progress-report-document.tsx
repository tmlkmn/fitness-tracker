import {
  Document,
  Page,
  View,
  Text,
  baseStyles,
  PALETTE,
  DocHeader,
  DocFooter,
} from "../pdf-base";
import { StyleSheet, Svg, Polyline, Line, Circle } from "@react-pdf/renderer";
import type { ExportLabels } from "../blocks";
import type { Locale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import type { progressLogs } from "@/db/schema";

type ProgressLogRow = typeof progressLogs.$inferSelect;

export interface ProgressDocData {
  logs: ProgressLogRow[]; // chronological ascending
  locale: Locale;
  labels: ExportLabels;
  generatedAt: string;
}

const styles = StyleSheet.create({
  chartBox: {
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 5,
    padding: 8,
    backgroundColor: PALETTE.surface,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metric: { width: "33%", marginBottom: 4 },
  metricLabel: { fontSize: 8, color: PALETTE.muted },
  metricValue: { fontSize: 11 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    paddingBottom: 3,
    marginTop: 6,
    marginBottom: 2,
  },
  th: { color: PALETTE.muted, fontSize: 9 },
  tr: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.border,
  },
  cDate: { flex: 1 },
  cNum: { width: 70, textAlign: "right" },
});

// Content width on A4 (595.28pt) minus the page's 44pt horizontal padding on
// each side, minus the chart card's 8pt padding on each side.
const CHART_W = 491;
const CHART_H = 150;
const PAD = 24;

function WeightChart({ points }: { points: { x: number; y: number; raw: number }[] }) {
  if (points.length < 2) return null;
  const poly = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <View style={styles.chartBox}>
      <Svg width={CHART_W} height={CHART_H}>
        <Line
          x1={PAD}
          y1={CHART_H - PAD}
          x2={CHART_W - PAD}
          y2={CHART_H - PAD}
          strokeWidth={1}
          stroke={PALETTE.border}
        />
        <Polyline
          points={poly}
          strokeWidth={1.5}
          stroke={PALETTE.primary}
          fill="none"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2} fill={PALETTE.primary} />
        ))}
      </Svg>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function ProgressReportDocument({ data }: { data: ProgressDocData }) {
  const { logs, locale, labels: L, generatedAt } = data;

  const fmt = (d: string) =>
    formatDate(parseDateOnly(d), locale, { day: "numeric", month: "short" });

  // Weight series for the chart (chronological, only entries with weight).
  const weightLogs = logs.filter((l) => l.weight != null && l.weight !== "");
  const weights = weightLogs.map((l) => parseFloat(l.weight as string));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const span = maxW - minW || 1;
  const points = weightLogs.map((l, i) => {
    const raw = parseFloat(l.weight as string);
    const x =
      PAD +
      (i / Math.max(1, weightLogs.length - 1)) * (CHART_W - PAD * 2);
    const y =
      PAD + (1 - (raw - minW) / span) * (CHART_H - PAD * 2);
    return { x, y, raw };
  });

  // Latest filled log for body composition + measurements.
  const latest = [...logs].reverse().find((l) => l) ?? null;

  const measurementItems = latest
    ? (
        [
          [L.weight, latest.weight, "kg"],
          ["BMI", latest.bmi, ""],
          ["%" + L.fat, latest.fatPercent, "%"],
        ] as const
      ).filter(([, v]) => v != null && v !== "")
    : [];

  const measureCm = latest
    ? (
        [
          [L.measurements + " (bel/waist)", latest.waistCm],
          ["kol/arm R", latest.rightArmCm],
          ["kol/arm L", latest.leftArmCm],
          ["bacak/leg R", latest.rightLegCm],
          ["bacak/leg L", latest.leftLegCm],
        ] as const
      ).filter(([, v]) => v != null && v !== "")
    : [];

  // Recent rows (most recent first), capped to keep one page tidy.
  const recent = [...logs].reverse().slice(0, 20);

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <DocHeader
          brand={L.brand}
          title={L.progressTitle}
          metaLines={[`${L.generatedAt}: ${generatedAt}`]}
        />

        {logs.length === 0 ? (
          <Text style={baseStyles.faint}>{L.noData}</Text>
        ) : (
          <>
            {points.length >= 2 ? (
              <>
                <Text style={baseStyles.sectionTitle}>{L.weightTrend}</Text>
                <View style={baseStyles.row}>
                  <Text style={baseStyles.faint}>
                    {minW} – {maxW} kg
                  </Text>
                </View>
                <WeightChart points={points} />
              </>
            ) : null}

            {latest ? (
              <>
                <Text style={baseStyles.sectionTitle}>{L.latest}</Text>
                <View style={styles.metricRow}>
                  {measurementItems.map(([label, value, unit]) => (
                    <Metric
                      key={label}
                      label={label}
                      value={`${value}${unit ? " " + unit : ""}`}
                    />
                  ))}
                </View>
                {measureCm.length > 0 ? (
                  <>
                    <Text style={[baseStyles.sectionLabel, { marginTop: 6 }]}>
                      {L.measurements}
                    </Text>
                    <View style={styles.metricRow}>
                      {measureCm.map(([label, value]) => (
                        <Metric key={label} label={label} value={`${value} cm`} />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={baseStyles.sectionTitle}>{L.weight}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.cDate]}>{L.date}</Text>
              <Text style={[styles.th, styles.cNum]}>{L.weight}</Text>
              <Text style={[styles.th, styles.cNum]}>BMI</Text>
              <Text style={[styles.th, styles.cNum]}>{L.fat} %</Text>
            </View>
            {recent.map((l) => (
              <View key={l.id} style={styles.tr}>
                <Text style={styles.cDate}>{fmt(l.logDate)}</Text>
                <Text style={styles.cNum}>{l.weight ?? "—"}</Text>
                <Text style={styles.cNum}>{l.bmi ?? "—"}</Text>
                <Text style={styles.cNum}>{l.fatPercent ?? "—"}</Text>
              </View>
            ))}
          </>
        )}

        <DocFooter text={L.footer} />
      </Page>
    </Document>
  );
}
