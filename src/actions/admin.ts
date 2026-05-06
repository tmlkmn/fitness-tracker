"use server";

import { db } from "@/db";
import { users, aiUsageLogs } from "@/db/schema";
import { eq, sql, gte, and, inArray, isNotNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { getAuthAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export type MembershipType = "unlimited" | "1-month" | "3-month" | "6-month" | "1-year" | "custom";

export interface MembershipInput {
  type: MembershipType;
  customEndDate?: string;
}

export async function inviteUser(
  email: string,
  name: string,
  membership: MembershipInput,
  locale: "tr" | "en" = "tr",
) {
  const admin = await getAuthAdmin();

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await auth.api.createUser({
    headers: await headers(),
    body: {
      email,
      name,
      password: tempPassword,
      role: "user",
      data: {
        isApproved: false,
        mustChangePassword: true,
        inviteExpiresAt,
        membershipType: membership.type,
        locale,
        ...(membership.type === "custom" && membership.customEndDate
          ? { membershipEndDate: new Date(membership.customEndDate) }
          : {}),
      },
    },
  });

  await sendInviteEmail(email, tempPassword);

  // Send welcome in-app notification (skip email since invite email already sent)
  const [newUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (newUser) {
    await sendNotification({
      userId: newUser.id,
      type: "user_invited",
      title: "FitMusc'a Hoş Geldiniz!",
      body: "Hesabınız oluşturuldu. Giriş yaparak başlayabilirsiniz.",
      link: "/",
      skipEmail: true,
    });
  }

  revalidatePath("/admin");

  logAudit({ adminId: admin.id, action: "user.invite", entityType: "user", entityId: newUser?.id, details: { email, name, membershipType: membership.type } }).catch(() => {});

  return { success: true, tempPassword };
}

export type UserStatus = "Admin" | "Aktif" | "Bekliyor" | "Süresi Dolmuş" | "Üyelik Dolmuş" | "Dondurulmuş";

export interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  membershipType: string | null;
  membershipStartDate: Date | null;
  membershipEndDate: Date | null;
  frozenAt: Date | null;
  isFrozen: boolean;
}

function getUserStatus(user: typeof users.$inferSelect): UserStatus {
  if (user.role === "admin") return "Admin";
  if (user.banned) return "Dondurulmuş";
  if (user.isApproved && !user.mustChangePassword) {
    // Check membership expiry for active users
    if (user.membershipEndDate && new Date(user.membershipEndDate) <= new Date()) {
      return "Üyelik Dolmuş";
    }
    return "Aktif";
  }
  if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) <= new Date()) {
    return "Süresi Dolmuş";
  }
  return "Bekliyor";
}

export async function listAllUsers(): Promise<UserWithStatus[]> {
  await getAuthAdmin();

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(users.createdAt);

  return allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: getUserStatus(u),
    createdAt: u.createdAt,
    membershipType: u.membershipType,
    membershipStartDate: u.membershipStartDate,
    membershipEndDate: u.membershipEndDate,
    frozenAt: u.frozenAt,
    isFrozen: !!u.banned,
  }));
}

export async function resendInvite(userId: string) {
  const admin = await getAuthAdmin();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot resend invite to admin");

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await auth.api.setUserPassword({
    headers: await headers(),
    body: { userId, newPassword: tempPassword },
  });

  await db
    .update(users)
    .set({ mustChangePassword: true, inviteExpiresAt, isApproved: false })
    .where(eq(users.id, userId));

  await sendInviteEmail(user.email, tempPassword);
  logAudit({ adminId: admin.id, action: "user.resend_invite", entityType: "user", entityId: userId, details: { email: user.email } }).catch(() => {});
  revalidatePath("/admin");
  return { success: true };
}

export async function removeUserAction(userId: string) {
  const admin = await getAuthAdmin();

  const [user] = await db
    .select({ role: users.role, banned: users.banned, frozenAt: users.frozenAt })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot remove admin user");

  if (user.banned) {
    if (!user.frozenAt) throw new Error("Kullanıcı dondurulmuş ama dondurulma tarihi yok.");
    const daysFrozen = (Date.now() - new Date(user.frozenAt).getTime()) / 86400000;
    if (daysFrozen < 30) throw new Error("Kullanıcı henüz 30 gün dondurulmamış.");
  }

  await auth.api.removeUser({
    headers: await headers(),
    body: { userId },
  });

  logAudit({ adminId: admin.id, action: "user.remove", entityType: "user", entityId: userId }).catch(() => {});

  revalidatePath("/admin");
  return { success: true };
}

export async function freezeUserAction(userId: string) {
  const admin = await getAuthAdmin();

  const [user] = await db
    .select({ role: users.role, banned: users.banned })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot freeze admin user");
  if (user.banned) throw new Error("User is already frozen");

  await auth.api.banUser({
    headers: await headers(),
    body: { userId },
  });

  await db.update(users).set({ frozenAt: new Date() }).where(eq(users.id, userId));

  logAudit({ adminId: admin.id, action: "user.freeze", entityType: "user", entityId: userId }).catch(() => {});
  revalidatePath("/admin");
  return { success: true };
}

export async function unfreezeUserAction(userId: string) {
  const admin = await getAuthAdmin();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot unfreeze admin user");

  await auth.api.unbanUser({
    headers: await headers(),
    body: { userId },
  });

  await db.update(users).set({ frozenAt: null }).where(eq(users.id, userId));

  logAudit({ adminId: admin.id, action: "user.unfreeze", entityType: "user", entityId: userId }).catch(() => {});
  revalidatePath("/admin");
  return { success: true };
}

const MEMBERSHIP_MONTHS: Record<string, number> = {
  "1-month": 1,
  "3-month": 3,
  "6-month": 6,
  "1-year": 12,
};

export async function computeMembershipEndDate(
  type: string,
  fromDate: Date,
  existingEndDate?: Date | null
): Promise<Date | null> {
  if (type === "unlimited") return null;
  if (type === "custom") return existingEndDate ?? null;
  const months = MEMBERSHIP_MONTHS[type];
  if (!months) return null;
  const end = new Date(fromDate);
  end.setMonth(end.getMonth() + months);
  return end;
}

export async function extendMembership(
  userId: string,
  newType: MembershipType,
  customEndDate?: string
) {
  const admin = await getAuthAdmin();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot modify admin membership");

  const now = new Date();
  const updateData: Record<string, unknown> = {
    membershipType: newType,
    membershipNotifiedAt: null,
  };

  if (newType === "unlimited") {
    updateData.membershipEndDate = null;
  } else if (newType === "custom") {
    if (!customEndDate) throw new Error("Custom end date required");
    updateData.membershipEndDate = new Date(customEndDate);
  } else {
    const months = MEMBERSHIP_MONTHS[newType];
    if (months) {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + months);
      updateData.membershipEndDate = endDate;
    }
  }

  // If user is approved but never had a start date, set it now
  if (user.isApproved && !user.membershipStartDate) {
    updateData.membershipStartDate = now;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  logAudit({ adminId: admin.id, action: "membership.extend", entityType: "user", entityId: userId, details: { newType, customEndDate, endDate: updateData.membershipEndDate } }).catch(() => {});

  const endDateFormatted = updateData.membershipEndDate
    ? (updateData.membershipEndDate as Date).toLocaleDateString("tr-TR")
    : null;

  await sendNotification({
    userId,
    type: "membership_extended",
    title: "Üyeliğiniz Yenilendi!",
    body: newType === "unlimited"
      ? "Üyeliğiniz sınırsız olarak güncellendi."
      : `Üyeliğiniz yenilendi. Yeni bitiş tarihi: ${endDateFormatted}`,
    link: "/ayarlar",
  });

  revalidatePath("/admin");
  return { success: true };
}

// ── Admin Report Actions ──

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  adminUsers: number;
  aiUsageToday: number;
  aiUsageThisWeek: number;
  aiUsageTotal: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  await getAuthAdmin();

  const allUsers = await db.select().from(users);

  let activeUsers = 0;
  let pendingUsers = 0;
  let adminUsers = 0;

  for (const u of allUsers) {
    const status = getUserStatus(u);
    if (status === "Admin") adminUsers++;
    else if (status === "Aktif") activeUsers++;
    else pendingUsers++;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);

  const [todayCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, startOfToday));

  const [weekCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, startOfWeek));

  const [totalCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs);

  return {
    totalUsers: allUsers.length,
    activeUsers,
    pendingUsers,
    adminUsers,
    aiUsageToday: todayCount?.count ?? 0,
    aiUsageThisWeek: weekCount?.count ?? 0,
    aiUsageTotal: totalCount?.count ?? 0,
  };
}

export interface FeatureUsage {
  feature: string;
  today: number;
  thisWeek: number;
  total: number;
}

export async function getAiUsageByFeature(): Promise<FeatureUsage[]> {
  await getAuthAdmin();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);

  const rows = await db
    .select({
      feature: aiUsageLogs.feature,
      total: sql<number>`count(*)::int`,
      today: sql<number>`count(*) filter (where ${aiUsageLogs.createdAt} >= ${startOfToday})::int`,
      thisWeek: sql<number>`count(*) filter (where ${aiUsageLogs.createdAt} >= ${startOfWeek})::int`,
    })
    .from(aiUsageLogs)
    .groupBy(aiUsageLogs.feature)
    .orderBy(sql`count(*) desc`);

  return rows;
}

export interface UserAiUsage {
  userId: string;
  userName: string;
  userEmail: string;
  total: number;
  lastUsed: Date | null;
  features: Record<string, number>;
}

export async function getAiUsageByUser(): Promise<UserAiUsage[]> {
  await getAuthAdmin();

  const rows = await db
    .select({
      userId: aiUsageLogs.userId,
      userName: users.name,
      userEmail: users.email,
      feature: aiUsageLogs.feature,
      count: sql<number>`count(*)::int`,
      lastUsed: sql<Date>`max(${aiUsageLogs.createdAt})`,
    })
    .from(aiUsageLogs)
    .innerJoin(users, eq(aiUsageLogs.userId, users.id))
    .groupBy(aiUsageLogs.userId, users.name, users.email, aiUsageLogs.feature)
    .orderBy(sql`max(${aiUsageLogs.createdAt}) desc`);

  const userMap = new Map<string, UserAiUsage>();
  for (const row of rows) {
    let entry = userMap.get(row.userId);
    if (!entry) {
      entry = {
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        total: 0,
        lastUsed: row.lastUsed,
        features: {},
      };
      userMap.set(row.userId, entry);
    }
    entry.total += row.count;
    entry.features[row.feature] = row.count;
    if (row.lastUsed && (!entry.lastUsed || row.lastUsed > entry.lastUsed)) {
      entry.lastUsed = row.lastUsed;
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.total - a.total);
}

// ─── AI warnings analytics (success_with_warnings deep-dive) ──────────────

export interface AiWarningsAnalytics {
  /** Total non-error AI runs in the window (success + success_with_warnings). */
  totalRuns: number;
  /** Number of runs that produced at least one warning. */
  runsWithWarnings: number;
  /** runsWithWarnings / totalRuns * 100, rounded. */
  warningRatePct: number;
  /** Per-feature breakdown of warning frequency. */
  perFeature: {
    feature: string;
    successCount: number;
    warningCount: number;
    warningRatePct: number;
  }[];
  /** Top warning text patterns aggregated across all features. */
  topPatterns: {
    pattern: string;
    count: number;
    samples: { feature: string; createdAt: Date }[];
  }[];
  /** 14-day daily timeline of success vs success_with_warnings counts. */
  daily: {
    date: string;
    success: number;
    warnings: number;
  }[];
}

/**
 * Group a warning string into a stable category. Strips per-row context
 * like `day[3] (Cuma)` and numeric values so similar warnings collapse.
 */
function classifyWarning(raw: string): string {
  let normalized = raw
    // strip "day[N] (DayName)" prefixes
    .replace(/^day\[\d+\]\s*\([^)]*\)\.?/, "day(*)")
    .replace(/^day\s*\d+\s*\([^)]*\)/, "day(*)")
    // strip "meal[N]" / "exercise[N]" indices
    .replace(/\.(meal|exercise)\[\d+\]/g, ".$1[*]")
    .replace(/^(meal|exercise)\[\d+\]/g, "$1[*]")
    .replace(/^alternatives\[\d+\]/g, "alternatives[*]")
    // strip numeric values inside quotes / brackets
    .replace(/"\d+(\.\d+)?"/g, '"*"')
    .replace(/\d+(\.\d+)?\s*kcal/g, "* kcal")
    .replace(/\(drift \d+%\)/g, "(drift *%)")
    .replace(/drifts \d+%/g, "drifts *%")
    .trim();
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");
  // Keep first 80 chars for readability
  if (normalized.length > 80) normalized = normalized.slice(0, 77) + "...";
  return normalized;
}

interface WarningEnvelope {
  warnings?: unknown;
}

const WARNING_LOOKBACK_DAYS = 14;
const TOP_PATTERNS_LIMIT = 12;
const PATTERN_SAMPLE_LIMIT = 3;

export async function getAiWarningsAnalytics(): Promise<AiWarningsAnalytics> {
  await getAuthAdmin();

  const since = new Date();
  since.setDate(since.getDate() - WARNING_LOOKBACK_DAYS);

  // Per-feature success vs warning split (only success-like statuses count).
  const featureRows = await db
    .select({
      feature: aiUsageLogs.feature,
      status: aiUsageLogs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        gte(aiUsageLogs.createdAt, since),
        inArray(aiUsageLogs.status, ["success", "success_with_warnings"]),
      ),
    )
    .groupBy(aiUsageLogs.feature, aiUsageLogs.status);

  const perFeatureMap = new Map<string, { success: number; warnings: number }>();
  for (const r of featureRows) {
    const e = perFeatureMap.get(r.feature) ?? { success: 0, warnings: 0 };
    if (r.status === "success_with_warnings") e.warnings += r.count;
    else e.success += r.count;
    perFeatureMap.set(r.feature, e);
  }
  const perFeature = Array.from(perFeatureMap.entries())
    .map(([feature, { success, warnings }]) => {
      const total = success + warnings;
      return {
        feature,
        successCount: success,
        warningCount: warnings,
        warningRatePct: total > 0 ? Math.round((warnings / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.warningCount - a.warningCount);

  const totalRuns = perFeature.reduce(
    (s, f) => s + f.successCount + f.warningCount,
    0,
  );
  const runsWithWarnings = perFeature.reduce((s, f) => s + f.warningCount, 0);
  const warningRatePct = totalRuns > 0 ? Math.round((runsWithWarnings / totalRuns) * 100) : 0;

  // Pull all warning rows (errorMessage stores JSON.stringify({warnings})).
  const warningRows = await db
    .select({
      feature: aiUsageLogs.feature,
      createdAt: aiUsageLogs.createdAt,
      errorMessage: aiUsageLogs.errorMessage,
    })
    .from(aiUsageLogs)
    .where(
      and(
        gte(aiUsageLogs.createdAt, since),
        eq(aiUsageLogs.status, "success_with_warnings"),
        isNotNull(aiUsageLogs.errorMessage),
      ),
    )
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(2000); // 14 days × max throughput cap

  const patternMap = new Map<
    string,
    { count: number; samples: { feature: string; createdAt: Date }[] }
  >();
  for (const row of warningRows) {
    if (!row.errorMessage) continue;
    let parsed: WarningEnvelope;
    try {
      parsed = JSON.parse(row.errorMessage) as WarningEnvelope;
    } catch {
      continue; // non-JSON payloads (older rows) skipped
    }
    const warnings = Array.isArray(parsed.warnings) ? (parsed.warnings as unknown[]) : [];
    for (const w of warnings) {
      const text = String(w);
      const pattern = classifyWarning(text);
      const entry = patternMap.get(pattern) ?? { count: 0, samples: [] };
      entry.count += 1;
      if (entry.samples.length < PATTERN_SAMPLE_LIMIT) {
        entry.samples.push({ feature: row.feature, createdAt: row.createdAt });
      }
      patternMap.set(pattern, entry);
    }
  }
  const topPatterns = Array.from(patternMap.entries())
    .map(([pattern, { count, samples }]) => ({ pattern, count, samples }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_PATTERNS_LIMIT);

  // 14-day daily timeline (Postgres date_trunc → ISO date string).
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${aiUsageLogs.createdAt}), 'YYYY-MM-DD')`,
      status: aiUsageLogs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(aiUsageLogs)
    .where(
      and(
        gte(aiUsageLogs.createdAt, since),
        inArray(aiUsageLogs.status, ["success", "success_with_warnings"]),
      ),
    )
    .groupBy(sql`date_trunc('day', ${aiUsageLogs.createdAt})`, aiUsageLogs.status);

  // Build a complete 14-day series so the chart has zero gaps.
  const dayMap = new Map<string, { success: number; warnings: number }>();
  for (let i = WARNING_LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dayMap.set(key, { success: 0, warnings: 0 });
  }
  for (const r of dailyRows) {
    const e = dayMap.get(r.day);
    if (!e) continue;
    if (r.status === "success_with_warnings") e.warnings += r.count;
    else e.success += r.count;
  }
  const daily = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    success: v.success,
    warnings: v.warnings,
  }));

  return {
    totalRuns,
    runsWithWarnings,
    warningRatePct,
    perFeature,
    topPatterns,
    daily,
  };
}
