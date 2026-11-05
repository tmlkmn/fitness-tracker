"use server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(params: {
  userId?: string;
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      adminId: params.adminId ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      details: params.details ?? null,
    });
  } catch {
    // Audit logging should never break the main flow
    console.error("[Audit] Failed to log:", params.action);
  }
}
