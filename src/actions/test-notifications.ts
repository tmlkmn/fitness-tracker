"use server";

import { getAuthUser } from "@/lib/auth-utils";
import { sendNotification } from "@/lib/notifications";

export async function sendTestNotification(channel: "all" | "email" | "push" | "inapp") {
  const user = await getAuthUser();
  const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (channel === "email") {
    // Send only email — bypass preferences by calling email directly
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { sendNotificationEmail } = await import("@/lib/email");
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, user.id));
    if (u?.email) {
      await sendNotificationEmail(
        u.email,
        "Test E-posta Bildirimi",
        "Test E-posta Bildirimi",
        `Bu bir test e-postasıdır. Gönderilme zamanı: ${now}`,
        "/"
      );
    }
    return { ok: true, message: `E-posta gönderildi (${now})` };
  }

  if (channel === "push") {
    // Send only push — bypass preferences by calling push directly
    const { db } = await import("@/db");
    const { pushSubscriptions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { sendPushNotification } = await import("@/lib/web-push");
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id));
    if (subs.length === 0) {
      return { ok: false, message: "Push aboneliği bulunamadı. Önce push bildirimlerini etkinleştirin." };
    }
    let sent = 0;
    for (const sub of subs) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title: "Test Push Bildirimi", body: `Bu bir test bildirimidir (${now})`, url: "/", tag: "test" }
      );
      if (success) sent++;
    }
    return { ok: true, message: `${sent}/${subs.length} push bildirimi gönderildi (${now})` };
  }

  if (channel === "inapp") {
    // In-app only — directly insert
    const { db } = await import("@/db");
    const { notifications } = await import("@/db/schema");
    await db.insert(notifications).values({
      userId: user.id,
      type: "test",
      title: "Test Uygulama Bildirimi",
      body: `Bu bir test bildirimidir (${now})`,
      link: "/",
    });
    return { ok: true, message: `Uygulama bildirimi oluşturuldu (${now})` };
  }

  // all — use the standard sendNotification which respects preferences
  await sendNotification({
    userId: user.id,
    type: "test",
    title: "Test Bildirimi",
    body: `Bu bir test bildirimidir. Tüm kanallar aktif. (${now})`,
    link: "/",
    skipEmail: false,
  });
  return { ok: true, message: `Tüm kanallardan bildirim gönderildi (${now})` };
}
