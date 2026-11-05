import type { BillingUserFields } from "@/lib/billing/entitlement";
import { getEntitlement } from "@/lib/billing/entitlement";
import { TIER_CONFIG } from "@/lib/billing/tier-config";

// Features that are conditionally available depending on billing state.
// AI generation features stay available to every active tier (the per-tier
// difference is enforced by daily limits, not access); "advanced-sharing" is
// the one Elite-only capability.
export type GatedFeature = "ai-workout" | "ai-weekly-plan" | "advanced-sharing";

export function canAccessFeature(
  user: BillingUserFields,
  feature: GatedFeature,
): boolean {
  const entitlement = getEntitlement(user);
  if (!entitlement.isActive) return false;

  switch (feature) {
    case "ai-workout":
    case "ai-weekly-plan":
      return true;
    case "advanced-sharing":
      return TIER_CONFIG[entitlement.tier].maxShares > 1;
  }
}

/**
 * Server-side guard. Throws "Forbidden" so callers surface a 403 the same way
 * existing actions do for auth failures.
 */
export function assertFeatureAccess(
  user: BillingUserFields,
  feature: GatedFeature,
): void {
  if (!canAccessFeature(user, feature)) {
    throw new Error("Forbidden");
  }
}
