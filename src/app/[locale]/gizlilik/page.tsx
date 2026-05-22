import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { normalizeLocale } from "@/lib/locale";
import { buildPublicMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";
  return {
    ...buildPublicMetadata({
      href: "/gizlilik",
      locale,
      title: isEn ? "Privacy Policy" : "Gizlilik Politikası",
      description: isEn
        ? "FitMusc privacy policy: detailed information on how your personal and health data is collected, processed, stored, and protected."
        : "FitMusc gizlilik politikası: kişisel ve sağlık verilerinizin nasıl toplandığı, işlendiği, saklandığı ve korunduğu hakkında detaylı bilgi.",
    }),
    robots: { index: true, follow: true },
  };
}

export default async function GizlilikPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

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
          {isEn ? "Privacy Policy" : "Gizlilik Politikası"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn ? "Last updated" : "Son güncelleme"}: {isEn ? "April 20, 2026" : "20 Nisan 2026"}
        </p>
      </header>

      {!isEn && (
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Gizlilik Politikası
          </h2>
          <p>
            FitMusc (&quot;biz&quot;, &quot;bize&quot; veya
            &quot;Platform&quot;), kullanıcılarının gizliliğine büyük önem
            vermektedir. Bu Gizlilik Politikası, kişisel verilerinizin nasıl
            toplandığı, işlendiği, saklandığı ve korunduğunu açıklamaktadır.
            Platformumuzu kullanarak bu politikayı kabul etmiş sayılırsınız.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Toplanan Veriler
          </h2>
          <p className="mb-2">
            FitMusc, hizmetlerini sunabilmek için aşağıdaki kategorilerdeki
            kişisel verileri toplamaktadır:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Kimlik Bilgileri:</strong> Ad,
              soyad, e-posta adresi
            </li>
            <li>
              <strong className="text-foreground">Sağlık Verileri:</strong> Boy,
              kilo, vücut ölçüleri (göğüs, bel, kalça, kol, bacak), sağlık
              notları, alerji bilgileri, kullanılan ilaçlar
            </li>
            <li>
              <strong className="text-foreground">Fitness Verileri:</strong>{" "}
              Antrenman kayıtları, öğün planları, takviye programları, ilerleme
              kayıtları
            </li>
            <li>
              <strong className="text-foreground">Kullanım Verileri:</strong>{" "}
              Oturum bilgileri, cihaz bilgileri, IP adresi, tarayıcı türü,
              erişim zamanları
            </li>
            <li>
              <strong className="text-foreground">
                Bildirim Verileri:
              </strong>{" "}
              Push bildirim aboneliği, bildirim tercihleri
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Veri İşleme Amacı
          </h2>
          <p className="mb-2">Toplanan veriler aşağıdaki amaçlarla işlenir:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Kişiselleştirilmiş fitness ve beslenme planları oluşturmak
            </li>
            <li>İlerlemenizi takip etmek ve analiz raporları sunmak</li>
            <li>
              Yapay zeka destekli öneriler ve analizler sağlamak (öğün
              varyasyonları, egzersiz form ipuçları, ilerleme analizi, AI koçluk
              sohbeti)
            </li>
            <li>
              Haftalık alışveriş listeleri ve takviye hatırlatmaları
              oluşturmak
            </li>
            <li>Hesap yönetimi ve kimlik doğrulama işlemleri</li>
            <li>
              Push bildirimleri ve e-posta yoluyla hatırlatmalar göndermek
            </li>
            <li>
              Platform güvenliğini sağlamak ve hizmet kalitesini iyileştirmek
            </li>
            <li>
              Plan paylaşım özelliğini sunmak (kullanıcıların izniyle
              salt-okunur erişim)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Üçüncü Taraf Paylaşımları
          </h2>
          <p className="mb-2">
            Verileriniz, yalnızca hizmet sunumu için gerekli olan aşağıdaki
            üçüncü taraf hizmet sağlayıcılarıyla paylaşılabilir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Anthropic (Claude AI):</strong>{" "}
              Yapay zeka destekli öneriler, analizler ve sohbet özellikleri için
              fitness ve beslenme verilerinizin anonim hale getirilmiş özetleri
              işlenir. Anthropic, bu verileri model eğitimi için kullanmaz.
            </li>
            <li>
              <strong className="text-foreground">
                Neon Database (PostgreSQL):
              </strong>{" "}
              Tüm kullanıcı verilerinin güvenli bir şekilde saklandığı
              veritabanı hizmetidir. Veriler şifrelenmiş bağlantı üzerinden
              aktarılır.
            </li>
            <li>
              <strong className="text-foreground">Mailjet:</strong> Davet
              e-postaları, şifre sıfırlama bağlantıları ve bildirimler için
              e-posta gönderim hizmeti olarak kullanılır. Yalnızca e-posta
              adresi ve ilgili mesaj içeriği paylaşılır.
            </li>
            <li>
              <strong className="text-foreground">Vercel:</strong> Platformun
              barındırıldığı altyapı sağlayıcısıdır. Sunucu tabanlı işlemler ve
              statik içerikler Vercel üzerinde çalışır.
            </li>
          </ul>
          <p className="mt-2">
            Verileriniz, yukarıda belirtilen amaçlar dışında hiçbir üçüncü
            tarafla paylaşılmaz, satılmaz veya kiralanmaz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Çerezler ve Yerel Depolama
          </h2>
          <p>
            FitMusc, oturum yönetimi için HTTP çerezleri kullanmaktadır. Bu
            çerezler, kimlik doğrulama ve oturum sürekliliği için zorunludur.
            Push bildirim abonelikleri tarayıcınızın yerel depolamasında
            saklanır. Analitik veya reklam amaçlı üçüncü taraf çerezleri
            kullanılmamaktadır. Platform bir PWA (Progressive Web App) olarak
            çalışır ve çevrimdışı işlevsellik için Service Worker teknolojisini
            kullanır.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Veri Saklama Süresi
          </h2>
          <p>
            Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesap
            silme talebinde bulunmanız halinde, tüm kişisel verileriniz 30 gün
            içinde kalıcı olarak silinir. Yasal yükümlülükler gereği saklanması
            gereken veriler (örneğin fatura kayıtları), ilgili mevzuatın
            öngördüğü süre boyunca muhafaza edilir. Anonim hale getirilmiş
            istatistiksel veriler, hizmet iyileştirme amaçlı süresiz olarak
            saklanabilir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Kullanıcı Hakları
          </h2>
          <p className="mb-2">
            Kullanıcılarımız aşağıdaki haklara sahiptir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Kişisel verilerinize erişim talep etme</li>
            <li>Verilerinizin düzeltilmesini veya güncellenmesini isteme</li>
            <li>Verilerinizin silinmesini talep etme (unutulma hakkı)</li>
            <li>Veri işlemesine itiraz etme</li>
            <li>Verilerinizin taşınabilirliğini talep etme</li>
            <li>Bildirim tercihlerinizi dilediğiniz zaman değiştirme</li>
            <li>
              Paylaşılan planlara erişimi istediğiniz zaman iptal etme
            </li>
          </ul>
          <p className="mt-2">
            Bu haklarınızı kullanmak için aşağıdaki iletişim bilgilerinden bize
            ulaşabilirsiniz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Veri Güvenliği
          </h2>
          <p>
            Verilerinizin güvenliğini sağlamak için SSL/TLS şifreleme,
            güvenli oturum yönetimi, yetkilendirme kontrolleri ve düzenli
            güvenlik değerlendirmeleri uygulanmaktadır. Veritabanı bağlantıları
            şifrelenmiş kanallar üzerinden gerçekleştirilir. Parola bilgileri
            tek yönlü hash algoritması ile saklanır.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. İletişim
          </h2>
          <p>
            Gizlilik politikamız hakkında sorularınız veya talepleriniz için
            bizimle iletişime geçebilirsiniz:
          </p>
          <p className="mt-2">
            <strong className="text-foreground">FitMusc</strong>
            <br />
            E-posta:{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>
          </p>
        </div>
      </section>

      )}

      {isEn && (
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Privacy Policy
          </h2>
          <p>
            FitMusc (&quot;we&quot;, &quot;us&quot;, or &quot;Platform&quot;)
            values the privacy of its users. This Privacy Policy explains how
            your personal data is collected, processed, stored, and protected.
            By using our Platform, you agree to the terms described herein.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Data We Collect
          </h2>
          <p className="mb-2">
            FitMusc collects the following categories of personal data to
            deliver its services:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Identity Information:</strong>{" "}
              Name, surname, email address
            </li>
            <li>
              <strong className="text-foreground">Health Data:</strong> Height,
              weight, body measurements (chest, waist, hip, arm, leg), health
              notes, allergy information, current medications
            </li>
            <li>
              <strong className="text-foreground">Fitness Data:</strong> Workout
              logs, meal plans, supplement schedules, progress records
            </li>
            <li>
              <strong className="text-foreground">Usage Data:</strong> Session
              information, device details, IP address, browser type, access
              timestamps
            </li>
            <li>
              <strong className="text-foreground">
                Notification Data:
              </strong>{" "}
              Push notification subscription, notification preferences
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Purpose of Data Processing
          </h2>
          <p className="mb-2">
            The collected data is processed for the following purposes:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Creating personalized fitness and nutrition plans</li>
            <li>Tracking your progress and providing analytical reports</li>
            <li>
              Providing AI-powered suggestions and analyses (meal variations,
              exercise form tips, progress analysis, AI coaching chat)
            </li>
            <li>
              Generating weekly shopping lists and supplement reminders
            </li>
            <li>Account management and authentication</li>
            <li>Sending reminders via push notifications and email</li>
            <li>Ensuring platform security and improving service quality</li>
            <li>
              Providing plan sharing functionality (read-only access with user
              consent)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Third-Party Data Sharing
          </h2>
          <p className="mb-2">
            Your data may be shared with the following third-party service
            providers solely for the purpose of delivering our services:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Anthropic (Claude AI):</strong>{" "}
              Anonymized summaries of your fitness and nutrition data are
              processed for AI-powered suggestions, analyses, and chat features.
              Anthropic does not use this data for model training.
            </li>
            <li>
              <strong className="text-foreground">
                Neon Database (PostgreSQL):
              </strong>{" "}
              Secure cloud database service where all user data is stored. Data
              is transmitted over encrypted connections.
            </li>
            <li>
              <strong className="text-foreground">Mailjet:</strong> Email
              delivery service used for invitation emails, password reset links,
              and notifications. Only email addresses and relevant message
              content are shared.
            </li>
            <li>
              <strong className="text-foreground">Vercel:</strong>{" "}
              Infrastructure provider hosting the Platform. Server-side
              operations and static content run on Vercel.
            </li>
          </ul>
          <p className="mt-2">
            Your data will not be shared with, sold to, or rented to any third
            party outside of the purposes stated above.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Cookies and Local Storage
          </h2>
          <p>
            FitMusc uses HTTP cookies for session management. These cookies are
            essential for authentication and session persistence. Push
            notification subscriptions are stored in your browser&apos;s local
            storage. No third-party analytics or advertising cookies are used.
            The Platform operates as a PWA (Progressive Web App) and uses
            Service Worker technology for offline functionality.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Data Retention Period
          </h2>
          <p>
            Your personal data is retained for as long as your account remains
            active. Upon request for account deletion, all personal data will be
            permanently deleted within 30 days. Data required to be retained for
            legal obligations (e.g., billing records) will be kept for the
            duration mandated by applicable legislation. Anonymized statistical
            data may be retained indefinitely for service improvement purposes.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. User Rights
          </h2>
          <p className="mb-2">Our users have the following rights:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Request access to your personal data</li>
            <li>Request correction or updating of your data</li>
            <li>
              Request deletion of your data (right to be forgotten)
            </li>
            <li>Object to data processing</li>
            <li>Request data portability</li>
            <li>Change your notification preferences at any time</li>
            <li>Revoke access to shared plans at any time</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us using the
            information provided below.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Data Security
          </h2>
          <p>
            We implement SSL/TLS encryption, secure session management,
            authorization controls, and regular security assessments to protect
            your data. Database connections are established over encrypted
            channels. Passwords are stored using one-way hashing algorithms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Contact
          </h2>
          <p>
            For questions or requests regarding our Privacy Policy, please
            contact us:
          </p>
          <p className="mt-2">
            <strong className="text-foreground">FitMusc</strong>
            <br />
            Email:{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>
          </p>
        </div>
      </section>
      )}
    </div>
  );
}
