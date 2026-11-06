import Ionicons from "@expo/vector-icons/Ionicons";
import type { AiJobDto, AiJobKind, AiJobSummaryDto, AiQuotaFeature, UserProfileDto } from "@fitmusc/shared/api/dto";
import { formatDate } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { isActiveJob, useJobBanner, useQuota } from "@/hooks/ai";
import { useAiConsent, useRequireAiConsent } from "@/hooks/ai-consent";
import { useProgressLogs } from "@/hooks/wellness";
import { colors, radius, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

import { Input } from "./form";
import { AppText, Button, Card, Chip } from "./ui";

// ── Quota ────────────────────────────────────────────────────────────────────

const ISTANBUL_OFFSET_MS = 3 * 3_600_000;

/** Quotas reset at midnight Europe/Istanbul (UTC+3, no DST) — same as the server. */
function msUntilQuotaReset(now = Date.now()): number {
  const local = new Date(now + ISTANBUL_OFFSET_MS);
  const nextMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - ISTANBUL_OFFSET_MS;
  return Math.max(0, nextMidnight - now);
}

export function useResetCountdown(active: boolean) {
  const t = useTranslations("mobile.ai");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [active]);
  const minutes = Math.floor(msUntilQuotaReset(now) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("countdownHours", { h, m }) : t("countdownMinutes", { m });
}

/** "3/10" pill; once used up, the time until the midnight reset. */
export function QuotaBadge({ feature }: { feature: AiQuotaFeature }) {
  const t = useTranslations("assistant.quotaBadge");
  const quota = useQuota(feature);
  const empty = quota != null && quota.remaining <= 0;
  const countdown = useResetCountdown(empty);
  if (!quota) return null;
  return (
    <View style={[styles.badge, empty && styles.badgeEmpty]}>
      <Ionicons name="sparkles" size={10} color={empty ? colors.danger : colors.textMuted} />
      <Text style={[styles.badgeText, empty && { color: colors.danger }]}>
        {empty ? t("expiredLabel", { countdown }) : t("remainingLabel", { remaining: quota.remaining, limit: quota.limit })}
      </Text>
    </View>
  );
}

/** The primary "ask the AI" button: sparkles + label + the feature's remaining quota. */
export function AiButton({
  label,
  feature,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  feature?: AiQuotaFeature;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const quota = useQuota(feature ?? "meal");
  const requireConsent = useRequireAiConsent();
  const exhausted = feature != null && quota != null && quota.remaining <= 0;
  const inactive = disabled || loading || exhausted;
  const primary = variant === "primary";
  const fg = primary ? colors.primaryText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      // Nothing reaches the AI provider before the user allowed it.
      onPress={() => requireConsent(onPress)}
      style={({ pressed }) => [
        styles.aiButton,
        primary ? styles.aiButtonPrimary : styles.aiButtonSecondary,
        pressed && !inactive && { opacity: 0.8 },
        inactive && { opacity: 0.5 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Ionicons name="sparkles" size={16} color={primary ? fg : colors.primary} />}
      <Text style={[styles.aiButtonLabel, { color: fg }]}>{label}</Text>
      {feature ? <QuotaBadge feature={feature} /> : null}
    </Pressable>
  );
}

/** Small round icon button that opens an AI flow from a list row. */
export function AiIconButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
    </Pressable>
  );
}

// ── Banners ──────────────────────────────────────────────────────────────────

/**
 * "Your plan is being prepared / is ready / failed" for the newest matching
 * job (useJobBanner) — tapping it opens the job.
 */
export function JobBanner({ kind, belongs }: { kind: AiJobKind; belongs: (job: AiJobSummaryDto) => boolean }) {
  const t = useTranslations("mobile.ai");
  const router = useRouter();
  const job = useJobBanner(kind, belongs);
  if (!job) return null;
  const running = isActiveJob(job);
  const failed = job.status === "failed";
  let text = t("bannerReady");
  if (running) text = t("bannerRunning");
  else if (failed) text = t("bannerFailed");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/ai/job/[jobId]", params: { jobId: job.id } })}
      style={({ pressed }) => [styles.jobBanner, failed && styles.jobBannerFailed, pressed && { opacity: 0.8 }]}
    >
      {running ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name={failed ? "alert-circle-outline" : "sparkles"} size={16} color={failed ? colors.danger : colors.primary} />
      )}
      <Text style={[styles.jobBannerText, failed && { color: colors.danger }]}>{text}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/** Web MonthGateWarning: plan this month's empty weeks before asking for the next month. */
export function MonthGateNotice({ emptyWeekCount }: { emptyWeekCount: number }) {
  const t = useTranslations("assistant.monthGate");
  const locale = useLocale() as Locale;
  const month = formatDate(new Date(), locale, { month: "long", timeZone: "Europe/Istanbul" });
  return (
    <View style={styles.monthGate}>
      <Ionicons name="lock-closed" size={14} color={colors.warning} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.monthGateTitle}>{t("title", { month })}</Text>
        <AppText variant="small">{t("body", { month, count: emptyWeekCount })}</AppText>
      </View>
    </View>
  );
}

// ── Profile completeness ─────────────────────────────────────────────────────

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

/** Keys of the profile fields the web requires before a weekly plan or a section swap. */
export function missingProfileFields(profile: UserProfileDto): string[] {
  return REQUIRED_PROFILE.filter((f) => f.missing(profile)).map((f) => f.key);
}

/** Web ProfileMissingWarning — the fields to fill in (on the web) first. */
export function ProfileMissing({ missing }: { missing: string[] }) {
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

// ── Notes & disclaimers ──────────────────────────────────────────────────────

/**
 * Under every AI result: the medical disclaimer and a way to report the
 * output (Google Play's AI-generated content policy). `reportContext` — the
 * generated text, or what identifies it — goes along with the report.
 */
export function AiDisclaimer({ reportContext }: { reportContext?: string }) {
  const t = useTranslations("disclaimer");
  const tr = useTranslations("mobile.aiReport");
  const locale = useLocale() as Locale;
  const router = useRouter();
  return (
    <View style={styles.disclaimer}>
      <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
      <AppText variant="small" style={{ flex: 1 }}>
        {t("ai")}{" "}
        <Text style={styles.link} onPress={() => void openWebPage("disclaimer", locale)}>
          {t("moreInfo")} →
        </Text>
        {"  "}
        <Text
          style={styles.link}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/ai/report", params: reportContext ? { context: reportContext.slice(0, 1500) } : {} })}
        >
          {tr("link")}
        </Text>
      </AppText>
    </View>
  );
}

/** In place of an AI feature that starts by itself (tips, …) until the user allows sharing data with the AI provider. */
export function AiConsentCard() {
  const t = useTranslations("mobile.aiConsent");
  const locale = useLocale() as Locale;
  const { set } = useAiConsent();
  return (
    <Card>
      <AppText variant="heading">{t("title")}</AppText>
      <AppText variant="muted">{t("body")}</AppText>
      <Button label={t("allow")} onPress={() => void set(true)} />
      <Button label={t("privacy")} variant="ghost" onPress={() => void openWebPage("privacy", locale)} />
    </Card>
  );
}

/** Shown before a plan generation while there is no measurement yet (web: MeasurementNudge). */
export function MeasurementNudge() {
  const t = useTranslations("assistant.measurementNudge");
  const router = useRouter();
  const logs = useProgressLogs();
  if (!logs.data || logs.data.length > 0) return null;
  return (
    <View style={styles.nudge}>
      <Ionicons name="body-outline" size={18} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontWeight: "600", fontSize: 14 }}>{t("title")}</AppText>
        <AppText variant="small">{t("body")}</AppText>
        <Text style={[styles.link, { color: colors.primary }]} onPress={() => router.push("/progress-log")}>
          {t("link")} →
        </Text>
      </View>
    </View>
  );
}

/** Validator notes the server already filtered for users — they never block applying. */
export function Warnings({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.warnings}>
      <Text style={styles.warningsTitle}>{title}</Text>
      {items.map((item, i) => (
        <AppText key={i} variant="small">
          • {item}
        </AppText>
      ))}
    </View>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const NOTE_MAX = 500;

/** Free-text request for the model, with a character counter (web: AiNoteTextarea). */
export function NoteInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <AppText variant="small">{label}</AppText> : null}
      <Input value={value} onChangeText={(v) => onChange(v.slice(0, NOTE_MAX))} placeholder={placeholder} multiline maxLength={NOTE_MAX} />
      <AppText variant="small" style={{ textAlign: "right" }}>
        {value.length}/{NOTE_MAX}
      </AppText>
    </View>
  );
}

/**
 * AI grams may carry 3 decimals ("35.125"); the meal and saved-meal schemas
 * take `decimalString` (≤ 9999.99, 2 decimals). Rounds onto that.
 */
export function toMealGrams(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(Math.min(Math.round(n * 100) / 100, 9999.99));
}

/** Joins prompt parts the way the web does (apps/web/src/lib/ai-user-note.ts). */
export function buildAiUserNote(parts: (string | null | undefined)[]): string | undefined {
  const cleaned = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(". ") : undefined;
}

export function MultiChips({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <Chip
            key={option.value}
            label={option.label}
            selected={on}
            onPress={() => onChange(on ? selected.filter((v) => v !== option.value) : [...selected, option.value])}
          />
        );
      })}
    </View>
  );
}

// ── Training location (gym / home + equipment) ───────────────────────────────

/** Canonical keys of `workout.aiModal.equipment` (same list as the web). */
export const EQUIPMENT_OPTIONS = [
  "Dumbbell",
  "Barbell",
  "Direnç bandı",
  "Pull-up bar",
  "Kettlebell",
  "TRX",
  "Yoga matı",
  "Bench",
  "Hiçbiri (vücut ağırlığı)",
] as const;

export interface WorkoutPrefs {
  location: "gym" | "home";
  equipment: string[];
}

const PREFS_KEY = "workout-prefs";

function loadPrefs(): WorkoutPrefs {
  try {
    const parsed = JSON.parse(SecureStore.getItem(PREFS_KEY) ?? "null") as Partial<WorkoutPrefs> | null;
    const known = new Set<string>(EQUIPMENT_OPTIONS);
    return {
      location: parsed?.location === "home" ? "home" : "gym",
      equipment: Array.isArray(parsed?.equipment) ? parsed.equipment.filter((e) => known.has(e)) : [],
    };
  } catch {
    return { location: "gym", equipment: [] };
  }
}

/** Remembered between sessions, like the web's localStorage prefs. */
export function useWorkoutPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const update = (next: WorkoutPrefs) => {
    setPrefs(next);
    void SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  };
  return [prefs, update] as const;
}

/** The prompt sentence for the chosen location (web: workout.aiModal.locationGymPrompt / …HomePromptPrefix). */
export function useLocationNote() {
  const t = useTranslations("workout.aiModal");
  return (prefs: WorkoutPrefs) => {
    if (prefs.location === "gym") return t("locationGymPrompt");
    const list = prefs.equipment.length > 0 ? prefs.equipment.map((e) => t(`equipment.${e}`)).join(", ") : t("bodyweight");
    return `${t("locationHomePromptPrefix")} ${list}`;
  };
}

export function LocationPicker({ prefs, onChange }: { prefs: WorkoutPrefs; onChange: (prefs: WorkoutPrefs) => void }) {
  const t = useTranslations("workout.aiModal");
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="small">{t("trainingLocation")}</AppText>
      <View style={styles.chips}>
        <Chip label={`🏋️ ${t("gym")}`} selected={prefs.location === "gym"} onPress={() => onChange({ ...prefs, location: "gym" })} />
        <Chip label={`🏠 ${t("home")}`} selected={prefs.location === "home"} onPress={() => onChange({ ...prefs, location: "home" })} />
      </View>
      {prefs.location === "home" ? (
        <>
          <AppText variant="small">{t("availableEquipment")}</AppText>
          <MultiChips
            options={EQUIPMENT_OPTIONS.map((value) => ({ value, label: t(`equipment.${value}`) }))}
            selected={prefs.equipment}
            onChange={(equipment) => onChange({ ...prefs, equipment })}
          />
        </>
      ) : null}
    </View>
  );
}

// ── Job progress ─────────────────────────────────────────────────────────────

type StepStatus = "done" | "active" | "pending";

function Step({ label, status, detail }: { label: string; status: StepStatus; detail?: string }) {
  return (
    <View style={styles.step}>
      {status === "active" ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={status === "done" ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={status === "done" ? colors.primary : colors.border}
        />
      )}
      <View style={{ flex: 1 }}>
        <AppText style={status === "pending" && { color: colors.textMuted }}>{label}</AppText>
        {detail ? <AppText variant="small">{detail}</AppText> : null}
      </View>
    </View>
  );
}

function useElapsed(since: string) {
  const t = useTranslations("assistant.generating");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? t("elapsedMin", { minutes, seconds }) : t("elapsedSec", { seconds });
}

function useJobSteps(job: AiJobDto): { title: string; steps: { label: string; status: StepStatus; detail?: string }[] } {
  const tm = useTranslations("meals.aiModal");
  const tw = useTranslations("workout.aiModal");
  const tc = useTranslations("calendar.aiWeekly");
  const started = job.status === "running";

  if (job.kind !== "weekly") {
    const t = job.kind === "daily-meals" ? tm : tw;
    return {
      title: t("overlayTitle"),
      steps: [
        { label: t("stepProfile"), status: started ? "done" : "active" },
        { label: t("stepPlan"), status: started ? "active" : "pending" },
      ],
    };
  }

  // Same rows as the web overlay: profile → health → workout → nutrition, each leg on its own.
  const mode = job.input.generateMode ?? "both";
  const progress = job.progress ?? { phase: "profile", workout: "pending", nutrition: "pending" };
  const profileDone = progress.phase !== "profile";
  const leg = (loading: string, done: string, status: "pending" | "active" | "retrying" | "done") => {
    if (status === "done") return { label: done, status: "done" as const };
    if (status === "retrying") return { label: loading, status: "active" as const, detail: tc("overlayRetrying") };
    if (status === "active") return { label: loading, status: "active" as const };
    return { label: done, status: "pending" as const };
  };
  const steps = [
    { label: tc("overlayProfile"), status: profileDone ? ("done" as const) : ("active" as const) },
    { label: tc("overlayHealth"), status: profileDone ? ("done" as const) : ("pending" as const) },
  ];
  if (mode !== "nutrition") steps.push(leg(tc("overlayWorkoutLoading"), tc("overlayWorkout"), progress.workout));
  if (mode !== "workout") steps.push(leg(tc("overlayNutritionLoading"), tc("overlayNutrition"), progress.nutrition));
  const title =
    mode === "nutrition" ? tc("overlayTitleNutrition") : mode === "workout" ? tc("overlayTitleWorkout") : tc("overlayTitleBoth");
  return { title, steps };
}

/** A queued / running job: the web overlay's steps, elapsed time, and that it keeps going in the background. */
export function JobProgress({ job }: { job: AiJobDto }) {
  const t = useTranslations("mobile.ai");
  const elapsed = useElapsed(job.createdAt);
  const { title, steps } = useJobSteps(job);
  return (
    <Card>
      <View style={styles.progressHead}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <AppText variant="heading" style={{ flex: 1 }}>
          {title}
        </AppText>
        <AppText variant="small">{elapsed}</AppText>
      </View>
      {steps.map((step) => (
        <Step key={step.label} {...step} />
      ))}
      <AppText variant="muted">{t("backgroundHint")}</AppText>
    </Card>
  );
}

// ── Display helpers ──────────────────────────────────────────────────────────

/** "520 kcal · P 32g · C 50g · F 18g" for a meal-like record. */
export function useMacroLine() {
  const t = useTranslations("meals.macroSummary");
  return (m: { calories: number | null; proteinG: string | null; carbsG: string | null; fatG: string | null }) =>
    [
      m.calories != null ? `${m.calories} kcal` : null,
      m.proteinG ? `${t("protein")} ${Math.round(Number(m.proteinG))}g` : null,
      m.carbsG ? `${t("carbs")} ${Math.round(Number(m.carbsG))}g` : null,
      m.fatG ? `${t("fat")} ${Math.round(Number(m.fatG))}g` : null,
    ]
      .filter(Boolean)
      .join(" · ");
}

/** Muted panel for "current" content, primary-tinted for the suggestion. */
export function Panel({
  title,
  right,
  tone = "muted",
  children,
}: {
  title: string;
  right?: string;
  tone?: "muted" | "suggested";
  children: ReactNode;
}) {
  return (
    <View style={[styles.panel, tone === "suggested" && styles.panelSuggested]}>
      <View style={styles.panelHead}>
        <Text style={[styles.panelTitle, tone === "suggested" && { color: colors.primary }]}>{title}</Text>
        {right ? <AppText variant="small">{right}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

// ── Minimal markdown (headings, lists, bold / italic / code, rules) ──────────

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_RE).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <Text key={i} style={{ fontWeight: "700" }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <Text key={i} style={styles.code}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
          if (part.length > 2) {
            return (
              <Text key={i} style={{ fontStyle: "italic", color: colors.textMuted }}>
                {part.slice(1, -1)}
              </Text>
            );
          }
        }
        return <Text key={i}>{part}</Text>;
      })}
    </>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "item"; marker: string; text: string }
  | { type: "rule" }
  | { type: "paragraph"; text: string };

function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    // Lines are trimmed, so one whitespace after the marker is enough (and can't backtrack).
    const heading = /^(#{1,6})\s(.*)$/.exec(line);
    const bullet = /^[-*•]\s(.*)$/.exec(line);
    const numbered = /^(\d{1,3})[.)]\s(.*)$/.exec(line);
    if (!line) flush();
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      blocks.push({ type: "rule" });
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
    } else if (bullet) {
      flush();
      blocks.push({ type: "item", marker: "•", text: bullet[1].trim() });
    } else if (numbered) {
      flush();
      blocks.push({ type: "item", marker: `${numbered[1]}.`, text: numbered[2].trim() });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Renders the coach's / tips' markdown like the web's ReactMarkdown styles. */
export function Markdown({ children }: { children: string }) {
  const blocks = parseMarkdown(children);
  return (
    <View style={{ gap: spacing.sm }}>
      {blocks.map((block, i) => {
        if (block.type === "rule") return <View key={i} style={styles.rule} />;
        if (block.type === "heading") {
          return (
            <Text key={i} style={[styles.mdText, styles.mdHeading, block.level >= 3 && { fontWeight: "600" }]}>
              <Inline text={block.text} />
            </Text>
          );
        }
        if (block.type === "item") {
          return (
            <View key={i} style={styles.mdItem}>
              <Text style={[styles.mdText, { color: colors.primary }]}>{block.marker}</Text>
              <Text style={[styles.mdText, { flex: 1 }]}>
                <Inline text={block.text} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.mdText}>
            <Inline text={block.text} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  badgeEmpty: { borderColor: colors.dangerBg },
  badgeText: { fontSize: 11, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  aiButton: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  aiButtonPrimary: { backgroundColor: colors.primary },
  aiButtonSecondary: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  aiButtonLabel: { fontSize: 16, fontWeight: "600" },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  disclaimer: { flexDirection: "row", gap: spacing.xs, alignItems: "flex-start" },
  jobBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34, 197, 94, 0.35)",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  jobBannerFailed: { borderColor: colors.dangerBg, backgroundColor: "rgba(127, 29, 29, 0.25)" },
  jobBannerText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "500" },
  monthGate: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245, 158, 11, 0.35)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  monthGateTitle: { color: colors.warning, fontSize: 13, fontWeight: "600" },
  nudge: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34, 197, 94, 0.35)",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
  },
  link: { color: colors.text, textDecorationLine: "underline" },
  warnings: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245, 158, 11, 0.35)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  warningsTitle: { color: colors.warning, fontSize: 12, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dangerBg,
    backgroundColor: "rgba(127, 29, 29, 0.25)",
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 28 },
  progressHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  panel: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.cardPressed },
  panelSuggested: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  code: { fontFamily: "monospace", fontSize: 13, backgroundColor: colors.background },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  mdText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  mdHeading: { fontWeight: "700", color: colors.primary, marginTop: spacing.xs },
  mdItem: { flexDirection: "row", gap: spacing.sm, paddingLeft: spacing.xs },
});
