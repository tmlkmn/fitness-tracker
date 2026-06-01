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
import type { CollectedWeeklyPlan } from "@/lib/export/collect-weekly-plan";
import type { Locale } from "@/lib/locale";
import type { MacroTargets } from "@/lib/macro-targets";

const styles = StyleSheet.create({
  // The day block intentionally does NOT use wrap={false}: a full training
  // day (many meals + long workout) is taller than an A4 page, and forcing it
  // onto one page makes react-pdf overflow and overlap every line. Letting it
  // flow across pages keeps each page within bounds. Short rows inside still
  // use wrap={false} so individual meal/exercise rows never split.
  daySection: { marginTop: 13 },
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
  /**
   * Fallback layout. When true, each day is kept on a single page (wrap=false)
   * instead of flowing across pages. Flowing gives the cleaner result, but
   * react-pdf's layout engine crashes on extremely long (>~10 page) flowing
   * documents; the route retries with this flag so such plans still produce a
   * PDF (a very tall day may overflow, but it never 500s).
   */
  atomicDays?: boolean;
}

export function WeeklyPlanDocument({ data }: { data: WeeklyPlanDocData }) {
  const { collected, locale, labels: L, dateRange, generatedAt, targets, atomicDays } = data;
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
          // react-pdf treats `'wrap' in props` as "wrap was set" — even
          // wrap={undefined} disables wrapping. So the prop is omitted entirely
          // in the default flowing mode and only added (false) for the fallback.
          <View key={day.id} style={styles.daySection} {...(atomicDays ? { wrap: false } : {})}>
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
          </View>
        ))}

        {supplements.length > 0 ? (
          <View wrap={false}>
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
    </Document>
  );
}
