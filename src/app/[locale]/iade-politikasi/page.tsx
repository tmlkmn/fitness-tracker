import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Refund Policy" : "İade Politikası",
    robots: { index: true, follow: true },
  };
}

export default async function RefundPolicyPage() {
  const isEn = (await getLocale()) === "en";
  const supportEmail = process.env.COMPANY_SUPPORT_EMAIL ?? "destek@fitmusc.com";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEn ? "Refund Policy" : "İade Politikası"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn ? "Last updated" : "Son güncelleme"}:{" "}
          {isEn ? "May 15, 2026" : "15 Mayıs 2026"}
        </p>
      </header>

      {isEn ? (
        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Free Trial
            </h2>
            <p>
              FitMusc offers a 14-day free trial. No payment is taken during
              the trial. If you do not subscribe to a paid plan, your access
              simply ends — there is nothing to refund.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Subscriptions
            </h2>
            <p>
              Paid plans are billed in advance on a monthly or yearly basis.
              You can cancel at any time from the billing settings page; your
              access continues until the end of the period you already paid
              for and is not renewed afterwards.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Right of Withdrawal &amp; Refunds
            </h2>
            <p>
              Customers in Türkiye have the statutory 14-day right of
              withdrawal for distance sales. If you request a refund within 14
              days of a charge and have not made substantial use of the paid
              features, we will refund that payment in full. Requests after 14
              days are reviewed case by case.
            </p>
            <p className="mt-2">
              Payments are processed by our payment providers — Lemon Squeezy
              (international) and iyzico (Türkiye). Approved refunds are
              returned to the original payment method, typically within 5–10
              business days depending on your bank.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. How to Request a Refund
            </h2>
            <p>
              Email{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="text-primary hover:underline"
              >
                {supportEmail}
              </a>{" "}
              with the email address on your account and the date of the
              charge. We respond within 5 business days.
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Ücretsiz Deneme
            </h2>
            <p>
              FitMusc 14 günlük ücretsiz deneme sunar. Deneme süresince hiçbir
              ödeme alınmaz. Ücretli bir plana geçmezseniz erişiminiz sona
              erer; iade edilecek bir tutar oluşmaz.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Abonelikler
            </h2>
            <p>
              Ücretli planlar aylık veya yıllık olarak peşin faturalandırılır.
              Aboneliğinizi ödeme ayarları sayfasından istediğiniz zaman iptal
              edebilirsiniz; erişiminiz ödemesini yaptığınız dönemin sonuna
              kadar sürer ve sonrasında yenilenmez.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Cayma Hakkı ve İadeler
            </h2>
            <p>
              Mesafeli Sözleşmeler Yönetmeliği uyarınca tüketicilerin 14 günlük
              cayma hakkı bulunmaktadır. Bir ödemeden sonraki 14 gün içinde iade
              talep eder ve ücretli özellikleri esaslı şekilde kullanmamış
              olursanız, ilgili ödeme tam olarak iade edilir. 14 günden sonraki
              talepler ayrıca değerlendirilir.
            </p>
            <p className="mt-2">
              Ödemeler ödeme sağlayıcılarımız üzerinden işlenir — Lemon Squeezy
              (uluslararası) ve iyzico (Türkiye). Onaylanan iadeler, bankanıza
              bağlı olarak genellikle 5–10 iş günü içinde ödemenin yapıldığı
              karta geri yansıtılır.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. İade Nasıl Talep Edilir
            </h2>
            <p>
              Hesabınızdaki e-posta adresi ve ödeme tarihi ile birlikte{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="text-primary hover:underline"
              >
                {supportEmail}
              </a>{" "}
              adresine yazın. Taleplere 5 iş günü içinde yanıt veririz.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
