"use server";

import { db } from "@/db";
import { users, aiUsageLogs } from "@/db/schema";
import { eq, sql, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { getAuthAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendNotification } from "@/lib/notifications";

export type MembershipType = "unlimited" | "1-month" | "3-month" | "6-month" | "1-year" | "custom";

export interface MembershipInput {
  type: MembershipType;
  customEndDate?: string;
}

export async function inviteUser(email: string, name: string, membership: MembershipInput) {
  await getAuthAdmin();

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
  return { success: true, tempPassword };
}

export type UserStatus = "Admin" | "Aktif" | "Bekliyor" | "Süresi Dolmuş" | "Üyelik Dolmuş";

export interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  membershipType: string | null;
  membershipStartDate: Date | null;
  membershipEndDate: Date | null;
}

function getUserStatus(user: typeof users.$inferSelect): UserStatus {
  if (user.role === "admin") return "Admin";
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
  }));
}

export async function resendInvite(userId: string) {
  await getAuthAdmin();

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
  revalidatePath("/admin");
  return { success: true };
}

export async function removeUserAction(userId: string) {
  await getAuthAdmin();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot remove admin user");

  await auth.api.removeUser({
    headers: await headers(),
    body: { userId },
  });

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
  await getAuthAdmin();

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
