"use server";

import { sendNotificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

const SUPPORT_EMAIL =
  process.env.COMPANY_SUPPORT_EMAIL ?? "destek@fitmusc.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strips angle brackets so submitted text can't inject markup into the
// notification email.
function sanitize(value: string): string {
  return value.replace(/[<>]/g, "");
}

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

/**
 * Public contact form handler — emails the support inbox and writes an audit
 * row. No auth required; inputs are validated and length-capped.
 */
export async function submitContactMessage(
  input: ContactInput,
): Promise<{ success: true }> {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const message = input.message?.trim() ?? "";

  if (!name || !email || !message) throw new Error("InvalidInput");
  if (!EMAIL_REGEX.test(email)) throw new Error("InvalidEmail");
  if (name.length > 120 || email.length > 200 || message.length > 4000) {
    throw new Error("InvalidInput");
  }

  const body = `<strong>${sanitize(name)}</strong> (${sanitize(email)})<br/><br/>${sanitize(
    message,
  ).replace(/\n/g, "<br/>")}`;

  await sendNotificationEmail(
    SUPPORT_EMAIL,
    `İletişim: ${sanitize(name)}`,
    "Yeni iletişim mesajı",
    body,
  );

  logAudit({
    action: "contact.submit",
    entityType: "contact",
    details: { name, email },
  }).catch(() => {});

  return { success: true };
}
