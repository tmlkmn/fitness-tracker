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
      href: "/kvkk",
      locale,
      title: isEn ? "KVKK Disclosure (English Summary)" : "KVKK Aydınlatma Metni",
      description: isEn
        ? "FitMusc KVKK disclosure (English summary): how personal and sensitive data is processed under Turkish Law No. 6698, data transfers, and your rights."
        : "FitMusc KVKK aydınlatma metni: 6698 sayılı Kanun kapsamında kişisel ve özel nitelikli verilerin işlenmesi, veri aktarımları ve ilgili kişi hakları.",
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

function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <tr>
      <td className="py-2 pr-4 align-top">{label}</td>
      <td className="py-2">{children}</td>
    </tr>
  );
}

const listClass = "list-disc list-inside space-y-1 ml-2";
const linkClass = "text-primary hover:underline";
const mail = (
  <a href="mailto:destek@fitmusc.com" className={linkClass}>
    destek@fitmusc.com
  </a>
);

export default async function KvkkPage() {
  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
        &larr; {isEn ? "Home" : "Ana Sayfa"}
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEn ? "KVKK Disclosure — English Summary" : "KVKK Aydınlatma Metni"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn ? "Last updated" : "Son güncelleme"}: {isEn ? "November 7, 2026" : "7 Kasım 2026"}
        </p>
        {isEn && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            Note: This document fulfills a Turkish statutory obligation (Law No. 6698) and is authoritative only in
            Turkish. The English summary below is provided for convenience.
          </p>
        )}
      </header>

      {isEn ? <KvkkEn /> : <KvkkTr />}
    </div>
  );
}

function KvkkTr() {
  return (
    <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <p>
        Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun (&quot;KVKK&quot;) 10. maddesi
        ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca,
        FitMusc web sitesi ve iOS/Android uygulamaları üzerinden işlenen kişisel verileriniz hakkında sizi
        bilgilendirmek için hazırlanmıştır. Ayrıntılar için{" "}
        <Link href="/gizlilik" className={linkClass}>
          Gizlilik Politikası
        </Link>
        &apos;na bakabilirsiniz.
      </p>

      <Section title="1. Veri Sorumlusu">
        <p>
          <strong className="text-foreground">Veri sorumlusu:</strong> FitMusc
          <br />
          <strong className="text-foreground">İletişim:</strong> {mail}
        </p>
      </Section>

      <Section title="2. İşlenen Kişisel Veriler">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-foreground font-semibold">Kategori</th>
                <th className="py-2 text-foreground font-semibold">Veriler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <Row label="Kimlik">Ad, soyad</Row>
              <Row label="İletişim">E-posta adresi; iyzico ile ödemede telefon ve adres</Row>
              <Row label="Sağlık verileri (özel nitelikli)">
                Boy, kilo, hedef kilo, vücut ölçüleri ve yağ oranı, sağlık notları, gıda alerjileri, sağlık durumları
                (yeme bozukluğu öyküsü, hamilelik/emzirme, diyabet, tiroid), kullanılan ilaçlar ve takviyeler
              </Row>
              <Row label="Fiziksel aktivite ve beslenme">
                Yaş, cinsiyet, aktivite ve fitness seviyesi, hedefler, spor geçmişi, günlük rutin, makro hedefleri,
                öğün ve antrenman planları, tamamlama, su, uyku ve hazır olma kayıtları, alışveriş listeleri
              </Row>
              <Row label="Yapay zeka">Koç sohbeti mesajları, isteklere eklenen notlar ve üretilen yanıtlar</Row>
              <Row label="Müşteri işlem ve finans">Abonelik durumu, faturalar; iyzico ile ödemede T.C. kimlik numarası</Row>
              <Row label="İşlem güvenliği">Oturum bilgileri, IP adresi, cihaz ve tarayıcı bilgisi, erişim zamanları, hata kayıtları</Row>
              <Row label="Bildirim">Push aboneliği ve mobil bildirim anahtarı, bildirim ve hatırlatıcı tercihleri</Row>
              <Row label="Rıza kayıtları">Açık rızaların verildiği ve geri alındığı tarih ve saat, çerez tercihi</Row>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Toplama Yöntemi">
        <p>
          Kişisel verileriniz; web sitesi ve mobil uygulamada doldurduğunuz formlar ve uygulamayı kullanımınız
          sırasında elektronik ortamda, oturum ve cihaz bilgileri otomatik olarak, ödeme bilgileri ise ödeme
          kuruluşlarından gelen bildirimlerle toplanır.
        </p>
      </Section>

      <Section title="4. İşleme Amaçları ve Hukuki Sebepler">
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong className="text-foreground">Sözleşmenin kurulması ve ifası (KVKK m.5/2-c):</strong> hesabın
            oluşturulması ve yönetimi, kimlik doğrulama, plan ve takip özellikleri, hatırlatıcı ve bildirimler,
            talebiniz üzerine plan paylaşımı, abonelik ve ödeme.
          </li>
          <li>
            <strong className="text-foreground">Hukuki yükümlülük (KVKK m.5/2-ç):</strong> faturaların ve mali
            kayıtların mevzuatta öngörülen süre boyunca saklanması.
          </li>
          <li>
            <strong className="text-foreground">Meşru menfaat (KVKK m.5/2-f):</strong> platform güvenliği, hataların
            tespiti ve giderilmesi, kötüye kullanımın önlenmesi.
          </li>
          <li>
            <strong className="text-foreground">Açık rıza (KVKK m.6/3-a):</strong> sağlık verilerinin kişisel plan
            sunulması amacıyla işlenmesi. Bu rıza uygulamayı kullanmaya başlamadan önce ayrıca alınır.
          </li>
          <li>
            <strong className="text-foreground">Açık rıza (KVKK m.6/3-a ve m.9):</strong> yapay zeka özellikleri için
            verilerin Anthropic&apos;e aktarılması. Bu rıza isteğe bağlıdır; verilmezse yapay zeka dışındaki tüm
            özellikler çalışır.
          </li>
        </ul>
      </Section>

      <Section title="5. Aktarılan Taraflar ve Amaçları">
        <p className="mb-2">
          Kişisel verileriniz yalnızca aşağıdaki hizmet sağlayıcılara, belirtilen amaçla ve KVKK&apos;nın 8. ve 9.
          maddelerine uygun olarak aktarılır. Hiçbir şekilde satılmaz.
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong className="text-foreground">Anthropic, PBC (ABD):</strong> yalnızca yapay zeka rızası verdiyseniz
            ve bir yapay zeka özelliğini kullandığınızda; o özelliğin gerektirdiği profil, sağlık (sağlık notları,
            alerjiler, sağlık durumları, ilaçlar, ölçümler) ve plan verileri ile sohbet mesajlarınız. Selamlama
            için yalnızca adınız gönderilir, e-posta adresiniz gönderilmez. Bu veriler anonim değildir. Anthropic
            bu verileri model eğitiminde kullanmaz.
          </li>
          <li>
            <strong className="text-foreground">Vercel, Inc. (ABD):</strong> platformun barındırılması; tüm istekler
            bu sunuculardan geçer. Çerez tercihinizde izin verirseniz çerezsiz, toplu kullanım ölçümü.
          </li>
          <li>
            <strong className="text-foreground">Neon (Databricks, ABD merkezli):</strong> veritabanı; veriler
            Frankfurt&apos;taki (AB) sunucularda saklanır.
          </li>
          <li>
            <strong className="text-foreground">Mailjet SAS (Fransa, AB):</strong> e-posta gönderimi; e-posta adresi
            ve mesaj içeriği.
          </li>
          <li>
            <strong className="text-foreground">Functional Software, Inc. — Sentry (ABD):</strong> hata takibi; hata
            mesajı, sayfa ve cihaz bilgisi (IP adresi ve çerezler hariç).
          </li>
          <li>
            <strong className="text-foreground">Expo (650 Industries, ABD), Apple ve Google:</strong> mobil ve web
            bildirimlerinin iletilmesi; bildirim anahtarı ve bildirim metni.
          </li>
          <li>
            <strong className="text-foreground">Lemon Squeezy (ABD) ve iyzico (Türkiye):</strong> abonelik ödemesi ve
            faturalama.
          </li>
          <li>
            <strong className="text-foreground">Diğer kullanıcılar:</strong> paylaştığınız planlar, adınız ve e-posta
            adresiniz yalnızca planı paylaştığınız kişilere. Paylaşım için alıcının e-posta adresi yazılır; kullanıcı
            listesi kimseye gösterilmez.
          </li>
        </ul>
        <p className="mt-2">
          Yurt dışındaki sağlayıcılara aktarım, KVKK m.9 kapsamında uygulamayı kullanmaya başlamadan önce
          alınan açık rızanıza dayanır; Anthropic&apos;e aktarım için ayrıca, isteğe bağlı açık rıza alınır.
        </p>
      </Section>

      <Section title="6. Saklama Süresi">
        <p>
          Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı sildiğinizde kişisel verileriniz hemen
          silinir ve veritabanı yedeklerinden en geç 30 gün içinde kalkar. Faturalar ve mali kayıtlar, vergi
          mevzuatının öngördüğü süre boyunca hesabınızla ilişkisi kaldırılarak saklanır.
        </p>
      </Section>

      <Section title="7. Açık Rızanın Geri Alınması">
        <p>
          Açık rızalarınızı Ayarlar → Verilerim&apos;den (mobil uygulamada Ayarlar → Gizlilik ve hesap) istediğiniz
          zaman geri alabilirsiniz. Geri alma, o tarihe kadar yapılan işlemleri etkilemez. Sağlık verisi rızası
          olmadan plan hizmeti sunulamaz; bu durumda verilerinizi indirebilir veya hesabınızı silebilirsiniz.
        </p>
      </Section>

      <Section title="8. İlgili Kişi Hakları (KVKK m.11)">
        <ul className={listClass}>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
          <li>KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme</li>
          <li>Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme</li>
          <li>Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ul>
      </Section>

      <Section title="9. Başvuru">
        <p>
          Haklarınızı kullanmak için, kayıtlı e-posta adresinizden {mail} adresine &quot;KVKK Bilgi Talebi&quot; konu
          başlığıyla yazabilirsiniz. Başvurunuzda kimliğinizi tespit edici bilgiler ve talebinizin açık
          açıklaması bulunmalıdır. Başvurular en geç 30 gün içinde ücretsiz sonuçlandırılır. Verilerinizi indirme,
          düzeltme, rızayı geri alma ve hesabı silme işlemlerini uygulama içinden de yapabilirsiniz.
        </p>
      </Section>
    </section>
  );
}

function KvkkEn() {
  return (
    <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <p>
        This summary of the disclosure under Article 10 of Turkish Personal Data Protection Law No. 6698
        (&quot;KVKK&quot;) explains how FitMusc processes personal data through its website and iOS/Android apps. See
        the{" "}
        <Link href="/gizlilik" className={linkClass}>
          Privacy Policy
        </Link>{" "}
        for details.
      </p>

      <Section title="Data Controller">
        <p>FitMusc. Contact: {mail}</p>
      </Section>

      <Section title="Personal Data Processed">
        <ul className={listClass}>
          <li>
            <strong className="text-foreground">Identity and contact:</strong> name, surname, email; phone and
            address for iyzico payments
          </li>
          <li>
            <strong className="text-foreground">Health data (sensitive):</strong> height, weight, target weight, body
            measurements and body fat, health notes, food allergies, health conditions, medications and supplements
          </li>
          <li>
            <strong className="text-foreground">Activity and nutrition:</strong> age, gender, activity and fitness
            level, goals, sports history, routine, macro targets, meal and workout plans, completion, water, sleep
            and readiness logs, shopping lists
          </li>
          <li>
            <strong className="text-foreground">AI:</strong> coach chat messages, notes added to requests, generated
            replies
          </li>
          <li>
            <strong className="text-foreground">Customer and finance:</strong> subscription status, invoices; Turkish
            ID number for iyzico payments
          </li>
          <li>
            <strong className="text-foreground">Security:</strong> session, IP address, device and browser details,
            access times, error logs
          </li>
          <li>
            <strong className="text-foreground">Notifications:</strong> push subscription and token, preferences
          </li>
          <li>
            <strong className="text-foreground">Consent records:</strong> when each consent was given or withdrawn,
            cookie choice
          </li>
        </ul>
      </Section>

      <Section title="Purposes and Legal Bases">
        <ul className={listClass}>
          <li>
            <strong className="text-foreground">Contract (Art. 5/2-c):</strong> account, plans and tracking,
            reminders, plan sharing on your request, subscription and payment
          </li>
          <li>
            <strong className="text-foreground">Legal obligation (Art. 5/2-ç):</strong> keeping invoices and financial
            records
          </li>
          <li>
            <strong className="text-foreground">Legitimate interest (Art. 5/2-f):</strong> security, error tracking,
            abuse prevention
          </li>
          <li>
            <strong className="text-foreground">Explicit consent (Art. 6/3-a):</strong> processing health data to
            provide plans, asked before you start using the app
          </li>
          <li>
            <strong className="text-foreground">Explicit consent (Art. 6/3-a and 9):</strong> transferring data to
            Anthropic for the AI features — optional
          </li>
        </ul>
      </Section>

      <Section title="Recipients">
        <p>
          Anthropic, PBC (USA) — AI features, only with your AI consent; the profile, health and plan data a
          feature needs and your chat messages (not anonymous; not used for model training). Vercel, Inc. (USA) —
          hosting. Neon (Databricks, US company) — database in Frankfurt (EU). Mailjet SAS (France) — email.
          Sentry (USA) — error tracking without IP addresses or cookies. Expo (USA), Apple and Google — push
          notifications. Lemon Squeezy (USA) and iyzico (Türkiye) — payments. Other users — only the people you share
          a plan with see it, your name and your email; you type the recipient&apos;s email and users are never
          listed.
          Transfers abroad rely on the explicit consent you give before using the app (KVKK Art. 9), and on a
          separate, optional consent for Anthropic.
        </p>
      </Section>

      <Section title="Retention and Withdrawal">
        <p>
          Data is kept while your account exists, deleted immediately when you delete your account and gone from
          backups within 30 days; invoices are kept detached from your account as tax law requires. You can
          withdraw your consents in Settings → My Data (mobile: Settings → Privacy &amp; account); withdrawal
          doesn&apos;t affect earlier processing.
        </p>
      </Section>

      <Section title="Your Rights (Article 11) and How to Apply">
        <p>
          You may learn whether and how your data is processed and to whom it is transferred, ask for correction
          or deletion and for those to be passed on to recipients, object to adverse results of solely automated
          analysis, and claim compensation for unlawful processing. Write to {mail} from your registered address
          with the subject &quot;KVKK Information Request&quot;; requests are answered free of charge within 30
          days.
        </p>
      </Section>
    </section>
  );
}
