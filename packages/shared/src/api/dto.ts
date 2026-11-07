// Response shapes of the v1 API as the client receives them, i.e. after JSON
// serialization: timestamps arrive as ISO strings, Postgres numerics as
// decimal strings. The web routes check their action results against these
// at compile time (`JsonSource` in apps/web/src/lib/api/handler.ts).
//
// Endpoints that return nothing answer 204 with an empty body.

import type { ApiErrorCode } from "./errors";

/** Decimal string from a Postgres numeric column, e.g. "12.50". */
export type DecimalString = string;

/** ISO-8601 timestamp, e.g. "2026-11-05T18:54:25.259Z". */
export type IsoDateTime = string;

/** Calendar date, `YYYY-MM-DD`. */
export type DateString = string;

export type PlanType = "workout" | "swimming" | "rest" | "nutrition";

/** Create endpoints. */
export interface IdDto {
  id: number;
}

// ── Plans / calendar ────────────────────────────────────────────────────────

export interface MacroTargetsDto {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type CarbCyclingLabel = "off" | "moderate" | "aggressive";

export interface WeeklyMacroTargetsDto {
  baseline: MacroTargetsDto;
  perDayType: Record<PlanType, MacroTargetsDto>;
  cyclingProfile: {
    enabled: boolean;
    workoutCarbMultiplier: number;
    swimmingCarbMultiplier: number;
    restCarbMultiplier: number;
    label: CarbCyclingLabel;
  };
}

/** GET /weeks, /weeks/[id], /weeks/by-number/[n] */
export interface WeeklyPlanDto {
  id: number;
  userId: string;
  weekNumber: number;
  title: string;
  phase: string;
  notes: string | null;
  supplements: unknown;
  startDate: DateString | null;
  macroTargetSnapshot: WeeklyMacroTargetsDto | null;
  createdAt: IsoDateTime | null;
}

/** GET /days/[dayId], /days/by-date/[date], /weeks/[id]/days */
export interface DailyPlanDto {
  id: number;
  weeklyPlanId: number | null;
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  date: DateString | null;
  createdAt: IsoDateTime | null;
}

/** GET /days/upcoming */
export type UpcomingDayDto = Omit<DailyPlanDto, "createdAt">;

/** GET /weeks/[id]/day-summaries */
export interface DailyPlanSummaryDto extends DailyPlanDto {
  exerciseCount: number;
  mealCount: number;
}

/** GET /calendar/week?date= — `weeklyPlan` is null when no week covers the date. */
export interface CalendarWeekDto {
  weeklyPlan: WeeklyPlanDto | null;
  dailyPlans: DailyPlanDto[];
}

/** GET /calendar/month?year=&month= */
export interface CalendarDayDto {
  date: DateString;
  planType: string;
}

/** GET /weeks/[id]/supplements */
export interface SupplementDto {
  id: number;
  weeklyPlanId: number | null;
  name: string;
  dosage: string;
  timing: string;
  notes: string | null;
  startWeek: number;
  presetKey: string | null;
  servingsPerDose: DecimalString | null;
  caloriesPerServing: number | null;
  proteinPerServing: DecimalString | null;
  carbsPerServing: DecimalString | null;
  fatPerServing: DecimalString | null;
  frequencyDays: unknown;
  dosesPerDay: number;
}

/** GET /dashboard/today — all empty when today has no plan. */
export interface TodayDashboardDto {
  dailyPlan: DailyPlanDto | null;
  meals: MealDto[];
  exercises: ExerciseDto[];
  weeklyPlan: WeeklyPlanDto | null;
}

export type MoveMode = "move" | "swap" | "replace";

/** POST /days/[dayId]/move */
export interface MoveDayContentsResultDto {
  movedExerciseCount: number;
  movedMealCount: number;
  deletedExerciseCount: number;
  deletedMealCount: number;
  sourceLabel: string;
  targetLabel: string;
  mode: MoveMode;
}

// ── Meals ───────────────────────────────────────────────────────────────────

/** GET /days/[dayId]/meals (array, ordered by mealTime). */
export interface MealDto {
  id: number;
  dailyPlanId: number | null;
  mealTime: string;
  /** Canonical TR label — display through `getLocalizedMealLabel()`. */
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
  /** Emoji override; null → fall back to the label-based icon. */
  icon: string | null;
  isCompleted: boolean | null;
  sortOrder: number;
}

/** GET /nutrition/weekly-totals?endDate= — the 7 days ending at endDate. */
export interface DailyMacroPointDto {
  date: DateString;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** GET /meals/recent?label=&excludeDayId= */
export interface RecentMealDto {
  date: DateString | null;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
}

/** GET /meals/frequent */
export interface FrequentMealDto {
  content: string;
  mealLabel: string;
  avgCalories: number;
  avgProtein: string;
  avgCarbs: string;
  avgFat: string;
  count: number;
}

export interface MealCandidateDto {
  source: "frequent" | "history" | "saved" | "daily-plan";
  id: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
  meta?: string;
}

export interface DailyPlanCandidateDto {
  source: "daily-plan";
  id: number;
  planType: string;
  userNote: string | null;
  meals: {
    mealTime: string;
    mealLabel: string;
    content: string;
    calories: number | null;
    proteinG: DecimalString | null;
    carbsG: DecimalString | null;
    fatG: DecimalString | null;
  }[];
  createdAt: IsoDateTime | null;
}

/** GET /meals/picker?q=&excludeDayId= */
export interface MealPickerDto {
  frequent: MealCandidateDto[];
  history: MealCandidateDto[];
  saved: MealCandidateDto[];
  dailyPlans: DailyPlanCandidateDto[];
}

/** GET /saved-meals?label= */
export interface SavedMealDto {
  id: number;
  userId: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
  createdAt: IsoDateTime | null;
}

/** GET /user-foods */
export interface UserFoodDto {
  id: number;
  userId: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
  category: string | null;
  createdAt: IsoDateTime;
}

/** GET /weeks/[id]/shopping-list */
export interface ShoppingItemDto {
  id: number;
  weeklyPlanId: number | null;
  category: string;
  itemName: string;
  quantity: string;
  notes: string | null;
  isPurchased: boolean | null;
  sortOrder: number;
  /** Meals this item came from — resolve with GET /meals/by-ids. */
  mealIds: number[] | null;
}

/** GET /meals/by-ids?ids= */
export interface MealRefDto {
  id: number;
  mealLabel: string;
  content: string;
  dayName: string;
}

// ── Exercises ───────────────────────────────────────────────────────────────

/** GET /days/[dayId]/exercises */
export interface ExerciseDto {
  id: number;
  dailyPlanId: number | null;
  section: string;
  sectionLabel: string;
  name: string;
  englishName: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
  isCompleted: boolean | null;
  sortOrder: number;
  intensity: string | null;
}

/** GET /days/[dayId]/exercises/previous-week */
export interface PreviousExerciseDto {
  section: string;
  sectionLabel: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

/** GET /exercise-library?q= */
export interface ExerciseLibraryEntryDto {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string[];
  images: string[];
}

/** GET /exercise-demos?name= */
export interface ExerciseDemoDto {
  found: boolean;
  gifUrl: string | null;
  videoUrl: string | null;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  instructions: string[];
  overview: string | null;
  tips: string[];
}

// ── Wellness ────────────────────────────────────────────────────────────────

/** GET /progress-logs, /progress-logs/latest */
export interface ProgressLogDto {
  id: number;
  userId: string;
  logDate: DateString;
  weight: DecimalString | null;
  fluidPercent: DecimalString | null;
  fluidKg: DecimalString | null;
  fatPercent: DecimalString | null;
  fatKg: DecimalString | null;
  bmi: DecimalString | null;
  leftArmFatPercent: DecimalString | null;
  leftArmFatKg: DecimalString | null;
  leftArmMusclePercent: DecimalString | null;
  leftArmMuscleKg: DecimalString | null;
  rightArmFatPercent: DecimalString | null;
  rightArmFatKg: DecimalString | null;
  rightArmMusclePercent: DecimalString | null;
  rightArmMuscleKg: DecimalString | null;
  torsoFatPercent: DecimalString | null;
  torsoFatKg: DecimalString | null;
  torsoMusclePercent: DecimalString | null;
  torsoMuscleKg: DecimalString | null;
  leftLegFatPercent: DecimalString | null;
  leftLegFatKg: DecimalString | null;
  leftLegMusclePercent: DecimalString | null;
  leftLegMuscleKg: DecimalString | null;
  rightLegFatPercent: DecimalString | null;
  rightLegFatKg: DecimalString | null;
  rightLegMusclePercent: DecimalString | null;
  rightLegMuscleKg: DecimalString | null;
  waistCm: DecimalString | null;
  rightArmCm: DecimalString | null;
  leftArmCm: DecimalString | null;
  rightLegCm: DecimalString | null;
  leftLegCm: DecimalString | null;
  notes: string | null;
  createdAt: IsoDateTime | null;
}

/** GET /progress-logs/count */
export interface CountDto {
  count: number;
}

/** GET /readiness/logs/[date], /readiness/logs/today */
export interface ReadinessLogDto {
  logDate: DateString;
  energyRating: number | null;
  painScore: number | null;
  notes: string | null;
  updatedAt: IsoDateTime;
}

export type ReadinessBand = "low" | "moderate" | "good" | "excellent";

/** GET /readiness/today */
export interface ReadinessDto {
  score: number;
  band: ReadinessBand;
  breakdown: {
    sleep: number;
    compliance: number;
    water: number;
    restBonus: number;
    subjective: number;
    trendPenalty: number;
  };
  hasSubjective: boolean;
  recommendationKey: ReadinessBand;
}

/** GET /readiness/7d-average */
export interface Readiness7dAverageDto {
  average: number | null;
  samples: number;
}

/** GET /readiness/scores?start=&end= */
export interface ReadinessDayScoreDto {
  logDate: DateString;
  score: number;
  band: ReadinessBand;
}

/** GET /sleep-logs, /sleep-logs/latest, /sleep-logs/by-date/[date] */
export interface SleepLogDto {
  id: number;
  userId: string;
  logDate: DateString;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number | null;
  quality: number | null;
  notes: string | null;
  createdAt: IsoDateTime | null;
}

/** GET /water, /water/today, /water/[date] */
export interface WaterLogDto {
  id: number;
  userId: string;
  logDate: DateString;
  glasses: number;
  targetGlasses: number;
  createdAt: IsoDateTime | null;
}

/** GET /water/[date]/target */
export interface WaterTargetDto {
  targetGlasses: number;
}

/** GET /days/[dayId]/supplements — with today's completion state. */
export interface DailySupplementDto {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  notes: string | null;
  presetKey: string | null;
  servingsPerDose: DecimalString | null;
  caloriesPerServing: number | null;
  proteinPerServing: DecimalString | null;
  carbsPerServing: DecimalString | null;
  fatPerServing: DecimalString | null;
  isCompleted: boolean;
}

export type DeloadReasonCode =
  | "cadence"
  | "sleep_quality"
  | "sleep_duration"
  | "completion"
  | "low_readiness"
  | "fresh_start"
  | "just_deloaded";

/** GET /deload?date= */
export interface DeloadRecommendationDto {
  recommended: boolean;
  severity: "hard" | "soft" | "none";
  reasons: DeloadReasonCode[];
  consecutiveTrainingWeeks: number;
  cadence: number;
  readiness7d: { average: number | null; samples: number; series: number[] };
}

export type FitnessLevel = "beginner" | "returning" | "intermediate" | "advanced";

/** GET /me/fitness-level-suggestion (null when there's nothing to suggest). */
export interface FitnessLevelSuggestionDto {
  suggested: FitnessLevel;
  declared: FitnessLevel | null;
  reasons: (
    | { kind: "history"; weeks: number }
    | { kind: "completion"; rate: number }
    | { kind: "volume"; sets: number }
  )[];
  metrics: {
    historyWeeks: number;
    completionRate: number | null;
    avgWeeklySets: number | null;
  };
  confidence: "medium" | "high";
}

/** GET /me/activity-stats */
export interface ActivityStatsDto {
  currentStreak: number;
  longestStreak: number;
  /** Keyed by `YYYY-MM-DD`. */
  completionMap: Record<string, "full" | "partial" | "none">;
  totalCompletedDays: number;
  totalWorkouts: number;
  totalMeals: number;
  firstCompletedDate: DateString | null;
  programStartDate: DateString | null;
}

/** GET /friends/streaks */
export interface FriendStreakDto {
  userId: string;
  name: string;
  currentStreak: number;
  longestStreak: number;
  isMe: boolean;
}

// ── Profile / settings ──────────────────────────────────────────────────────

/** GET /me/profile */
export interface UserProfileDto {
  weight: DecimalString | null;
  targetWeight: DecimalString | null;
  height: number | null;
  age: number | null;
  healthNotes: string | null;
  /** JSON-encoded string array, e.g. `["Yok"]`. */
  foodAllergens: string | null;
  dailyRoutine: unknown;
  weekendRoutine: unknown;
  supplementSchedule: unknown;
  fitnessLevel: string | null;
  fitnessGoal: string | null;
  sportHistory: string | null;
  currentMedications: string | null;
  serviceType: string | null;
  membershipType: string | null;
  membershipStartDate: IsoDateTime | null;
  membershipEndDate: IsoDateTime | null;
  hasSeenOnboarding: boolean | null;
  targetCalories: number | null;
  targetProteinG: DecimalString | null;
  targetCarbsG: DecimalString | null;
  targetFatG: DecimalString | null;
  targetCalorieDelta: number | null;
  targetProteinPerKg: DecimalString | null;
  targetFatPct: DecimalString | null;
  weightUnit: string | null;
  energyUnit: string | null;
  gender: string | null;
  dailyActivityLevel: string | null;
  hasEatingDisorderHistory: boolean | null;
  isPregnantOrBreastfeeding: boolean | null;
  hasDiabetes: boolean | null;
  hasThyroidCondition: boolean | null;
}

/** GET /me/macro-targets/for-day?planType= */
export interface MacroTargetsForDayDto {
  targets: MacroTargetsDto | null;
  cyclingLabel: CarbCyclingLabel;
  planType: string | null;
}

/**
 * GET / PUT /me/consents — when each KVKK consent was given (ISO), null when
 * never given or withdrawn. Check them with `@fitmusc/shared/consent`.
 */
export interface ConsentsDto {
  dataConsentAt: string | null;
  aiConsentAt: string | null;
}

/** PUT /me/locale */
export interface LocaleResultDto {
  success: boolean;
  locale: "tr" | "en";
}

/** GET /me/notification-preferences — defaults (no id) until first saved. */
export interface NotificationPreferencesDto {
  id?: number;
  userId?: string;
  inAppEnabled: boolean | null;
  emailEnabled: boolean | null;
  pushEnabled: boolean | null;
  defaultWorkoutTime: string | null;
  timezone: string | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  weekStartsOn: string | null;
  createdAt?: IsoDateTime | null;
}

/** GET /reminders */
export interface ReminderDto {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  templateKey: string | null;
  time: string | null;
  minutesBefore: number | null;
  recurrence: string;
  intervalMinutes: number | null;
  intervalStart: string | null;
  intervalEnd: string | null;
  daysOfWeek: unknown;
  onceDate: DateString | null;
  isEnabled: boolean;
  skipEmail: boolean | null;
  lastFiredAt: IsoDateTime | null;
  createdAt: IsoDateTime | null;
}

// ── Sharing ─────────────────────────────────────────────────────────────────

/** GET /weeks/[id]/shares — who the owner shared this week with. */
export interface PlanShareDto {
  id: number;
  sharedWithUserId: string;
  sharedWithName: string;
  sharedWithEmail: string;
  createdAt: IsoDateTime | null;
}

/** GET /shared-with-me */
export interface SharedWithMeDto {
  shareId: number;
  weeklyPlanId: number;
  weekNumber: number;
  title: string;
  phase: string;
  startDate: DateString | null;
  ownerName: string;
  ownerEmail: string;
}

/**
 * GET /shareable-users — people the user has shared a plan with before (for
 * one-tap sharing). Never the whole user list; others are shared with by e-mail.
 */
export interface ShareableUserDto {
  id: string;
  name: string;
  email: string;
}

/** GET /shared/weeks/[id] */
export interface SharedWeeklyPlanDto {
  id: number;
  weekNumber: number;
  title: string;
  phase: string;
  notes: string | null;
  startDate: DateString | null;
  ownerName: string;
}

/** GET /shared/days/[dayId] */
export type SharedDailyPlanDto = Omit<DailyPlanDto, "createdAt">;

// ── Notifications / search ──────────────────────────────────────────────────

/** GET /notifications */
export interface NotificationDto {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string;
  /** Web path (e.g. "/tr/paylasilan") — map to a mobile screen. */
  link: string | null;
  isRead: boolean | null;
  metadata: unknown;
  createdAt: IsoDateTime | null;
}

/** GET /search?q= */
export interface SearchResultsDto {
  days: { id: number; date: DateString | null; dayName: string; planType: string; workoutTitle: string | null }[];
  meals: { id: number; content: string; mealLabel: string; dailyPlanId: number | null; date: DateString | null }[];
  exercises: { id: number; name: string; dailyPlanId: number | null; date: DateString | null }[];
  foods: { id: number; name: string; portion: string; calories: number }[];
}

// ── Push (Expo) ─────────────────────────────────────────────────────────────

/**
 * `data` of every Expo push the server sends. `url` is the web path of the
 * target page (e.g. "/tr/paylasilan") and `tag` the notification type — map
 * them to a screen.
 */
export interface PushDataDto {
  url: string | null;
  tag: string | null;
  /** Set on `tag: "ai-job"` pushes — the finished job to open (GET /ai/jobs/[id]). */
  jobId?: string;
}

/** POST /push/test */
export interface PushTestResultDto {
  /** Devices of this account the test was sent to (0 → nothing registered). */
  devices: number;
}

// ── AI ──────────────────────────────────────────────────────────────────────

/** Features with a daily AI quota, as GET /ai/quota reports them. */
export type AiQuotaFeature =
  | "meal"
  | "exercise"
  | "analyze"
  | "chat"
  | "workout"
  | "daily-meal"
  | "weekly"
  | "exercise-demo"
  | "target-weight"
  | "macro-ai";

/** GET /ai/quota — resets at midnight Europe/Istanbul. */
export type AiQuotaDto = Record<AiQuotaFeature, { remaining: number; limit: number }>;

/** GET /ai/greeting — one message per day, cached server-side. */
export interface DailyGreetingDto {
  message: string;
  firstName: string;
  cached: boolean;
}

/** A suggested meal; send it back unchanged (or a subset) to apply it. */
export interface AiMealDto {
  mealTime: string;
  /** Canonical TR label — display through getLocalizedMealLabel. */
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: DecimalString | null;
  carbsG: DecimalString | null;
  fatG: DecimalString | null;
}

export interface AiExerciseDto {
  name: string;
  englishName: string | null;
  section: string;
  sectionLabel: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
  intensity?: "low" | "moderate" | "high" | null;
}

export type AiExerciseVariationDto = Omit<AiExerciseDto, "section" | "sectionLabel" | "intensity">;

/** POST /ai/meal-variation */
export interface MealVariationResultDto {
  suggestions: {
    content: string;
    calories: number | null;
    proteinG: DecimalString | null;
    carbsG: DecimalString | null;
    fatG: DecimalString | null;
  }[];
  validationWarnings: string[];
}

/** POST /ai/exercise-tips — markdown text. */
export interface ExerciseTipsDto {
  tips: string;
}

/** POST /ai/exercise-variation — up to 3 alternatives. */
export interface ExerciseVariationResultDto {
  currentExercise: ExerciseDto;
  alternatives: AiExerciseVariationDto[];
  /** Served from the 30-day cache (no quota used). */
  fromCache: boolean;
}

/** POST /ai/workout-section */
export interface SectionReplacementResultDto {
  currentExercises: ExerciseDto[];
  suggestedExercises: AiExerciseDto[];
}

export interface AiWeeklyDayDto {
  /** 0 = Monday … 6 = Sunday */
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  meals: AiMealDto[];
  exercises: AiExerciseDto[];
}

export interface AiWeeklyPlanDto {
  weekTitle: string;
  phase: string;
  notes: string | null;
  strategyNote: string | null;
  days: AiWeeklyDayDto[];
  macroTargetSnapshot?: WeeklyMacroTargetsDto | null;
}

/** `result` of a finished "daily-meals" job. */
export interface DailyMealsJobResultDto {
  suggestedMeals: AiMealDto[];
  currentMeals: AiMealDto[];
  validationWarnings: string[];
}

/** `result` of a finished "workout" job (a section job: that section's exercises only). */
export interface WorkoutJobResultDto {
  currentExercises: ExerciseDto[];
  suggestedExercises: AiExerciseDto[];
  validationWarnings: string[];
}

/** `result` of a finished "weekly" job (also kept under GET /ai/weekly-suggestions). */
export interface WeeklyJobResultDto {
  suggestedPlan: AiWeeklyPlanDto;
}

export type AiJobLegStatus = "pending" | "active" | "retrying" | "done";

/** `progress` of a running "weekly" job — each leg advances independently. */
export interface WeeklyJobProgressDto {
  phase: "profile" | "generating" | "merging";
  workout: AiJobLegStatus;
  nutrition: AiJobLegStatus;
}

export type AiJobKind = "daily-meals" | "workout" | "weekly";
export type AiJobStatus = "queued" | "running" | "succeeded" | "failed";

/** `input` of a "daily-meals" / "workout" job — the POST /ai/jobs body without `kind`. */
export interface DailyPlanJobInputDto {
  dailyPlanId: number;
  userNote?: string;
}

/** `input` of a "workout" job; `section` set → only that section was regenerated. */
export interface WorkoutJobInputDto extends DailyPlanJobInputDto {
  section?: string;
  sectionLabel?: string;
}

/** `input` of a "weekly" job — the POST /ai/jobs body without `kind`. */
export interface WeeklyJobInputDto {
  dateStr: DateString;
  userNote?: string;
  generateMode?: "both" | "nutrition" | "workout";
  /** "0" = Monday … "6" = Sunday */
  dayModes?: Record<string, PlanType>;
  pastDows?: number[];
  deloadWeek?: boolean;
}

interface AiJobBase {
  id: string;
  status: AiJobStatus;
  /** Set when `status` is "failed": AI_UNAVAILABLE, AI_EMPTY_RESPONSE, JOB_TIMEOUT, … */
  error: ApiErrorCode | null;
  createdAt: IsoDateTime;
  finishedAt: IsoDateTime | null;
}

/**
 * GET /ai/jobs — newest first, without results. `input` says which day/week a
 * job belongs to, so the app can apply a result it lost track of (after a
 * restart or a push tap).
 */
export type AiJobSummaryDto =
  | (AiJobBase & { kind: "daily-meals"; input: DailyPlanJobInputDto })
  | (AiJobBase & { kind: "workout"; input: WorkoutJobInputDto })
  | (AiJobBase & { kind: "weekly"; input: WeeklyJobInputDto });

/**
 * POST /ai/jobs (202) and GET /ai/jobs/[id]. Poll until `status` is
 * "succeeded" or "failed" (a push with `tag: "ai-job"` also arrives), then
 * apply the result through the matching /ai/…/apply endpoint.
 */
export type AiJobDto =
  | (AiJobBase & {
      kind: "daily-meals";
      input: DailyPlanJobInputDto;
      progress: null;
      result: DailyMealsJobResultDto | null;
    })
  | (AiJobBase & {
      kind: "workout";
      input: WorkoutJobInputDto;
      progress: null;
      result: WorkoutJobResultDto | null;
    })
  | (AiJobBase & {
      kind: "weekly";
      input: WeeklyJobInputDto;
      progress: WeeklyJobProgressDto | null;
      result: WeeklyJobResultDto | null;
    });

/** POST /ai/macro-targets — `strategy` is what PUT /me/macro-strategy saves. */
export interface AiMacroResultDto {
  strategy: { calorieDelta: number; proteinPerKgBW: number; fatPct: number };
  macros: MacroTargetsDto;
  explanation: string;
}

/** POST /ai/target-weight */
export interface TargetWeightSuggestionDto {
  targetWeight: number;
  reasoning: string;
  timelineWeeks: number;
}

/** GET /ai/chat/history — oldest first. */
export interface ChatMessageDto {
  id: number;
  role: string;
  content: string;
  createdAt: IsoDateTime;
}

/** GET /ai/daily-meal-suggestions */
export interface SavedDailyMealSuggestionDto {
  id: number;
  planType: string;
  userNote: string | null;
  meals: AiMealDto[];
  createdAt: IsoDateTime;
}

/** GET /ai/weekly-suggestions — generated weekly plans of this and future weeks. */
export interface SavedWeeklySuggestionDto {
  id: number;
  title: string;
  phase: string;
  userNote: string | null;
  originalDate: DateString | null;
  createdAt: IsoDateTime;
}

/** GET /ai/weekly-suggestions/[id] */
export interface SavedWeeklySuggestionDetailDto {
  id: number;
  title: string;
  phase: string;
  userNote: string | null;
  plan: AiWeeklyPlanDto;
}
