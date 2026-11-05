import {
  Document,
  Page,
  View,
  Text,
  baseStyles,
  DocHeader,
  DocFooter,
  StatChips,
  SubSection,
} from "../pdf-base";
import { StyleSheet } from "@react-pdf/renderer";
import {
  MealsBlock,
  WorkoutBlock,
  planTypeLabel,
  type ExportLabels,
} from "../blocks";
import type { CollectedWeeklyPlan, CollectedDay } from "@/lib/export/collect-weekly-plan";
import type { Locale } from "@/lib/locale";
import type { MacroTargets } from "@/lib/macro-targets";

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginBottom: 2,
  },
  dayAccent: { width: 3, height: 13, backgroundColor: "#15803d", marginRight: 7 },
  dayName: { fontSize: 12, fontWeight: 700, color: "#14532d" },
  dayMeta: { flex: 1, fontSize: 9, color: "#166534", textAlign: "right" },
  suppRow: { flexDirection: "row", paddingVertical: 4 },
  suppDivider: { height: 0.5, backgroundColor: "#e5e7eb" },
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

function DayPage({
  day,
  locale,
  L,
}: {
  day: CollectedDay;
  locale: Locale;
  L: ExportLabels;
}) {
  return (
    <Page size="A4" style={baseStyles.page}>
      <View style={styles.dayHeader} wrap={false}>
        <View style={styles.dayAccent} />
        <Text style={styles.dayName}>{day.dayName}</Text>
        <Text style={styles.dayMeta}>
          {planTypeLabel(day.planType, L)}
          {day.workoutTitle ? ` · ${day.workoutTitle}` : ""}
        </Text>
      </View>

      <SubSection label={L.meals} />
      <MealsBlock meals={day.meals} locale={locale} L={L} />

      <SubSection label={L.workout} spaced />
      <WorkoutBlock exercises={day.exercises} L={L} />

      <DocFooter text={L.footer} />
    </Page>
  );
}

export function WeeklyPlanDocument({ data }: { data: WeeklyPlanDocData }) {
  const { collected, locale, labels: L, dateRange, generatedAt, targets } = data;
  const { plan, days, supplements } = collected;

  const subtitleParts = [plan.phase, dateRange].filter(Boolean) as string[];

  return (
    <Document>
      {/* Overview page: brand, week title, daily targets, supplements. Each
          day then gets its own page for an easy-to-read, printable handout. */}
      <Page size="A4" style={baseStyles.page}>
        <DocHeader
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

        {supplements.length > 0 ? (
          <View>
            <Text style={baseStyles.sectionTitle}>{L.supplements}</Text>
            {supplements.map((s) => (
              <View key={s.id} wrap={false}>
                <View style={styles.suppRow}>
                  <Text style={styles.suppName}>{s.name}</Text>
                  <Text style={styles.suppDosage}>{s.dosage}</Text>
                  <Text style={styles.suppTiming}>{s.timing}</Text>
                </View>
                <View style={styles.suppDivider} />
              </View>
            ))}
          </View>
        ) : null}

        <DocFooter text={L.footer} />
      </Page>

      {days.map((day) => (
        <DayPage key={day.id} day={day} locale={locale} L={L} />
      ))}
    </Document>
  );
}
