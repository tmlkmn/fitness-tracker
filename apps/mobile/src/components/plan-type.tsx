import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Plan type → mark colour + icon. The three that share a calendar (workout,
 * swimming, rest) were validated as a categorical set on the dark surface;
 * nutrition-only accounts have only nutrition days, so it can reuse a hue.
 * The icon carries identity too — never colour alone.
 */
export const PLAN_TYPE_STYLES: Record<string, { color: string; icon: IconName }> = {
  workout: { color: "#199e70", icon: "barbell" },
  swimming: { color: "#3987e5", icon: "water" },
  rest: { color: "#c98500", icon: "moon" },
  nutrition: { color: "#199e70", icon: "restaurant" },
};

export const PLAN_TYPES_SHOWN = ["workout", "swimming", "rest"] as const;

export function planTypeStyle(planType: string) {
  return PLAN_TYPE_STYLES[planType] ?? PLAN_TYPE_STYLES.workout;
}

export function PlanTypeIcon({ planType, size = 14, color }: { planType: string; size?: number; color?: string }) {
  const style = planTypeStyle(planType);
  return <Ionicons name={style.icon} size={size} color={color ?? style.color} />;
}
