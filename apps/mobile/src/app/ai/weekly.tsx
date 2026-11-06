import Ionicons from "@expo/vector-icons/Ionicons";
import type { DeloadRecommendationDto, SavedWeeklySuggestionDto, UserProfileDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import { defaultUiDayModesForLevel } from "@fitmusc/shared/day-modes-default";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  AiButton,
  ErrorBox,
  LocationPicker,
  MeasurementNudge,
  MultiChips,
  NoteInput,
  buildAiUserNote,
  useWorkoutPrefs,
} from "@/components/ai";
import { WeeklyPreview, useApplyWeekTo, useLaunchJob } from "@/components/ai-results";
import { PlanTypeIcon } from "@/components/plan-type";
import { AppText, Banner, Button, Card, Chip, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import {
  useDeleteSavedWeekly,
  useDeloadRecommendation,
  useSavedWeekly,
  useSavedWeeklyDetail,
  useWeeklyAiGate,
} from "@/hooks/ai";
import { useProfile } from "@/hooks/wellness";
import { aiWeekOf, cycleDayChoice, type AiWeek, type DayChoice } from "@/lib/ai-weekly";
import { colors, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

type Mode = "both" | "nutrition" | "workout";
type Tab = "suggest" | "saved";

// Same required fields as the web's useProfileCheck (apps/web/src/hooks/use-profile-check.ts).
const REQUIRED_PROFILE: { key: string; missing: (p: UserProfileDto) => boolean }[] = [
  { key: "age", missing: (p) => !p.age },
  { key: "height", missing: (p) => !p.height },
  { key: "weight", missing: (p) => !p.weight },
  { key: "targetWeight", missing: (p) => !p.targetWeight },
  { key: "fitnessLevel", missing: (p) => !p.fitnessLevel },
  { key: "sportHistory", missing: (p) => !p.sportHistory },
  { key: "currentMedications", missing: (p) => !p.currentMedications },
  { key: "healthNotes", missing: (p) => !p.healthNotes },
  { key: "foodAllergens", missing: (p) => !p.foodAllergens },
  { key: "dailyRoutine", missing: (p) => !Array.isArray(p.dailyRoutine) || p.dailyRoutine.length === 0 },
];

export default function AiWeeklyScreen() {
  const t = useTranslations("calendar.aiWeekly");
  const raw = useLocalSearchParams<{ date: string }>().date;
  const date = dateString.safeParse(raw).success ? raw : null;
  const profile = useProfile();
  const [tab, setTab] = useState<Tab>("suggest");

  if (!date) return <ErrorView error={null} />;
  if (profile.isLoading) return <LoadingView />;
  if (!profile.data) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen>
        <WeekHeading date={date} />
        <Segmented
          options={[
            { value: "suggest", label: t("generate") },
            { value: "saved", label: t("savedSuggestions") },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "suggest" ? <WeeklyOptions date={date} profile={profile.data} /> : <SavedWeeks date={date} />}
      </Screen>
    </>
  );
}

function WeekHeading({ date }: { date: string }) {
  const t = useTranslations("mobile.ai");
  const locale = useLocale() as Locale;
  const monday = aiWeekOf(date).monday;
  return <AppText variant="muted">{t("weekOf", { date: formatDate(parseDateOnly(monday), locale, { day: "numeric", month: "long" }) })}</AppText>;
}

/** Why the week can't get a plan right now, or null. */
function GateNotice({ date, week }: { date: string; week: AiWeek }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const gate = useWeeklyAiGate(date, false);
  let message: string | null = null;
  if (week.isPast) message = t("mobile.ai.pastWeek");
  else if (gate.monthBlocked) {
    const month = formatDate(new Date(), locale, { month: "long", timeZone: "Europe/Istanbul" });
    message = `${t("assistant.monthGate.title", { month })} ${t("assistant.monthGate.body", { month, count: gate.emptyWeekCount })}`;
  } else if (gate.gap) message = t("mobile.ai.emptyWeekGap");
  if (!message) return null;
  return <Banner icon={<Ionicons name="lock-closed" size={14} color={colors.warning} />}>{message}</Banner>;
}

function ProfileMissing({ missing }: { missing: string[] }) {
  const t = useTranslations("assistant.profileMissing");
  const tf = useTranslations("mobile.ai.profileFields");
  const locale = useLocale() as Locale;
  return (
    <Card>
      <AppText variant="heading">{t("title")}</AppText>
      <AppText variant="muted">{t("body")}</AppText>
      {missing.map((key) => (
        <AppText key={key}>• {tf(key)}</AppText>
      ))}
      <Button label={t("cta")} variant="secondary" onPress={() => void openWebPage("settings", locale)} />
    </Card>
  );
}

function WeeklyOptions({ date, profile }: { date: string; profile: UserProfileDto }) {
  const t = useTranslations("calendar.aiWeekly");
  const tIngredients = useTranslations("meals.aiSuggestion");
  const tEquipment = useTranslations("workout.aiModal");
  const errorMessage = useErrorMessage();
  const job = useLaunchJob(errorMessage);
  const week = aiWeekOf(date);
  const gate = useWeeklyAiGate(date, false);
  const past = new Set(week.pastDows);
  const serviceType = profile.serviceType;

  const [mode, setMode] = useState<Mode>("both");
  const [dayModes, setDayModes] = useState<Record<number, DayChoice>>(() => defaultUiDayModesForLevel(profile.fitnessLevel));
  const [touchedDays, setTouchedDays] = useState(false);
  const [prefs, setPrefs] = useWorkoutPrefs();
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [deloadOverride, setDeloadOverride] = useState<boolean | null>(null);

  const workoutPart = mode !== "nutrition";
  const deloadAvailable = serviceType === "full" && workoutPart;
  const deload = useDeloadRecommendation(week.monday, deloadAvailable);
  const deloadWeek = deloadOverride ?? deload.data?.recommended ?? false;

  const missing = REQUIRED_PROFILE.filter((f) => f.missing(profile)).map((f) => f.key);
  if (missing.length > 0) return <ProfileMissing missing={missing} />;

  const dayLabels = t.raw("days") as { label: string; full: string }[];
  const ingredientOptions = (tIngredients.raw("ingredients") as string[]).map((v) => ({ value: v, label: v }));
  const tagOptions = (t.raw("tags") as string[]).map((v) => ({ value: v, label: v }));
  const tp = (m: DayChoice) => t(m === "workout" ? "planTypeWorkout" : m === "swimming" ? "planTypeSwimming" : "planTypeRest");
  const closed = week.isPast || gate.monthBlocked || gate.gap;

  const generate = () => {
    const training = Object.values(dayModes).some((m) => m === "workout" || m === "swimming");
    const equipment = prefs.equipment.length > 0 ? prefs.equipment.map((e) => tEquipment(`equipment.${e}`)).join(", ") : t("bodyweight");
    const locationPart = training ? (prefs.location === "home" ? t("homeInstruction", { equipment }) : t("gymInstruction")) : null;
    const ingredientsPart =
      ingredientMode === "specific" && ingredients.length > 0 ? tIngredients("ingredientNote", { list: ingredients.join(", ") }) : null;
    // Past days are always rest; the day picker is sent only once touched, so
    // the server can apply its fitness-level default otherwise.
    const effective: Record<string, DayChoice> = {};
    for (let dow = 0; dow < 7; dow++) effective[String(dow)] = past.has(dow) ? "rest" : dayModes[dow];
    job.launch({
      kind: "weekly",
      dateStr: date,
      userNote: buildAiUserNote([locationPart, ingredientsPart, ...tags, note]),
      generateMode: mode,
      dayModes: touchedDays ? effective : undefined,
      pastDows: week.pastDows,
      deloadWeek: workoutPart && serviceType !== "nutrition" ? deloadWeek : false,
    });
  };

  return (
    <>
      <GateNotice date={date} week={week} />
      <MeasurementNudge />
      {serviceType === "full" ? (
        <Card>
          <AppText variant="small">{t("modeLabel")}</AppText>
          <View style={styles.chips}>
            {(["both", "nutrition", "workout"] as const).map((value) => (
              <Chip
                key={value}
                label={t(value === "both" ? "modeBoth" : value === "nutrition" ? "modeNutrition" : "modeWorkout")}
                selected={mode === value}
                onPress={() => {
                  setMode(value);
                  if (value === "nutrition") setDeloadOverride(false);
                }}
              />
            ))}
          </View>
          {workoutPart ? (
            <DeloadToggle recommendation={deload.data} value={deloadWeek} onChange={setDeloadOverride} />
          ) : null}
        </Card>
      ) : null}

      {workoutPart ? (
        <Card>
          <AppText variant="small">
            {t("dayTypeLabel")} {t("dayTypeHint")}
          </AppText>
          <View style={styles.days}>
            {dayLabels.map((day, dow) => {
              const isPast = past.has(dow);
              const choice: DayChoice = isPast ? "rest" : dayModes[dow];
              return (
                <Pressable
                  key={dow}
                  disabled={isPast}
                  accessibilityRole="button"
                  accessibilityLabel={isPast ? t("dayTooltipPast", { label: day.full }) : t("dayTooltipActive", { label: day.full, mode: tp(choice) })}
                  onPress={() => {
                    setTouchedDays(true);
                    setDayModes((prev) => ({ ...prev, [dow]: cycleDayChoice(prev[dow], serviceType !== "nutrition") }));
                  }}
                  style={[styles.day, isPast && styles.dayPast]}
                >
                  <Text style={[styles.dayLabel, isPast && styles.dayLabelPast]}>{day.label}</Text>
                  {isPast ? null : <PlanTypeIcon planType={choice} size={18} />}
                  <Text style={styles.dayMode} numberOfLines={1}>
                    {isPast ? "—" : tp(choice)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="small">{t("dayCycleNote")}</AppText>
          {week.pastDows.length > 0 ? <AppText variant="small">{t("pastDaysNote")}</AppText> : null}
          <LocationPicker prefs={prefs} onChange={setPrefs} />
        </Card>
      ) : null}

      {mode !== "workout" ? (
        <Card>
          <AppText variant="small">{t("ingredientsLabel")}</AppText>
          <View style={styles.chips}>
            <Chip label={tIngredients("modeAll")} selected={ingredientMode === "all"} onPress={() => setIngredientMode("all")} />
            <Chip label={tIngredients("modeSpecific")} selected={ingredientMode === "specific"} onPress={() => setIngredientMode("specific")} />
          </View>
          {ingredientMode === "specific" ? <MultiChips options={ingredientOptions} selected={ingredients} onChange={setIngredients} /> : null}
        </Card>
      ) : null}

      <Card>
        {workoutPart ? (
          <>
            <AppText variant="small">{t("tagsLabel")}</AppText>
            <MultiChips options={tagOptions} selected={tags} onChange={setTags} />
          </>
        ) : null}
        <NoteInput value={note} onChange={setNote} label={t("noteLabel")} placeholder={t("notePlaceholder")} />
      </Card>

      {job.error ? <ErrorBox message={job.error} /> : null}
      <AiButton label={t("generate")} feature="weekly" loading={job.isPending} disabled={closed} onPress={generate} />
    </>
  );
}

function DeloadToggle({
  recommendation,
  value,
  onChange,
}: {
  recommendation: DeloadRecommendationDto | undefined;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations("calendar.aiWeekly");
  const reasons: string[] = [];
  if (recommendation) {
    if (recommendation.reasons.includes("cadence")) reasons.push(t("deloadReasonCadence", { weeks: recommendation.consecutiveTrainingWeeks }));
    if (recommendation.reasons.includes("sleep_quality")) reasons.push(t("deloadReasonSleepQuality"));
    if (recommendation.reasons.includes("sleep_duration")) reasons.push(t("deloadReasonSleepDuration"));
    if (recommendation.reasons.includes("completion")) reasons.push(t("deloadReasonCompletion"));
  }
  const severity = recommendation?.severity ?? "none";
  return (
    <View style={{ gap: spacing.sm }}>
      {severity !== "none" ? (
        <View style={styles.deloadRec}>
          <Text style={styles.deloadTitle}>{severity === "hard" ? t("deloadRecommendedHardTitle") : t("deloadRecommendedSoftTitle")}</Text>
          {reasons.map((reason) => (
            <AppText key={reason} variant="small">
              • {reason}
            </AppText>
          ))}
        </View>
      ) : null}
      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontWeight: "600" }}>{t("deloadToggleLabel")}</AppText>
          <AppText variant="small">{t("deloadToggleHelp")}</AppText>
          {recommendation?.reasons.includes("just_deloaded") ? <AppText variant="small">{t("deloadJustDeloadedNote")}</AppText> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={t("deloadToggleLabel")}
        />
      </View>
    </View>
  );
}

// ── Saved weekly suggestions ─────────────────────────────────────────────────

function SavedWeeks({ date }: { date: string }) {
  const t = useTranslations("calendar.aiWeekly");
  const locale = useLocale() as Locale;
  const saved = useSavedWeekly();
  const [selected, setSelected] = useState<number | null>(null);

  if (selected != null) return <SavedWeekDetail id={selected} date={date} onBack={() => setSelected(null)} />;
  if (saved.isLoading) return <LoadingView />;
  if (!saved.data) return <ErrorView error={saved.error} onRetry={() => saved.refetch()} />;
  if (saved.data.length === 0) return <AppText variant="muted">{t("emptySaved")}</AppText>;

  // Grouped by the week they were generated for, newest first (like the web).
  const groups = new Map<string, SavedWeeklySuggestionDto[]>();
  for (const item of saved.data) {
    const key = item.originalDate ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <>
      {[...groups.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([weekDate, items]) => (
          <Card key={weekDate || "none"}>
            <AppText variant="small">
              {weekDate
                ? t("weekLabel", { label: formatDate(parseDateOnly(aiWeekOf(weekDate).monday), locale, { day: "numeric", month: "long" }) })
                : t("weekDateless")}
            </AppText>
            {items.map((item, i) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setSelected(item.id)}
                style={({ pressed }) => [styles.savedRow, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText style={{ fontWeight: "600" }}>{t("savedItem", { n: i + 1, title: item.title })}</AppText>
                  <AppText variant="small" numberOfLines={1}>
                    {[item.phase, item.userNote].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        ))}
    </>
  );
}

function SavedWeekDetail({ id, date, onBack }: { id: number; date: string; onBack: () => void }) {
  const t = useTranslations("calendar.aiWeekly");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const detail = useSavedWeeklyDetail(id);
  const apply = useApplyWeekTo(date);
  const remove = useDeleteSavedWeekly();
  const gate = useWeeklyAiGate(date, false);
  const [error, setError] = useState<string | null>(null);
  const week = aiWeekOf(date);

  if (detail.isLoading) return <LoadingView />;
  if (!detail.data) return <ErrorView error={detail.error} onRetry={() => detail.refetch()} />;
  const plan = detail.data.plan;

  const confirmDelete = () =>
    Alert.alert(t("deleteTitle"), t("deleteConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => remove.mutate(id, { onSuccess: onBack }) },
    ]);

  return (
    <>
      <Button label={`‹ ${t("back")}`} variant="ghost" onPress={onBack} />
      <GateNotice date={date} week={week} />
      {apply.hasPlan ? <Banner icon={<Ionicons name="warning-outline" size={14} color={colors.warning} />}>{t("willReplace")}</Banner> : null}
      <WeeklyPreview plan={plan} />
      {error ? <ErrorBox message={error} /> : null}
      <Button
        label={t("approve")}
        loading={apply.isPending}
        disabled={week.isPast || gate.monthBlocked || gate.gap}
        onPress={() => {
          setError(null);
          apply.apply(plan, undefined, { onSuccess: () => router.back(), onError: (err) => setError(errorMessage(err)) });
        }}
      />
      <Button label={t("delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  days: { flexDirection: "row", gap: spacing.xs },
  day: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.cardPressed,
  },
  dayPast: { opacity: 0.4 },
  dayLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
  dayLabelPast: { textDecorationLine: "line-through", color: colors.textMuted },
  dayMode: { color: colors.textMuted, fontSize: 9 },
  deloadRec: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245, 158, 11, 0.35)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  deloadTitle: { color: colors.warning, fontSize: 13, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  savedRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
});
