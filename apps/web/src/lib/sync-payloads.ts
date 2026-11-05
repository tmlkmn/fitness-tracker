// Shared types + lightweight validators for the offline write queue.
// Used by both the client outbox and the /api/sync/* route handlers.

export type MealTogglePayload = {
  id: number;
  isCompleted: boolean;
};

export type ExerciseTogglePayload = {
  id: number;
  isCompleted: boolean;
};

export type SupplementTogglePayload = {
  supplementId: number;
  date: string;
  completed: boolean;
};

export type OutboxKind = "meal" | "exercise" | "supplement";

export type OutboxPayloadByKind = {
  meal: MealTogglePayload;
  exercise: ExerciseTogglePayload;
  supplement: SupplementTogglePayload;
};

export const SYNC_ENDPOINTS: Record<OutboxKind, string> = {
  meal: "/api/sync/meal-toggle",
  exercise: "/api/sync/exercise-toggle",
  supplement: "/api/sync/supplement-toggle",
};

export function isMealTogglePayload(v: unknown): v is MealTogglePayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    Number.isInteger(o.id) &&
    o.id > 0 &&
    typeof o.isCompleted === "boolean"
  );
}

export function isExerciseTogglePayload(
  v: unknown,
): v is ExerciseTogglePayload {
  return isMealTogglePayload(v);
}

export function isSupplementTogglePayload(
  v: unknown,
): v is SupplementTogglePayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.supplementId === "number" &&
    Number.isInteger(o.supplementId) &&
    o.supplementId > 0 &&
    typeof o.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    typeof o.completed === "boolean"
  );
}
