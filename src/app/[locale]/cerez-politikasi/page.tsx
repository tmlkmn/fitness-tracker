import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "Cookie Policy" : "Çerez Politikası",
    robots: { index: true, follow: true },
  };
}

export default async function CookiePolicyPage() {
  const isEn = (await getLocale()) === "en";

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
          {isEn ? "Cookie Policy" : "Çerez Politikası"}
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
              What Are Cookies
            </h2>
            <p>
              Cookies are small text files stored on your device. FitMusc uses
              them and similar local storage to keep you signed in and to
              improve the service.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Cookies We Use
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-foreground">Necessary:</strong>{" "}
                Authentication session, locale preference, security. These are
                required for the app to function and cannot be disabled.
              </li>
              <li>
                <strong className="text-foreground">Analytics:</strong>{" "}
                Anonymous usage and performance measurement (Vercel Analytics).
                Used only with your consent.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Managing Cookies
            </h2>
            <p>
              When you first visit, a consent banner lets you accept or decline
              analytics cookies. You can also clear cookies through your
              browser settings at any time. Declining analytics does not affect
              core functionality.
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Çerez Nedir
            </h2>
            <p>
              Çerezler, cihazınızda saklanan küçük metin dosyalarıdır. FitMusc;
              oturumunuzu açık tutmak ve hizmeti geliştirmek için çerezleri ve
              benzeri yerel depolama yöntemlerini kullanır.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Kullandığımız Çerezler
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong className="text-foreground">Zorunlu:</strong>{" "}
                Kimlik doğrulama oturumu, dil tercihi, güvenlik. Uygulamanın
                çalışması için gereklidir ve devre dışı bırakılamaz.
              </li>
              <li>
                <strong className="text-foreground">Analitik:</strong>{" "}
                Anonim kullanım ve performans ölçümü (Vercel Analytics).
                Yalnızca onayınızla kullanılır.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Çerezleri Yönetme
            </h2>
            <p>
              İlk ziyaretinizde gösterilen onay bildirimi ile analitik
              çerezleri kabul edebilir veya reddedebilirsiniz. Ayrıca tarayıcı
              ayarlarınızdan çerezleri istediğiniz zaman temizleyebilirsiniz.
              Analitik çerezleri reddetmek temel işlevleri etkilemez.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
