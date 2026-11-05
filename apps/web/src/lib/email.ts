import Mailjet from "node-mailjet";
import type { Locale } from "@/lib/locale";
import { getServerTranslator } from "@/lib/i18n-server";

let client: ReturnType<typeof Mailjet.apiConnect> | null = null;

function getMailjet() {
  if (!client) {
    client = Mailjet.apiConnect(
      process.env.MJ_APIKEY_PUBLIC!,
      process.env.MJ_APIKEY_PRIVATE!,
    );
  }
  return client;
}

const fromEmail = process.env.EMAIL_FROM_ADDRESS ?? "noreply@fitmusc.com";
const fromName = process.env.EMAIL_FROM_NAME ?? "FitMusc";
const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  await getMailjet().post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: html,
      },
    ],
  });
}

// Legal sender identity — required by Lemon Squeezy store approval and
// anti-spam regulations. Rendered in every email footer when configured.
const companyLegalName = process.env.COMPANY_LEGAL_NAME;
const companyAddress = process.env.COMPANY_ADDRESS;

async function emailLayout(content: string, locale: Locale = "tr") {
  const lang = locale === "en" ? "en" : "tr";
  const settingsPath = locale === "en" ? "/en/settings" : "/tr/ayarlar";
  const tCommon = await getServerTranslator(locale, "emailTemplates.common");
  const footerText = tCommon("footerHtml", {
    settingsUrl: `${appUrl}${settingsPath}`,
  });
  const companyLine =
    companyLegalName || companyAddress
      ? `<p style="color:#525252;font-size:11px;line-height:16px;margin:8px 0 0 0;">
                ${[companyLegalName, companyAddress].filter(Boolean).join(" · ")}
              </p>`
      : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FitMusc</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32px;height:32px;vertical-align:middle;">
                    <img src="${appUrl}/icon-192.png" alt="FitMusc" width="32" height="32" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">FitMusc</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#171717;border-radius:12px;border:1px solid #262626;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="color:#666;font-size:12px;line-height:18px;margin:0;">
                ${footerText}
              </p>
              ${companyLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailButton(href: string, text: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;">
    <tr>
      <td style="background-color:#22c55e;border-radius:8px;padding:12px 24px;">
        <a href="${href}" style="color:#052e16;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`;
}

export async function sendInviteEmail(
  to: string,
  userName: string,
  tempPassword: string,
  locale: Locale = "tr",
) {
  const loginPath = locale === "en" ? "/en/login" : "/tr/giris";
  const t = await getServerTranslator(locale, "emailTemplates.invite");
  const html = await emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">${t("title", { userName })}</h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      ${t("intro")}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;border-radius:8px;border:1px solid #262626;margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px;">
          <p style="color:#a3a3a3;font-size:12px;margin:0 0 4px 0;">${t("emailLabel")}</p>
          <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px 0;">${to}</p>
          <p style="color:#a3a3a3;font-size:12px;margin:0 0 4px 0;">${t("tempPasswordLabel")}</p>
          <p style="color:#22c55e;font-size:16px;font-weight:700;font-family:monospace;margin:0;letter-spacing:1px;">${tempPassword}</p>
        </td>
      </tr>
    </table>
    <p style="color:#a3a3a3;font-size:13px;line-height:20px;margin:0 0 4px 0;">
      ${t("afterLogin")}
    </p>
    <p style="color:#ef4444;font-size:13px;font-weight:600;margin:0;">
      ${t("validity")}
    </p>
    ${emailButton(`${appUrl}${loginPath}`, t("button"))}
  `, locale);

  await sendEmail(to, t("subject"), html);
}

export async function sendResetEmail(to: string, resetUrl: string, locale: Locale = "tr") {
  const t = await getServerTranslator(locale, "emailTemplates.reset");
  const html = await emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">${t("title")}</h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      ${t("introHtml")}
    </p>
    ${emailButton(resetUrl, t("button"))}
    <p style="color:#666;font-size:12px;line-height:18px;margin:20px 0 0 0;">
      ${t("footer")}
    </p>
  `, locale);

  await sendEmail(to, t("subject"), html);
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  title: string,
  body: string,
  link?: string,
  locale: Locale = "tr",
) {
  const t = await getServerTranslator(locale, "emailTemplates.notificationWrapper");
  const html = await emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">${title}</h2>
    <p style="color:#d4d4d4;font-size:14px;line-height:22px;margin:0;">
      ${body}
    </p>
    ${link ? emailButton(`${appUrl}${link}`, t("detailsBtn")) : ""}
  `, locale);

  await sendEmail(to, subject, html);
}

export async function sendMembershipExpiryEmail(
  to: string,
  userName: string,
  daysLeft: number,
  endDateStr: string,
  locale: Locale = "tr",
) {
  const isExpired = daysLeft <= 0;
  const isUrgent = isExpired || daysLeft <= 1;
  const accentColor = isUrgent ? "#ef4444" : "#f59e0b";
  const settingsPath = locale === "en" ? "/en/settings" : "/tr/ayarlar";

  const t = await getServerTranslator(locale, "emailTemplates.expiry");

  const subjectKey = isExpired
    ? "subjectExpired"
    : daysLeft <= 1
      ? "subject1d"
      : daysLeft <= 3
        ? "subject3d"
        : "subject7d";
  const ctaKey = isExpired
    ? "ctaExpired"
    : daysLeft <= 1
      ? "cta1d"
      : daysLeft <= 3
        ? "cta3d"
        : "cta7d";

  const heading = t(isExpired ? "headingExpired" : "headingActive");
  const greeting = t("greeting", { userName });
  const counter = isExpired
    ? t("counterExpired")
    : t("counterDays", { daysLeft });
  const counterSub = isExpired
    ? t("counterSubExpired", { endDate: endDateStr })
    : t("counterSubActive", { endDate: endDateStr });

  const html = await emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">
      ${heading}
    </h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      ${greeting}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#0a0a0b;border-radius:8px;border:1px solid ${accentColor};margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="color:${accentColor};font-size:32px;font-weight:700;margin:0;">
            ${counter}
          </p>
          <p style="color:#a3a3a3;font-size:13px;margin:4px 0 0 0;">
            ${counterSub}
          </p>
        </td>
      </tr>
    </table>
    <p style="color:#d4d4d4;font-size:14px;line-height:22px;margin:0 0 8px 0;">
      ${t(ctaKey)}
    </p>
    <p style="color:#a3a3a3;font-size:13px;line-height:20px;margin:0;">
      ${t("renewNote")}
    </p>
    ${emailButton(`${appUrl}${settingsPath}`, t("button"))}
  `, locale);

  await sendEmail(to, t(subjectKey), html);
}
