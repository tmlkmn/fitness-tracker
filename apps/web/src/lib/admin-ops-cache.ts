import type { AtRiskUser, AdminKpiSummary } from "@/actions/admin-operations-types";

interface CacheEntry<T> {
  computedAt: number;
  result: T;
}

const TTL_MS = 30_000;

let atRiskCache: CacheEntry<AtRiskUser[]> | null = null;
let kpiCache: CacheEntry<AdminKpiSummary> | null = null;

export function readAtRiskCache(): AtRiskUser[] | null {
  if (!atRiskCache) return null;
  if (Date.now() - atRiskCache.computedAt > TTL_MS) {
    atRiskCache = null;
    return null;
  }
  return atRiskCache.result;
}

export function writeAtRiskCache(result: AtRiskUser[]): void {
  atRiskCache = { computedAt: Date.now(), result };
}

export function readKpiCache(): AdminKpiSummary | null {
  if (!kpiCache) return null;
  if (Date.now() - kpiCache.computedAt > TTL_MS) {
    kpiCache = null;
    return null;
  }
  return kpiCache.result;
}

export function writeKpiCache(result: AdminKpiSummary): void {
  kpiCache = { computedAt: Date.now(), result };
}

export function invalidateAdminOpsCache(): void {
  atRiskCache = null;
  kpiCache = null;
}
