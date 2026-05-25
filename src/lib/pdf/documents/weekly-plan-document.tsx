import {
  Document,
  Page,
  View,
  Text,
  baseStyles,
  DocHeader,
  DocFooter,
} from "../pdf-base";
import { StyleSheet } from "@react-pdf/renderer";
import {
  MealsBlock,
  WorkoutBlock,
  planTypeLabel,
  type ExportLabels,
} from "../blocks";
import type { CollectedWeeklyPlan } from "@/lib/export/collect-weekly-plan";
import type { Locale } from "@/lib/locale";
import type { MacroTargets } from "@/lib/macro-targets";

const styles = StyleSheet.create({
  daySection: { marginBottom: 12 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  dayName: { fontSize: 11 },
  subTitle: { fontSize: 9, color: "#6b7280", marginTop: 6, marginBottom: 2 },
  suppRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  suppName: { flex: 1 },
  suppDosage: { width: 110 },
  suppTiming: { width: 130, textAlign: "right", color: "#6b7280" },
  targetText: { color: "#15803d" },
});

export interface WeeklyPlanDocData {
  collected: CollectedWeeklyPlan;
  locale: Locale;
  labels: ExportLabels;
  dateRange: string | null;
  generatedAt: string;
  targets: MacroTargets | null;
}

export function WeeklyPlanDocument({ data }: { data: WeeklyPlanDocData }) {
  const { collected, locale, labels: L, dateRange, generatedAt, targets } = data;
  const { plan, days, supplements } = collected;

  const subtitleParts = [plan.phase, dateRange].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <DocHeader
          brand={L.brand}
          title={plan.title}
          subtitle={subtitleParts.join(" · ")}
          metaLines={[`${L.generatedAt}: ${generatedAt}`]}
        />

        {targets ? (
          <Text style={[styles.subTitle, styles.targetText]}>
            {L.targets}: {targets.calories} {L.kcal} · {L.protein}
            {targets.protein} {L.carbs}
            {targets.carbs} {L.fat}
            {targets.fat}
          </Text>
        ) : null}

        {days.map((day) => (
          <View key={day.id} style={styles.daySection} wrap={false}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.dayName}</Text>
              <Text style={baseStyles.muted}>
                {planTypeLabel(day.planType, L)}
                {day.workoutTitle ? ` · ${day.workoutTitle}` : ""}
              </Text>
            </View>

            <Text style={styles.subTitle}>{L.meals}</Text>
            <MealsBlock meals={day.meals} locale={locale} L={L} />

            <Text style={styles.subTitle}>{L.workout}</Text>
            <WorkoutBlock exercises={day.exercises} L={L} />
          </View>
        ))}

        {supplements.length > 0 ? (
          <View wrap={false}>
            <Text style={baseStyles.sectionTitle}>{L.supplements}</Text>
            {supplements.map((s) => (
              <View key={s.id} style={styles.suppRow}>
                <Text style={styles.suppName}>{s.name}</Text>
                <Text style={styles.suppDosage}>{s.dosage}</Text>
                <Text style={styles.suppTiming}>{s.timing}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <DocFooter text={L.footer} />
      </Page>
    </Document>
  );
}
