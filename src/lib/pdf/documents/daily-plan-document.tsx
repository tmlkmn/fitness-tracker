import {
  Document,
  Page,
  Text,
  baseStyles,
  DocHeader,
  DocFooter,
} from "../pdf-base";
import {
  MealsBlock,
  WorkoutBlock,
  planTypeLabel,
  type ExportLabels,
} from "../blocks";
import type { CollectedDay } from "@/lib/export/collect-weekly-plan";
import type { Locale } from "@/lib/locale";

export interface DailyPlanDocData {
  day: CollectedDay;
  locale: Locale;
  labels: ExportLabels;
  dateLabel: string | null;
  generatedAt: string;
}

export function DailyPlanDocument({ data }: { data: DailyPlanDocData }) {
  const { day, locale, labels: L, dateLabel, generatedAt } = data;

  const subtitleParts = [
    dateLabel,
    day.workoutTitle ?? planTypeLabel(day.planType, L),
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <DocHeader
          brand={L.brand}
          title={day.dayName}
          subtitle={subtitleParts.join(" — ")}
          metaLines={[`${L.generatedAt}: ${generatedAt}`]}
        />

        <Text style={baseStyles.sectionTitle}>{L.meals}</Text>
        <MealsBlock meals={day.meals} locale={locale} L={L} />

        <Text style={baseStyles.sectionTitle}>{L.workout}</Text>
        <WorkoutBlock exercises={day.exercises} L={L} />

        <DocFooter text={L.footer} />
      </Page>
    </Document>
  );
}
