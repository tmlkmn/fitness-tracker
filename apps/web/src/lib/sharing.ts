import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { shares, users, weeklyPlans } from "@/db/schema";
import { sendNotification } from "@/lib/notifications";
import { getServerTranslator } from "@/lib/i18n-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isWeekPast } from "@/lib/utils";

/**
 * Plan sharing core. Recipients are found by the e-mail address the sharer
 * types — the app never lists its users. Only approved, active accounts can
 * receive a plan; any other address answers RECIPIENT_NOT_FOUND, so the
 * answer can't tell "no account" from "inactive account".
 */

export type ShareErrorCode =
  | "CANNOT_SHARE_WITH_SELF"
  | "PAST_WEEK"
  | "ALREADY_SHARED"
  | "RECIPIENT_NOT_FOUND";

const SHARE_ERRORS: readonly string[] = [
  "CANNOT_SHARE_WITH_SELF",
  "PAST_WEEK",
  "ALREADY_SHARED",
  "RECIPIENT_NOT_FOUND",
];

export function isShareErrorCode(message: string): message is ShareErrorCode {
  return SHARE_ERRORS.includes(message);
}

// E-mail lookups say whether an address has an account, so they are capped
// per sharer to keep that from becoming a way to probe addresses.
const LOOKUP_LIMIT = 10;
const LOOKUP_WINDOW_MS = 10 * 60_000;

const activeRecipient = and(eq(users.isApproved, true), isNull(users.frozenAt));

/** The id of the approved, active account with this e-mail (case-insensitive). */
export async function findRecipientByEmail(
  sharer: { id: string; email: string },
  email: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  if (normalized === sharer.email.toLowerCase()) throw new Error("CANNOT_SHARE_WITH_SELF");
  checkRateLimit(`share-lookup:${sharer.id}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS);
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${normalized}`, activeRecipient))
    .limit(1);
  if (!row) throw new Error("RECIPIENT_NOT_FOUND");
  return row.id;
}

/**
 * Shares the owner's week read-only with the recipient and notifies them.
 * The caller has verified that the week belongs to `ownerId`.
 */
export async function shareWeekWith(ownerId: string, weeklyPlanId: number, recipientId: string): Promise<void> {
  if (recipientId === ownerId) throw new Error("CANNOT_SHARE_WITH_SELF");

  const [plan] = await db
    .select({ title: weeklyPlans.title, startDate: weeklyPlans.startDate })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, weeklyPlanId));
  if (plan?.startDate && isWeekPast(plan.startDate)) throw new Error("PAST_WEEK");

  const [recipient] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(and(eq(users.id, recipientId), activeRecipient));
  if (!recipient) throw new Error("RECIPIENT_NOT_FOUND");

  const [existing] = await db
    .select({ id: shares.id })
    .from(shares)
    .where(and(eq(shares.weeklyPlanId, weeklyPlanId), eq(shares.sharedWithUserId, recipientId)));
  if (existing) throw new Error("ALREADY_SHARED");

  await db.insert(shares).values({ weeklyPlanId, ownerUserId: ownerId, sharedWithUserId: recipientId });

  const [sharer] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerId));
  const recipientLocale = recipient.locale === "en" ? "en" : "tr";
  const t = await getServerTranslator(recipientLocale, "triggerNotifications.planShared");
  await sendNotification({
    userId: recipientId,
    type: "plan_shared",
    title: t("title"),
    body: t("body", { sharerName: sharer?.name ?? "", planTitle: plan?.title ?? "" }),
    link: recipientLocale === "en" ? "/en/shared" : "/tr/paylasilan",
    metadata: { weeklyPlanId, sharedByUserId: ownerId },
  });

  revalidatePath("/ayarlar");
  revalidatePath("/paylasilan");
}

/** People the user has shared a plan with before and who can still receive one. */
export async function previousShareRecipients(ownerId: string) {
  return db
    .selectDistinct({ id: users.id, name: users.name, email: users.email })
    .from(shares)
    .innerJoin(users, eq(shares.sharedWithUserId, users.id))
    .where(and(eq(shares.ownerUserId, ownerId), activeRecipient))
    .orderBy(users.name);
}
