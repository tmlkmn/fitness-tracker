"use server";

import { db } from "@/db";
import { feedbacks, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser, getAuthAdmin } from "@/lib/auth-utils";
import { sendNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// ── Types ──

export interface FeedbackItem {
  id: number;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  adminResponse: string | null;
  respondedAt: Date | null;
  createdAt: Date;
}

export interface FeedbackWithUser {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  adminResponse: string | null;
  respondedAt: Date | null;
  createdAt: Date;
}

// ── User actions ──

export async function submitFeedback(data: {
  category: string;
  rating?: number;
  message: string;
}) {
  const user = await getAuthUser();

  const [inserted] = await db
    .insert(feedbacks)
    .values({
      userId: user.id,
      category: data.category,
      rating: data.rating ?? null,
      message: data.message.slice(0, 2000),
      status: "open",
    })
    .returning({ id: feedbacks.id });

  // Notify all admin users
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  const preview = data.message.slice(0, 100);
  for (const admin of admins) {
    await sendNotification({
      userId: admin.id,
      type: "new_feedback",
      title: "Yeni Geri Bildirim",
      body: `${user.name}: ${preview}`,
      link: "/admin/geri-bildirim",
    });
  }

  return { id: inserted.id };
}

export async function getMyFeedbacks(): Promise<FeedbackItem[]> {
  const user = await getAuthUser();
  return db
    .select({
      id: feedbacks.id,
      category: feedbacks.category,
      rating: feedbacks.rating,
      message: feedbacks.message,
      status: feedbacks.status,
      adminResponse: feedbacks.adminResponse,
      respondedAt: feedbacks.respondedAt,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(eq(feedbacks.userId, user.id))
    .orderBy(desc(feedbacks.createdAt))
    .limit(20);
}

// ── Admin actions ──

export async function listAllFeedbacks(): Promise<FeedbackWithUser[]> {
  await getAuthAdmin();
  return db
    .select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      userName: users.name,
      userEmail: users.email,
      category: feedbacks.category,
      rating: feedbacks.rating,
      message: feedbacks.message,
      status: feedbacks.status,
      adminResponse: feedbacks.adminResponse,
      respondedAt: feedbacks.respondedAt,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .innerJoin(users, eq(feedbacks.userId, users.id))
    .orderBy(desc(feedbacks.createdAt));
}

export async function respondToFeedback(feedbackId: number, response: string) {
  const admin = await getAuthAdmin();

  const [fb] = await db
    .select({ userId: feedbacks.userId })
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId));

  if (!fb) throw new Error("Feedback not found");

  await db
    .update(feedbacks)
    .set({
      adminResponse: response.slice(0, 2000),
      respondedByAdminId: admin.id,
      respondedAt: new Date(),
      status: "responded",
    })
    .where(eq(feedbacks.id, feedbackId));

  // Notify user via all 3 channels
  await sendNotification({
    userId: fb.userId,
    type: "feedback_response",
    title: "Geri Bildiriminize Yanıt",
    body: response.slice(0, 200),
    skipEmail: false,
  });

  revalidatePath("/admin/geri-bildirim");
}

export async function closeFeedback(feedbackId: number) {
  await getAuthAdmin();
  await db
    .update(feedbacks)
    .set({ status: "closed" })
    .where(eq(feedbacks.id, feedbackId));
  revalidatePath("/admin/geri-bildirim");
}
