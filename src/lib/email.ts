import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const from = process.env.EMAIL_FROM ?? "FitMusc <onboarding@resend.dev>";
const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="tr">
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
                Bu e-posta FitMusc tarafından gönderildi.<br>
                Bildirim ayarlarınızı <a href="${appUrl}/ayarlar" style="color:#22c55e;text-decoration:none;">buradan</a> değiştirebilirsiniz.
              </p>
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

export async function sendInviteEmail(to: string, tempPassword: string) {
  const html = emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">Hoş Geldiniz!</h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      FitMusc hesabınız oluşturuldu. Aşağıdaki bilgilerle giriş yapabilirsiniz.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;border-radius:8px;border:1px solid #262626;margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px;">
          <p style="color:#a3a3a3;font-size:12px;margin:0 0 4px 0;">E-posta</p>
          <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px 0;">${to}</p>
          <p style="color:#a3a3a3;font-size:12px;margin:0 0 4px 0;">Geçici Şifre</p>
          <p style="color:#22c55e;font-size:16px;font-weight:700;font-family:monospace;margin:0;letter-spacing:1px;">${tempPassword}</p>
        </td>
      </tr>
    </table>
    <p style="color:#a3a3a3;font-size:13px;line-height:20px;margin:0 0 4px 0;">
      Giriş yaptıktan sonra şifrenizi değiştirmeniz istenecektir.
    </p>
    <p style="color:#ef4444;font-size:13px;font-weight:600;margin:0;">
      Bu şifre 24 saat geçerlidir.
    </p>
    ${emailButton(`${appUrl}/giris`, "Giriş Yap →")}
  `);

  await getResend().emails.send({ from, to, subject: "FitMusc — Hesabınız Oluşturuldu", html });
}

export async function sendResetEmail(to: string, resetUrl: string) {
  const html = emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">Şifre Sıfırlama</h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı <strong style="color:#ffffff;">1 saat</strong> geçerlidir.
    </p>
    ${emailButton(resetUrl, "Şifremi Sıfırla →")}
    <p style="color:#666;font-size:12px;line-height:18px;margin:20px 0 0 0;">
      Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.
    </p>
  `);

  await getResend().emails.send({ from, to, subject: "FitMusc — Şifre Sıfırlama", html });
}

export async function sendNotificationEmail(
  to: string,
  subject: string,
  title: string,
  body: string,
  link?: string
) {
  const html = emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">${title}</h2>
    <p style="color:#d4d4d4;font-size:14px;line-height:22px;margin:0;">
      ${body}
    </p>
    ${link ? emailButton(`${appUrl}${link}`, "Detayları Gör →") : ""}
  `);

  await getResend().emails.send({ from, to, subject: `FitMusc — ${subject}`, html });
}

export async function sendMembershipExpiryEmail(
  to: string,
  userName: string,
  daysLeft: number,
  endDateStr: string
) {
  const isExpired = daysLeft <= 0;
  const borderColor = isExpired ? "#ef4444" : daysLeft <= 1 ? "#ef4444" : "#f59e0b";
  const countdownColor = isExpired ? "#ef4444" : daysLeft <= 1 ? "#ef4444" : "#f59e0b";

  const subject = isExpired
    ? "Üyelik Süreniz Doldu"
    : `Üyeliğiniz ${daysLeft} Gün İçinde Doluyor`;

  const html = emailLayout(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px 0;">
      ${isExpired ? "Üyelik Süreniz Doldu" : "Üyelik Hatırlatması"}
    </h2>
    <p style="color:#a3a3a3;font-size:14px;line-height:22px;margin:0 0 20px 0;">
      Merhaba ${userName},
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#0a0a0b;border-radius:8px;border:1px solid ${borderColor};margin:0 0 20px 0;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <p style="color:${countdownColor};font-size:32px;font-weight:700;margin:0;">
            ${isExpired ? "Süresi Doldu" : `${daysLeft} Gün`}
          </p>
          <p style="color:#a3a3a3;font-size:13px;margin:4px 0 0 0;">
            ${isExpired ? `Üyeliğiniz ${endDateStr} tarihinde sona erdi` : `Üyeliğiniz ${endDateStr} tarihinde sona erecek`}
          </p>
        </td>
      </tr>
    </table>
    <p style="color:#d4d4d4;font-size:14px;line-height:22px;margin:0 0 8px 0;">
      ${isExpired
        ? "Hesabınıza erişim için üyeliğinizin yenilenmesi gerekmektedir."
        : "Kesintisiz erişim için üyeliğinizi yenilemeyi unutmayın!"}
    </p>
    <p style="color:#a3a3a3;font-size:13px;line-height:20px;margin:0;">
      Yenilemek için yöneticinizle iletişime geçin.
    </p>
    ${emailButton(`${appUrl}/ayarlar`, "Hesabıma Git →")}
  `);

  await getResend().emails.send({ from, to, subject: `FitMusc — ${subject}`, html });
}
