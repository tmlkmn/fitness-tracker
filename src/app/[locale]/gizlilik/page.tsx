import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik Politikasi",
  robots: { index: true, follow: true },
};

export default function GizlilikPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        &larr; Ana Sayfa
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Gizlilik Politikasi / Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Son guncelleme / Last updated: 20 Nisan 2026 / April 20, 2026
        </p>
      </header>

      {/* ============ TURKCE ============ */}
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Gizlilik Politikasi
          </h2>
          <p>
            FitMusc (&quot;biz&quot;, &quot;bize&quot; veya
            &quot;Platform&quot;), kullanicilarinin gizliligine buyuk onem
            vermektedir. Bu Gizlilik Politikasi, kisisel verilerinizin nasil
            toplandigi, islendigi, saklandigi ve korundugununu aciklamaktadir.
            Platformumuzu kullanarak bu politikayi kabul etmis sayilirsiniz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Toplanan Veriler
          </h2>
          <p className="mb-2">
            FitMusc, hizmetlerini sunabilmek icin asagidaki kategorilerdeki
            kisisel verileri toplamaktadir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Kimlik Bilgileri:</strong> Ad,
              soyad, e-posta adresi
            </li>
            <li>
              <strong className="text-foreground">Saglik Verileri:</strong> Boy,
              kilo, vucut olculeri (gogus, bel, kalca, kol, bacak), saglik
              notlari, alerji bilgileri, kullanilan ilaclar
            </li>
            <li>
              <strong className="text-foreground">Fitness Verileri:</strong>{" "}
              Antrenman kayitlari, ogun planlari, takviye programlari, ilerleme
              kayitlari
            </li>
            <li>
              <strong className="text-foreground">Kullanim Verileri:</strong>{" "}
              Oturum bilgileri, cihaz bilgileri, IP adresi, tarayici turu,
              erisim zamanlari
            </li>
            <li>
              <strong className="text-foreground">
                Bildirim Verileri:
              </strong>{" "}
              Push bildirim aboneligi, bildirim tercihleri
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Veri Isleme Amaci
          </h2>
          <p className="mb-2">Toplanan veriler asagidaki amaclarla islenir:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Kisisellestirilmis fitness ve beslenme planlari olusturmak
            </li>
            <li>Ilerlemenizi takip etmek ve analiz raporlari sunmak</li>
            <li>
              Yapay zeka destekli oneriler ve analizler saglamak (ogun
              varyasyonlari, egzersiz form ipuclari, ilerleme analizi, AI kocluk
              sohbeti)
            </li>
            <li>
              Haftalik alisveris listeleri ve takviye hatirlatmalari
              olusturmak
            </li>
            <li>Hesap yonetimi ve kimlik dogrulama islemleri</li>
            <li>
              Push bildirimleri ve e-posta yoluyla hatirlatmalar gondermek
            </li>
            <li>
              Platform guvenligini saglamak ve hizmet kalitesini iyilestirmek
            </li>
            <li>
              Plan paylasim ozelligini sunmak (kullanicilarin izniyle
              salt-okunur erisim)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Ucuncu Taraf Paylasimlari
          </h2>
          <p className="mb-2">
            Verileriniz, yalnizca hizmet sunumu icin gerekli olan asagidaki
            ucuncu taraf hizmet saglayicilariyla paylasabilir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Anthropic (Claude AI):</strong>{" "}
              Yapay zeka destekli oneriler, analizler ve sohbet ozellikleri icin
              fitness ve beslenme verilerinizin anonim hale getirilmis ozetleri
              islenir. Anthropic, bu verileri model egitimi icin kullanmaz.
            </li>
            <li>
              <strong className="text-foreground">
                Neon Database (PostgreSQL):
              </strong>{" "}
              Tum kullanici verilerinin guvenli bir sekilde saklandigi
              veritabani hizmetidir. Veriler sifrelenmis baglanti uzerinden
              aktarilir.
            </li>
            <li>
              <strong className="text-foreground">Mailjet:</strong> Davet
              e-postalari, sifre sifirlama baglantilari ve bildirimler icin
              e-posta gonderim hizmeti olarak kullanilir. Yalnizca e-posta
              adresi ve ilgili mesaj icerigi paylasalir.
            </li>
            <li>
              <strong className="text-foreground">Vercel:</strong> Platformun
              barindirildigi altyapi saglayicisidir. Sunucu tablali islemler ve
              statik icerikler Vercel uzerinde calisir.
            </li>
          </ul>
          <p className="mt-2">
            Verileriniz, yukarida belirtilen amaclar disinda hicbir ucuncu
            tarafla paylasalmaz, satilmaz veya kiralanmaz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Cerezler ve Yerel Depolama
          </h2>
          <p>
            FitMusc, oturum yonetimi icin HTTP cerezleri kullanmaktadir. Bu
            cerezler, kimlik dogrulama ve oturum surekliligi icin zorunludur.
            Push bildirim abonelikleri tarayicinizin yerel depolamasinda
            saklanir. Analitik veya reklam amacli ucuncu taraf cerezleri
            kullanilmamaktadir. Platform bir PWA (Progressive Web App) olarak
            calisir ve cevrimdisi islevsellik icin Service Worker teknolojisini
            kullanir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Veri Saklama Suresi
          </h2>
          <p>
            Kisisel verileriniz, hesabiniz aktif oldugu surece saklanir. Hesap
            silme talebinde bulunmaniz halinde, tum kisisel verileriniz 30 gun
            icinde kalici olarak silinir. Yasal yukumlulukler geregi saklanmasi
            gereken veriler (ornegin fatura kayitlari), ilgili mevzuatin
            ongorduugu sure boyunca muhafaza edilir. Anonim hale getirilmis
            istatistiksel veriler, hizmet iyilestirme amacli suresiz olarak
            saklanabilir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Kullanici Haklari
          </h2>
          <p className="mb-2">
            Kullanicilarimiz asagidaki haklara sahiptir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Kisisel verilerinize erisim talep etme</li>
            <li>Verilerinizin duzeltilmesini veya guncellenmesini isteme</li>
            <li>Verilerinizin silinmesini talep etme (unutulma hakki)</li>
            <li>Veri islemesine itiraz etme</li>
            <li>Verilerinizin tasinabilirligini talep etme</li>
            <li>Bildirim tercihlerinizi dilediginiz zaman degistirme</li>
            <li>
              Paylasilan planlara erisimi istediginiz zaman iptal etme
            </li>
          </ul>
          <p className="mt-2">
            Bu haklarinizi kullanmak icin asagidaki iletisim bilgilerinden bize
            ulasabilirsiniz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Veri Guvenligi
          </h2>
          <p>
            Verilerinizin guvenligini saglamak icin SSL/TLS sifreleme,
            guvenli oturum yonetimi, yetkilendirme kontrolleri ve duzenli
            guvenlik degerlendirmeleri uygulanmaktadir. Veritabani baglantilari
            sifrelenmis kanallar uzerinden gerceklestirilir. Parola bilgileri
            tek yonlu hash algoritmasi ile saklanir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Iletisim
          </h2>
          <p>
            Gizlilik politikamiz hakkinda sorulariniz veya talepleriniz icin
            bizimle iletisime gecebilirsiniz:
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

      <hr className="border-border" />

      {/* ============ ENGLISH ============ */}
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
    </div>
  );
}
