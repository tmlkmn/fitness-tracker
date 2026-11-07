import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { normalizeLocale } from "@fitmusc/shared/locale";
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
        ? "FitMusc privacy policy: what personal and health data the website and mobile app collect, who receives it (including the AI provider), how long it is kept and your rights."
        : "FitMusc gizlilik politikası: web sitesi ve mobil uygulamanın hangi kişisel ve sağlık verilerini topladığı, kimlerle (yapay zeka sağlayıcısı dahil) paylaştığı, ne kadar sakladığı ve haklarınız.",
    }),
    robots: { index: true, follow: true },
  };
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Item({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <li>
      <strong className="text-foreground">{label}:</strong> {children}
    </li>
  );
}

const listClass = "list-disc list-inside space-y-1 ml-2";
const linkClass = "text-primary hover:underline";

export default async function GizlilikPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{isEn ? "Privacy Policy" : "Gizlilik Politikası"}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn ? "Last updated" : "Son güncelleme"}: {isEn ? "November 7, 2026" : "7 Kasım 2026"}
        </p>
      </header>

      {isEn ? <PrivacyEn /> : <PrivacyTr />}
    </div>
  );
}

function PrivacyTr() {
  return (
    <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <p>
        Bu politika, FitMusc web sitesinin ve iOS/Android uygulamalarının (&quot;Platform&quot;) hangi kişisel
        verileri topladığını, bunları kimlerle paylaştığını, ne kadar sakladığını ve haklarınızı açıklar. 6698
        sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki aydınlatma metni için{" "}
        <Link href="/kvkk" className={linkClass}>
          KVKK Aydınlatma Metni
        </Link>
        &apos;ne bakın. Sağlık verilerinizin işlenmesi ve yurt dışında saklanması için Platform&apos;u kullanmaya
        başlamadan önce, yapay zeka özellikleri için ise ayrıca açık rızanızı alırız (Bölüm 4).
      </p>

      <Section title="1. Toplanan Veriler">
        <ul className={listClass}>
          <Item label="Kimlik ve iletişim">Ad, soyad, e-posta adresi, dil tercihi.</Item>
          <Item label="Sağlık verileri (özel nitelikli)">
            Boy, kilo, hedef kilo, vücut ölçüleri ve yağ oranı, sağlık notları, gıda alerjileri, sağlık durumları
            (yeme bozukluğu öyküsü, hamilelik/emzirme, diyabet, tiroid), kullandığınız ilaçlar ve takviyeler.
          </Item>
          <Item label="Fitness ve beslenme">
            Yaş, cinsiyet, aktivite ve fitness seviyesi, hedefler, spor geçmişi, günlük rutin, makro hedefleri,
            öğün ve antrenman planları, tamamlama kayıtları, su, uyku ve hazır olma kayıtları, alışveriş listeleri.
          </Item>
          <Item label="Yapay zeka">Koç sohbetine yazdığınız mesajlar, isteklerinize eklediğiniz notlar ve üretilen yanıtlar.</Item>
          <Item label="Ödeme ve fatura">
            Abonelik durumu ve faturalar. iyzico ile ödemede fatura için ad soyad, T.C. kimlik numarası, telefon
            ve adres. Kart bilgileriniz bize ulaşmaz; ödeme kuruluşu tarafından işlenir.
          </Item>
          <Item label="Kullanım ve güvenlik">Oturum bilgileri, IP adresi, cihaz ve tarayıcı türü, erişim zamanları, hata kayıtları.</Item>
          <Item label="Bildirim">Web push aboneliği, mobil uygulamanın bildirim anahtarı (push token), bildirim ve hatırlatıcı tercihleri.</Item>
          <Item label="Rıza kayıtları">Açık rızalarınızı verdiğiniz veya geri aldığınız tarih ve saat; çerez tercihiniz.</Item>
        </ul>
      </Section>

      <Section title="2. Verileri Ne İçin Kullanıyoruz">
        <ul className={listClass}>
          <li>Kişiselleştirilmiş antrenman ve beslenme planları oluşturmak, ilerlemenizi takip etmek</li>
          <li>Yapay zeka özelliklerini sunmak (yalnızca açık rızanızla, Bölüm 3)</li>
          <li>Hesap yönetimi, kimlik doğrulama, abonelik ve faturalama</li>
          <li>Hatırlatıcı ve bildirim göndermek (uygulama içi, e-posta, push)</li>
          <li>Plan paylaşımı (yalnızca sizin seçtiğiniz kullanıcılarla, salt okunur)</li>
          <li>Platform güvenliği, hataların tespiti ve hizmetin iyileştirilmesi</li>
          <li>Faturaların saklanması gibi yasal yükümlülükler</li>
        </ul>
      </Section>

      <Section title="3. Verilerin Paylaşıldığı Taraflar">
        <p className="mb-2">Verileriniz satılmaz veya kiralanmaz. Yalnızca hizmeti sunmak için aşağıdaki sağlayıcılarla paylaşılır:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <Item label="Anthropic, PBC (ABD) — yapay zeka">
            Yalnızca bir yapay zeka özelliğini kullandığınızda ve buna açık rıza verdiyseniz, o özelliğin ihtiyaç
            duyduğu veriler gönderilir: yaş, cinsiyet, boy, kilo, hedef kilo, vücut ölçüleri, aktivite ve fitness
            seviyesi, hedefler, spor geçmişi, sağlık notları, gıda alerjileri, sağlık durumları, ilaçlar ve
            takviyeler, günlük rutin, makro hedefleri, öğün ve antrenman planları, su ve uyku kayıtları, sohbet
            mesajlarınız ve notlarınız. Selamlama mesajı için yalnızca adınız gönderilir; e-posta adresiniz hiçbir
            zaman gönderilmez. <strong className="text-foreground">Bu veriler anonim değildir</strong>, size ait
            sağlık bilgileri içerir. Anthropic, API üzerinden gelen verileri modellerini eğitmek için kullanmaz ve
            yalnızca hizmeti işletmek ve kötüye kullanımı önlemek için sınırlı bir süre saklar. Egzersiz
            gösterimleri için yalnızca egzersizin adı gönderilir; bu kişisel veri içermez.
          </Item>
          <Item label="Vercel, Inc. (ABD) — barındırma">
            Platform&apos;un sunucuları. Tüm istekler ve işlenen veriler bu altyapıdan geçer. Çerez tercihinizde
            analitiğe izin verirseniz Vercel Analytics ve Speed Insights ile çerezsiz, toplu kullanım ve performans
            ölçümü yapılır.
          </Item>
          <Item label="Neon (Databricks, ABD merkezli) — veritabanı">
            Tüm hesap verileri, Frankfurt&apos;taki (AB) sunucularda şifreli bağlantıyla saklanır.
          </Item>
          <Item label="Mailjet SAS (Fransa, AB) — e-posta">Davet, şifre sıfırlama, bildirim ve fatura e-postaları için e-posta adresiniz ve mesaj içeriği.</Item>
          <Item label="Functional Software, Inc. — Sentry (ABD) — hata takibi">
            Bir hata oluştuğunda hata mesajı, ilgili sayfa ve tarayıcı/cihaz bilgisi. IP adresi, çerezler ve
            istek başlıkları gönderilmez.
          </Item>
          <Item label="Bildirim servisleri">
            Mobil bildirimler Expo (650 Industries, ABD) üzerinden Apple ve Google&apos;ın bildirim servislerine,
            web bildirimleri tarayıcınızın bildirim servisine iletilir. Bu servisler cihazınızın bildirim anahtarını
            ve bildirimin başlığını ve metnini (ör. hatırlatıcı içeriği) alır.
          </Item>
          <Item label="Ödeme kuruluşları">
            Lemon Squeezy (ABD) ve iyzico (Türkiye), abonelik ödemesi ve faturalama için ödeme ve fatura bilgilerinizi işler.
          </Item>
          <Item label="Diğer kullanıcılar">
            Bir planı paylaştığınız kullanıcılar o planı, adınızı ve e-posta adresinizi görür. Paylaşmak için
            alıcının e-posta adresini sizin yazmanız gerekir; kullanıcı listesi kimseye gösterilmez.
          </Item>
        </ul>
      </Section>

      <Section title="4. Açık Rıza ve Yurt Dışına Aktarım">
        <p className="mb-2">Platform&apos;u kullanmaya başlamadan önce ayrı ayrı açık rızanızı alırız:</p>
        <ul className={listClass}>
          <li>Sağlık verilerinizin plan sunmak amacıyla işlenmesi (zorunlu)</li>
          <li>Verilerinizin yukarıdaki yurt dışındaki altyapı sağlayıcılarında saklanması ve bu amaçla aktarılması (zorunlu)</li>
          <li>Yapay zeka özellikleri için verilerinizin Anthropic&apos;e (ABD) gönderilmesi (isteğe bağlı)</li>
        </ul>
        <p className="mt-2">
          İlk iki rıza olmadan plan oluşturamayız; vermezseniz verilerinizi indirebilir veya hesabınızı
          silebilirsiniz. Yapay zeka rızası olmadan yapay zeka dışındaki her şey çalışır. Rızalarınızı verdiğiniz
          tarihle birlikte kaydederiz ve Ayarlar → Verilerim&apos;den (mobil uygulamada Ayarlar → Gizlilik ve hesap)
          istediğiniz zaman geri alabilirsiniz. Geri alma, o tarihe kadar yapılan işlemleri etkilemez.
        </p>
      </Section>

      <Section title="5. Çerezler ve Cihazda Saklanan Veriler">
        <p>
          Web&apos;de oturum için zorunlu çerezler kullanılır; analitik ölçüm yalnızca çerez bildiriminde izin
          verirseniz çalışır (
          <Link href="/cerez-politikasi" className={linkClass}>
            Çerez Politikası
          </Link>
          ). Çevrimdışı çalışabilmek için planlarınızın bir kopyası ve henüz gönderilemeyen tamamlama işaretleri
          cihazınızda tutulur (web&apos;de IndexedDB, mobilde uygulama depolaması); mobil uygulama oturum
          anahtarını cihazın güvenli deposunda saklar. Bu kopyalar çıkış yaptığınızda silinir. Reklam veya
          üçüncü taraf takip araçları kullanılmaz.
        </p>
      </Section>

      <Section title="6. Saklama Süresi">
        <p>
          Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı Ayarlar → Verilerim&apos;den (mobilde
          Ayarlar → Hesabımı sil) sildiğinizde kişisel verileriniz hemen silinir; veritabanı yedeklerinden en geç
          30 gün içinde kalkar. Faturalar, vergi mevzuatının öngördüğü süre boyunca hesabınızla ilişkisi
          kaldırılarak saklanır. Hata kayıtları ve sağlayıcıların sınırlı süreli kayıtları kendi saklama
          sürelerinin sonunda silinir.
        </p>
      </Section>

      <Section title="7. Haklarınız">
        <ul className={listClass}>
          <li>Verilerinize erişme ve hepsini indirme (Ayarlar → Verilerim → JSON indir)</li>
          <li>Düzeltme (profil ve ayarlar ekranlarından) ve silme (hesabı silme)</li>
          <li>Açık rızalarınızı geri alma</li>
          <li>İşlemeye itiraz etme ve KVKK m.11&apos;deki diğer haklar</li>
          <li>Bildirim tercihlerinizi ve plan paylaşımlarınızı istediğiniz zaman değiştirme</li>
        </ul>
        <p className="mt-2">Diğer talepleriniz için aşağıdaki adrese yazabilirsiniz.</p>
      </Section>

      <Section title="8. Veri Güvenliği">
        <p>
          Tüm bağlantılar TLS ile şifrelenir, parolalar tek yönlü özetlenerek saklanır, her istekte oturum ve
          kayıt sahipliği kontrol edilir.
        </p>
      </Section>

      <Section title="9. İletişim">
        <p>
          <strong className="text-foreground">FitMusc</strong>
          <br />
          E-posta:{" "}
          <a href="mailto:destek@fitmusc.com" className={linkClass}>
            destek@fitmusc.com
          </a>
        </p>
      </Section>
    </section>
  );
}

function PrivacyEn() {
  return (
    <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <p>
        This policy explains what personal data the FitMusc website and iOS/Android apps (the &quot;Platform&quot;)
        collect, who receives it, how long it is kept and your rights. For the disclosure under Turkish Law No.
        6698 (KVKK) see the{" "}
        <Link href="/kvkk" className={linkClass}>
          KVKK Disclosure
        </Link>
        . We ask for your explicit consent before processing your health data and storing it abroad, and
        separately for the AI features (Section 4).
      </p>

      <Section title="1. Data We Collect">
        <ul className={listClass}>
          <Item label="Identity and contact">Name, surname, email address, language.</Item>
          <Item label="Health data (sensitive)">
            Height, weight, target weight, body measurements and body fat, health notes, food allergies, health
            conditions (history of eating disorders, pregnancy/breastfeeding, diabetes, thyroid), medications and
            supplements you take.
          </Item>
          <Item label="Fitness and nutrition">
            Age, gender, activity and fitness level, goals, sports history, daily routine, macro targets, meal and
            workout plans, completion records, water, sleep and readiness logs, shopping lists.
          </Item>
          <Item label="AI">Messages you write to the coach, notes you add to requests and the generated replies.</Item>
          <Item label="Payment and billing">
            Subscription status and invoices. For payments via iyzico: name, Turkish ID number, phone and address
            for the invoice. Card details never reach us; the payment provider processes them.
          </Item>
          <Item label="Usage and security">Session data, IP address, device and browser type, access times, error logs.</Item>
          <Item label="Notifications">Web push subscription, the mobile app&apos;s push token, notification and reminder preferences.</Item>
          <Item label="Consent records">When you gave or withdrew each consent; your cookie choice.</Item>
        </ul>
      </Section>

      <Section title="2. Why We Use It">
        <ul className={listClass}>
          <li>Building personalized training and nutrition plans and tracking your progress</li>
          <li>Providing the AI features (only with your explicit consent, Section 3)</li>
          <li>Account management, authentication, subscriptions and billing</li>
          <li>Sending reminders and notifications (in-app, email, push)</li>
          <li>Plan sharing (read-only, only with users you choose)</li>
          <li>Platform security, finding errors and improving the service</li>
          <li>Legal obligations such as keeping invoices</li>
        </ul>
      </Section>

      <Section title="3. Who Receives Your Data">
        <p className="mb-2">We never sell or rent your data. It is shared only with these providers, to run the service:</p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <Item label="Anthropic, PBC (USA) — AI">
            Only when you use an AI feature and have given your explicit consent, the data that feature needs is
            sent: age, gender, height, weight, target weight, body measurements, activity and fitness level,
            goals, sports history, health notes, food allergies, health conditions, medications and supplements,
            daily routine, macro targets, meal and workout plans, water and sleep logs, your chat messages and
            notes. The greeting only gets your first name; your email address is never sent.{" "}
            <strong className="text-foreground">This data is not anonymous</strong> — it includes your health
            information. Anthropic does not use API data to train its models and keeps it only for a limited time
            to operate the service and prevent abuse. Exercise demos only send the exercise name, which is not
            personal data.
          </Item>
          <Item label="Vercel, Inc. (USA) — hosting">
            The Platform&apos;s servers; every request and the data it carries pass through them. If you allow
            analytics in the cookie banner, Vercel Analytics and Speed Insights measure usage and performance in
            aggregate, without cookies.
          </Item>
          <Item label="Neon (Databricks, US company) — database">All account data, stored on servers in Frankfurt (EU) over encrypted connections.</Item>
          <Item label="Mailjet SAS (France, EU) — email">Your email address and the message for invitations, password resets, notifications and invoices.</Item>
          <Item label="Functional Software, Inc. — Sentry (USA) — error tracking">
            When an error occurs: the error message, the page and browser/device details. No IP addresses, cookies
            or request headers.
          </Item>
          <Item label="Notification services">
            Mobile notifications go through Expo (650 Industries, USA) to Apple&apos;s and Google&apos;s push
            services, web notifications through your browser&apos;s push service. They receive your device&apos;s
            push token and the notification&apos;s title and text (e.g. a reminder).
          </Item>
          <Item label="Payment providers">Lemon Squeezy (USA) and iyzico (Türkiye) process payment and billing details for subscriptions.</Item>
          <Item label="Other users">
            Users you share a plan with see that plan, your name and your email address. To share, you type the
            recipient&apos;s email address; the list of users is never shown to anyone.
          </Item>
        </ul>
      </Section>

      <Section title="4. Explicit Consent and Transfers Abroad">
        <p className="mb-2">Before you start using the Platform we ask for each of these separately:</p>
        <ul className={listClass}>
          <li>Processing your health data to provide plans (required)</li>
          <li>Storing your data with the infrastructure providers abroad listed above (required)</li>
          <li>Sending your data to Anthropic (USA) for the AI features (optional)</li>
        </ul>
        <p className="mt-2">
          We can&apos;t build plans without the first two; if you don&apos;t give them you can download your data or
          delete your account. Without the AI consent everything except AI works. We record each consent with its
          date, and you can withdraw it any time in Settings → My Data (in the mobile app: Settings → Privacy &amp;
          account). Withdrawing doesn&apos;t affect processing that already happened.
        </p>
      </Section>

      <Section title="5. Cookies and Data on Your Device">
        <p>
          The website uses essential cookies for your session; analytics only run if you allow them in the cookie
          banner (
          <Link href="/cerez-politikasi" className={linkClass}>
            Cookie Policy
          </Link>
          ). To work offline, a copy of your plans and completion ticks not yet sent are kept on your device
          (IndexedDB on the web, app storage on mobile); the mobile app keeps its session key in the device&apos;s
          secure storage. These copies are removed when you sign out. No advertising or third-party tracking tools
          are used.
        </p>
      </Section>

      <Section title="6. How Long We Keep It">
        <p>
          Your data is kept while your account exists. When you delete your account in Settings → My Data (on
          mobile: Settings → Delete my account) your personal data is deleted immediately and leaves database
          backups within 30 days. Invoices are kept, detached from your account, for as long as tax law requires.
          Error logs and providers&apos; short-lived records are deleted at the end of their retention periods.
        </p>
      </Section>

      <Section title="7. Your Rights">
        <ul className={listClass}>
          <li>Access your data and download all of it (Settings → My Data → Download JSON)</li>
          <li>Correct it (profile and settings screens) and delete it (delete your account)</li>
          <li>Withdraw your consents</li>
          <li>Object to processing, and the other rights under KVKK Art. 11</li>
          <li>Change notification preferences and plan shares at any time</li>
        </ul>
        <p className="mt-2">For anything else, write to the address below.</p>
      </Section>

      <Section title="8. Security">
        <p>
          All connections are encrypted with TLS, passwords are stored as one-way hashes, and every request checks
          the session and who owns the record.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          <strong className="text-foreground">FitMusc</strong>
          <br />
          Email:{" "}
          <a href="mailto:destek@fitmusc.com" className={linkClass}>
            destek@fitmusc.com
          </a>
        </p>
      </Section>
    </section>
  );
}
