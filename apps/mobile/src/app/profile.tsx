import Ionicons from "@expo/vector-icons/Ionicons";
import type { FitnessLevelSuggestionDto, UserProfileDto } from "@fitmusc/shared/api/dto";
import {
  ACTIVITY_LEVELS,
  decimalString,
  FITNESS_GOALS,
  FITNESS_LEVELS,
  type GENDERS,
} from "@fitmusc/shared/api/schemas";
import { intlLocale } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { ErrorBox } from "@/components/ai";
import { Field, Input, NumberInput } from "@/components/form";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Segmented, useErrorMessage } from "@/components/ui";
import { useCloseGuard } from "@/hooks/close-guard";
import { useFitnessLevelSuggestion, useProfile, useSaveProfile } from "@/hooks/wellness";
import { colors, radius, spacing, withAlpha } from "@/lib/theme";

type Gender = (typeof GENDERS)[number];
type Activity = (typeof ACTIVITY_LEVELS)[number];
type FitnessLevel = (typeof FITNESS_LEVELS)[number];
type FitnessGoal = (typeof FITNESS_GOALS)[number];
type FlagKey = "hasEatingDisorderHistory" | "isPregnantOrBreastfeeding" | "hasDiabetes" | "hasThyroidCondition";

// Display order of the web form (apps/web/src/components/settings/health-profile-card.tsx).
const GENDER_ORDER: Gender[] = ["female", "male", "prefer_not_to_say"];
const FLAG_KEYS: FlagKey[] = ["hasEatingDisorderHistory", "isPregnantOrBreastfeeding", "hasDiabetes", "hasThyroidCondition"];

// Stored in Turkish (the AI prompts and the web read these strings); shown through allergenTags.*.
const ALLERGENS: { tag: string; key: string }[] = [
  { tag: "Süt ürünleri", key: "dairy" },
  { tag: "Yumurta", key: "egg" },
  { tag: "Fıstık", key: "peanut" },
  { tag: "Yer fıstığı", key: "groundnut" },
  { tag: "Balık", key: "fish" },
  { tag: "Kabuklu deniz ürünü", key: "shellfish" },
  { tag: "Buğday (Gluten)", key: "wheat" },
  { tag: "Soya", key: "soy" },
  { tag: "Susam", key: "sesame" },
  { tag: "Kereviz", key: "celery" },
  { tag: "Hardal", key: "mustard" },
  { tag: "Bal", key: "honey" },
];
const ALLERGEN_TAGS = ALLERGENS.map((a) => a.tag);
const NO_ALLERGENS = "Yok";

interface FormState {
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  gender: Gender;
  activity: Activity;
  serviceType: "full" | "nutrition";
  fitnessLevel: FitnessLevel | "";
  fitnessGoal: FitnessGoal | "";
  sportHistory: string;
  currentMedications: string;
  healthNotes: string;
  allergenMode: "none" | "has";
  selectedAllergens: string[];
  otherAllergens: string;
  flags: Record<FlagKey, boolean>;
}

const isOneOf = <T extends string>(list: readonly T[], value: string | null): value is T =>
  value != null && (list as readonly string[]).includes(value);

/** Profile → form, reading the stored allergen JSON the way the web form does. */
function toForm(p: UserProfileDto): FormState {
  let allergenMode: FormState["allergenMode"] = "none";
  let selectedAllergens: string[] = [];
  let otherAllergens = "";
  if (p.foodAllergens) {
    try {
      const parsed: unknown = JSON.parse(p.foodAllergens);
      if (Array.isArray(parsed) && parsed.length > 0 && !(parsed.length === 1 && parsed[0] === NO_ALLERGENS)) {
        const list = parsed.map(String);
        allergenMode = "has";
        selectedAllergens = list.filter((a) => ALLERGEN_TAGS.includes(a));
        otherAllergens = list.filter((a) => !ALLERGEN_TAGS.includes(a)).join(", ");
      }
    } catch {
      allergenMode = "has";
      otherAllergens = p.foodAllergens;
    }
  }
  return {
    age: p.age != null ? String(p.age) : "",
    height: p.height != null ? String(p.height) : "",
    weight: p.weight ?? "",
    targetWeight: p.targetWeight ?? "",
    gender: isOneOf(GENDER_ORDER, p.gender) ? p.gender : "prefer_not_to_say",
    activity: isOneOf(ACTIVITY_LEVELS, p.dailyActivityLevel) ? p.dailyActivityLevel : "light",
    serviceType: p.serviceType === "nutrition" ? "nutrition" : "full",
    fitnessLevel: isOneOf(FITNESS_LEVELS, p.fitnessLevel) ? p.fitnessLevel : "",
    fitnessGoal: isOneOf(FITNESS_GOALS, p.fitnessGoal) ? p.fitnessGoal : "",
    sportHistory: p.sportHistory ?? "",
    currentMedications: p.currentMedications ?? "",
    healthNotes: p.healthNotes ?? "",
    allergenMode,
    selectedAllergens,
    otherAllergens,
    flags: {
      hasEatingDisorderHistory: Boolean(p.hasEatingDisorderHistory),
      isPregnantOrBreastfeeding: Boolean(p.isPregnantOrBreastfeeding),
      hasDiabetes: Boolean(p.hasDiabetes),
      hasThyroidCondition: Boolean(p.hasThyroidCondition),
    },
  };
}

function allergensJson(form: FormState) {
  if (form.allergenMode === "none") return JSON.stringify([NO_ALLERGENS]);
  const all = [
    ...form.selectedAllergens,
    ...form.otherAllergens
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  return JSON.stringify(all.length > 0 ? all : [NO_ALLERGENS]);
}

const normalize = (raw: string) => raw.trim().replace(",", ".");
const wholeIn = (raw: string, min: number, max: number) => /^\d+$/.test(raw) && Number(raw) >= min && Number(raw) <= max;

/** Age, height, weights, health profile and goals (web: Settings → Profile details). */
export default function ProfileScreen() {
  const t = useTranslations("settings.items");
  const profile = useProfile();
  const suggestion = useFitnessLevelSuggestion();
  if (profile.isLoading) return <LoadingView />;
  if (!profile.data) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: t("healthTitle") }} />
      <ProfileForm initial={toForm(profile.data)} suggestion={suggestion.data ?? null} />
    </>
  );
}

function ProfileForm({ initial, suggestion }: { initial: FormState; suggestion: FitnessLevelSuggestionDto | null }) {
  const t = useTranslations("settings.healthProfile");
  const pe = useTranslations("settings.profileEditor");
  const tp = useTranslations("mobile.profile");
  const tm = useTranslations("mobile.progress");
  const errorMessage = useErrorMessage();
  const save = useSaveProfile();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const { leave } = useCloseGuard(dirty && !save.isPending);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const full = form.serviceType === "full";

  const submit = () => {
    setError(null);
    const age = form.age.trim();
    const height = form.height.trim();
    const weight = normalize(form.weight);
    const targetWeight = normalize(form.targetWeight);
    if (age && !wholeIn(age, 10, 120)) return setError(tp("invalidAge"));
    if (height && !wholeIn(height, 50, 300)) return setError(tp("invalidHeight"));
    if ((weight && !decimalString.safeParse(weight).success) || (targetWeight && !decimalString.safeParse(targetWeight).success)) {
      return setError(tm("invalidNumber"));
    }
    // Same payload as the web form: an empty number keeps its saved value, except age.
    save.mutate(
      {
        profile: {
          height: height ? Number(height) : undefined,
          weight: weight || undefined,
          targetWeight: targetWeight || undefined,
          age: age ? Number(age) : null,
          healthNotes: form.healthNotes.trim(),
          fitnessLevel: form.fitnessLevel || undefined,
          fitnessGoal: form.fitnessGoal || undefined,
          sportHistory: form.sportHistory.trim() || undefined,
          currentMedications: form.currentMedications.trim() || undefined,
          serviceType: form.serviceType,
          foodAllergens: allergensJson(form),
        },
        health: { gender: form.gender, dailyActivityLevel: form.activity, ...form.flags },
      },
      { onSuccess: leave, onError: (err) => setError(errorMessage(err)) },
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <AppText variant="small">{t("intro")}</AppText>

      <Group title={t("basicTitle")}>
        <Card>
          <View style={styles.row}>
            <Field label={`${pe("age")} *`}>
              <NumberInput value={form.age} onChangeText={(v) => set("age", v)} accessibilityLabel={pe("age")} />
            </Field>
            <Field label={pe("height")}>
              <NumberInput value={form.height} onChangeText={(v) => set("height", v)} unit="cm" accessibilityLabel={pe("height")} />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label={pe("startWeight")}>
              <NumberInput value={form.weight} onChangeText={(v) => set("weight", v)} unit="kg" accessibilityLabel={pe("startWeight")} />
            </Field>
            <Field label={pe("targetWeight")}>
              <NumberInput
                value={form.targetWeight}
                onChangeText={(v) => set("targetWeight", v)}
                unit="kg"
                accessibilityLabel={pe("targetWeight")}
              />
            </Field>
          </View>
        </Card>
      </Group>

      <Group title={t("genderTitle")}>
        {GENDER_ORDER.map((value) => (
          <Choice key={value} selected={form.gender === value} label={t(`genders.${value}`)} onPress={() => set("gender", value)} />
        ))}
      </Group>

      <Group title={t("activityTitle")}>
        {ACTIVITY_LEVELS.map((value) => (
          <Choice
            key={value}
            selected={form.activity === value}
            label={t(`activities.${value}.label`)}
            hint={t(`activities.${value}.hint`)}
            onPress={() => set("activity", value)}
          />
        ))}
      </Group>

      <Group title={pe("serviceType")}>
        <Segmented
          options={[
            { value: "full", label: pe("serviceFull") },
            { value: "nutrition", label: pe("serviceNutrition") },
          ]}
          value={form.serviceType}
          onChange={(v) => set("serviceType", v)}
        />
      </Group>

      {full ? (
        <Group title={pe("fitnessLevel")} required>
          {suggestion ? (
            <LevelNudge
              suggestion={suggestion}
              applied={form.fitnessLevel === suggestion.suggested}
              onApply={(level) => set("fitnessLevel", level)}
            />
          ) : null}
          {FITNESS_LEVELS.map((value) => (
            <Choice
              key={value}
              selected={form.fitnessLevel === value}
              label={pe(`fitnessLevels.${value}`)}
              onPress={() => set("fitnessLevel", value)}
            />
          ))}
        </Group>
      ) : null}

      <Group title={pe("goal")} required>
        {FITNESS_GOALS.map((value) => (
          <Choice
            key={value}
            selected={form.fitnessGoal === value}
            label={pe(`fitnessGoals.${value}.label`)}
            hint={pe(`fitnessGoals.${value}.description`)}
            onPress={() => set("fitnessGoal", value)}
          />
        ))}
      </Group>

      {full ? (
        <Group title={pe("sportHistory")} required>
          <Input
            value={form.sportHistory}
            onChangeText={(v) => set("sportHistory", v)}
            placeholder={pe("sportHistoryPlaceholder")}
            accessibilityLabel={pe("sportHistory")}
            multiline
            maxLength={2000}
          />
        </Group>
      ) : null}

      <Group title={pe("medications")} required>
        <Input
          value={form.currentMedications}
          onChangeText={(v) => set("currentMedications", v)}
          placeholder={pe("medicationsPlaceholder")}
          accessibilityLabel={pe("medications")}
          multiline
          maxLength={2000}
        />
      </Group>

      <Group title={pe("healthNotes")} required>
        <Input
          value={form.healthNotes}
          onChangeText={(v) => set("healthNotes", v)}
          placeholder={pe("healthNotesPlaceholder")}
          accessibilityLabel={pe("healthNotes")}
          multiline
          maxLength={2000}
        />
      </Group>

      <Group title={pe("allergens")}>
        <Segmented
          options={[
            { value: "none", label: pe("noAllergens") },
            { value: "has", label: pe("hasAllergens") },
          ]}
          value={form.allergenMode}
          onChange={(mode) =>
            setForm((f) => (mode === "none" ? { ...f, allergenMode: mode, selectedAllergens: [], otherAllergens: "" } : { ...f, allergenMode: mode }))
          }
        />
        {form.allergenMode === "has" ? (
          <>
            <View style={styles.chips}>
              {ALLERGENS.map(({ tag, key }) => (
                <Chip
                  key={tag}
                  label={pe(`allergenTags.${key}` as "allergenTags.dairy")}
                  selected={form.selectedAllergens.includes(tag)}
                  onPress={() =>
                    set(
                      "selectedAllergens",
                      form.selectedAllergens.includes(tag)
                        ? form.selectedAllergens.filter((x) => x !== tag)
                        : [...form.selectedAllergens, tag],
                    )
                  }
                />
              ))}
            </View>
            <Input
              value={form.otherAllergens}
              onChangeText={(v) => set("otherAllergens", v)}
              placeholder={pe("otherAllergensPlaceholder")}
              accessibilityLabel={pe("otherAllergensPlaceholder")}
              multiline
              maxLength={500}
            />
          </>
        ) : null}
      </Group>

      <Group title={t("flagsTitle")}>
        {FLAG_KEYS.map((key) => (
          <Check
            key={key}
            checked={form.flags[key]}
            label={t(`flags.${key}`)}
            onPress={() => set("flags", { ...form.flags, [key]: !form.flags[key] })}
          />
        ))}
      </Group>

      {error ? <ErrorBox message={error} /> : null}
      <Button label={t("save")} icon="save-outline" loading={save.isPending} onPress={submit} />
    </ScrollView>
  );
}

function Group({ title, required, children }: { title: string; required?: boolean; children: ReactNode }) {
  const locale = useLocale() as Locale;
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>
        {title.toLocaleUpperCase(intlLocale(locale))}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

/** Radio card (web RadioCard). */
function Choice({ selected, label, hint, onPress }: { selected: boolean; label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && !selected && styles.optionPressed]}
    >
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? colors.primary : colors.textMuted} />
      <View style={styles.grow}>
        <AppText style={styles.optionLabel}>{label}</AppText>
        {hint ? <AppText variant="small">{hint}</AppText> : null}
      </View>
    </Pressable>
  );
}

function Check({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, checked && styles.optionOn, pressed && !checked && styles.optionPressed]}
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? colors.primary : colors.textMuted} />
      <AppText style={styles.grow}>{label}</AppText>
    </Pressable>
  );
}

/** Up-only level suggestion from the training history (web FitnessLevelNudge); applies on Save. */
function LevelNudge({
  suggestion,
  applied,
  onApply,
}: {
  suggestion: FitnessLevelSuggestionDto;
  applied: boolean;
  onApply: (level: FitnessLevel) => void;
}) {
  const t = useTranslations("settings.profileEditor.fitnessLevelNudge");
  const tl = useTranslations("settings.profileEditor.fitnessLevels");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const level = tl(suggestion.suggested);
  const reasons = suggestion.reasons
    .map((r) =>
      r.kind === "history"
        ? t("reasonHistory", { weeks: r.weeks })
        : r.kind === "completion"
          ? t("reasonCompletion", { rate: Math.round(r.rate * 100) })
          : t("reasonVolume", { sets: r.sets }),
    )
    .join(" · ");
  return (
    <View style={styles.nudge}>
      <View style={styles.nudgeHead}>
        <Ionicons name="trending-up" size={18} color={colors.primary} />
        <View style={styles.grow}>
          <AppText style={styles.nudgeTitle}>{t("title", { level })}</AppText>
          <AppText variant="small">{reasons}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("dismiss")} hitSlop={10} onPress={() => setDismissed(true)}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      {applied ? (
        <View style={styles.nudgeHead}>
          <Ionicons name="checkmark" size={16} color={colors.primary} />
          <AppText variant="small" style={styles.nudgeApplied}>
            {t("applyHint")}
          </AppText>
        </View>
      ) : (
        <Button label={t("applyAction", { level })} variant="secondary" onPress={() => onApply(suggestion.suggested)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  group: { gap: spacing.sm },
  groupLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  required: { color: colors.danger },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.1) },
  optionPressed: { backgroundColor: colors.cardPressed },
  optionLabel: { fontWeight: "600" },
  nudge: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.4),
    backgroundColor: withAlpha(colors.primary, 0.1),
  },
  nudgeHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  nudgeTitle: { color: colors.primary, fontWeight: "700" },
  nudgeApplied: { color: colors.primary, fontWeight: "600" },
});
