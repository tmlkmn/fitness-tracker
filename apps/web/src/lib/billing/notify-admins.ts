import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";
import { getServerTranslator } from "@/lib/i18n-server";
import { normalizeLocale } from "@/lib/locale";

/**
 * Alerts every admin that a user's recurring payment failed. Best-effort —
 * a single failed dispatch never blocks the rest, so a webhook still returns
 * 200 even if notification delivery hiccups.
 */
export async function notifyAdminsOfPaymentFailure(
  failedUserId: string,
): Promise<void> {
  const [failedUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, failedUserId));
  if (!failedUser) return;

  const admins = await db
    .select({ id: users.id, locale: users.locale })
    .from(users)
    .where(eq(users.role, "admin"));

  for (const admin of admins) {
    const loc = normalizeLocale(admin.locale);
    try {
      const t = await getServerTranslator(
        loc,
        "triggerNotifications.adminPaymentFailed",
      );
      await sendNotification({
        userId: admin.id,
        type: "billing_adminPaymentFailed",
        title: t("title"),
        body: t("body", {
          userName: failedUser.name,
          userEmail: failedUser.email,
        }),
        link: loc === "en" ? "/en/admin/billing" : "/tr/admin/billing",
        forceEmail: true,
      });
    } catch (err) {
      console.error("Admin payment-failure notification failed:", err);
    }
  }
}
