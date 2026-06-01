import {
  Document,
  Page,
  View,
  Text,
  baseStyles,
  DocHeader,
  DocFooter,
  StatChips,
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
  daySection: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dayName: { fontSize: 11.5, fontWeight: 700, color: "#14532d" },
  dayMeta: { fontSize: 9, color: "#6b7280" },
  dayBody: { paddingHorizontal: 10, paddingBottom: 8 },
  subTitle: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 3,
  },
  suppRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  suppName: { flex: 1 },
  suppDosage: { width: 110 },
  suppTiming: { width: 130, textAlign: "right", color: "#6b7280" },
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
          <>
            <Text style={[baseStyles.sectionLabel, { marginTop: 12 }]}>
              {L.targets}
            </Text>
            <StatChips
              chips={[
                { label: L.calories, value: `${targets.calories} ${L.kcal}`, accent: true },
                { label: L.proteinFull, value: `${targets.protein} g` },
                { label: L.carbsFull, value: `${targets.carbs} g` },
                { label: L.fatFull, value: `${targets.fat} g` },
              ]}
            />
          </>
        ) : null}

        {days.map((day) => (
          <View key={day.id} style={styles.daySection} wrap={false}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.dayName}</Text>
              <Text style={styles.dayMeta}>
                {planTypeLabel(day.planType, L)}
                {day.workoutTitle ? ` · ${day.workoutTitle}` : ""}
              </Text>
            </View>

            <View style={styles.dayBody}>
              <Text style={styles.subTitle}>{L.meals}</Text>
              <MealsBlock meals={day.meals} locale={locale} L={L} />

              <Text style={styles.subTitle}>{L.workout}</Text>
              <WorkoutBlock exercises={day.exercises} L={L} />
            </View>
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
