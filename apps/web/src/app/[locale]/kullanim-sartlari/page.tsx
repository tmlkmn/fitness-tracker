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
      href: "/kullanim-sartlari",
      locale,
      title: isEn ? "Terms of Service" : "Kullanım Şartları",
      description: isEn
        ? "FitMusc terms of service: membership conditions, user obligations, AI feature disclaimer, limitation of liability, and termination terms."
        : "FitMusc kullanım şartları: üyelik koşulları, kullanıcı yükümlülükleri, AI özellikleri uyarısı, sorumluluk sınırları ve fesih koşulları.",
    }),
    robots: { index: true, follow: true },
  };
}

export default async function KullanimSartlariPage() {
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
          {isEn ? "Terms of Service" : "Kullanım Şartları"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {isEn ? "Last updated" : "Son güncelleme"}: {isEn ? "April 20, 2026" : "20 Nisan 2026"}
        </p>
      </header>

      {!isEn && (
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Kullanım Şartları
          </h2>
          <p>
            Aşağıdaki kullanım şartları (&quot;Şartlar&quot;), FitMusc
            platformunu (&quot;Platform&quot;, &quot;Hizmet&quot;) kullanımınızı
            düzenlemektedir. Platformu kullanarak bu Şartları kabul etmiş
            sayılırsınız. Şartları kabul etmiyorsanız Platformu
            kullanmayınız.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Hizmet Tanımı
          </h2>
          <p>
            FitMusc, kişiselleştirilmiş fitness ve beslenme takibi hizmeti sunan
            bir web uygulamasıdır. Platform aşağıdaki hizmetleri sağlar:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>
              Kişiselleştirilmiş haftalık antrenman ve beslenme planları
            </li>
            <li>Günlük öğün takibi ve besin değeri hesaplamaları</li>
            <li>Egzersiz kayıtları ve antrenman takibi</li>
            <li>Takviye (supplement) programı yönetimi</li>
            <li>Vücut ölçüleri ve kilo takibi ile ilerleme grafikleri</li>
            <li>Haftalık alışveriş listesi oluşturma</li>
            <li>
              Yapay zeka destekli öneriler (öğün varyasyonları, egzersiz form
              ipuçları, ilerleme analizi, AI koçluk sohbeti)
            </li>
            <li>Plan paylaşımı (salt-okunur erişim)</li>
            <li>
              Hatırlatma ve bildirim sistemi (push, e-posta, uygulama içi)
            </li>
          </ul>
          <p className="mt-2">
            Platform, Progressive Web App (PWA) olarak mobil ve masaüstü
            cihazlarda kullanılabilir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Üyelik Koşulları
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Platform yalnızca davet usulü ile çalışmaktadır. Yeni kullanıcılar
              yalnızca yönetici tarafından davet edilebilir.
            </li>
            <li>
              Üye olmak için 18 yaşını doldurmuş olmanız gerekmektedir.
            </li>
            <li>
              Davet e-postası ile gönderilen geçici şifre 24 saat geçerlidir.
              İlk girişte şifrenizi değiştirmeniz zorunludur.
            </li>
            <li>
              Hesap bilgilerinizin güvenliğinden siz sorumlusunuz. Şifrenizi
              üçüncü kişilerle paylaşmayınız.
            </li>
            <li>
              Her kullanıcı yalnızca bir hesap oluşturabilir. Hesabınızı başka
              birine devredemezsiniz.
            </li>
            <li>
              FitMusc, herhangi bir zamanda ve herhangi bir sebeple davet veya
              üyelik talebini reddetme hakkını saklı tutar.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Kullanıcı Yükümlülükleri
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Platformu yalnızca kişisel fitness ve beslenme takibi amacıyla
              kullanacağınızı kabul edersiniz.
            </li>
            <li>
              Sağladığınız bilgilerin doğru ve güncel olması sizin
              sorumluluğunuzdadır. Yanlış sağlık bilgisi girmeniz durumunda
              oluşabilecek sonuçlardan FitMusc sorumlu değildir.
            </li>
            <li>
              Platformu yasa dışı amaçlarla, başkalarının haklarına tecavüz
              edecek şekilde veya Platformun normal işleyişini bozacak şekilde
              kullanamazsınız.
            </li>
            <li>
              Platformun güvenlik önlemlerini aşmayı, tersine mühendislik
              yapmayı veya yetkisiz erişim elde etmeyi denemeyeceksiniz.
            </li>
            <li>
              Paylaşılan planlara yalnızca salt-okunur erişim verilmektedir.
              Paylaşılan içerikleri izinsiz kopyalama, dağıtma veya ticari amaçla
              kullanma yasaktır.
            </li>
            <li>
              AI özelliklerini kötü niyetli, yanıltıcı veya zarar verici
              içeriklerin üretilmesi amacıyla kullanamazsınız.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Fikri Mülkiyet
          </h2>
          <p>
            Platform üzerindeki tüm içerikler, yazılım, tasarım, logolar,
            grafikler ve diğer materyaller FitMusc&apos;in fikri mülkiyetindedir
            ve telif hakları ile korunmaktadır. Kullanıcılar, Platformu
            kullanarak bu içerikler üzerinde herhangi bir mülkiyet hakkı elde
            etmez.
          </p>
          <p className="mt-2">
            Kullanıcı tarafından girilen kişisel veriler, antrenman kayıtları ve
            beslenme bilgileri kullanıcının mülkiyetinde kalır. FitMusc, bu
            verileri yalnızca hizmet sunumu amacıyla kullanır.
          </p>
          <p className="mt-2">
            AI özellikleri tarafından üretilen içerikler (öğün önerileri,
            egzersiz ipuçları, analizler) genel bilgi niteliği taşır ve herhangi
            bir fikri mülkiyet hakkı oluşturmaz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Sorumluluk Sınırlaması
          </h2>
          <p>
            FitMusc, Platformu &quot;olduğu gibi&quot; ve &quot;mevcut
            haliyle&quot; sunmaktadır. Aşağıdaki hususlarda sorumluluğumuz
            sınırlıdır:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>
              Platform üzerinden sağlanan bilgiler genel fitness ve beslenme
              bilgisi niteliği taşır. Herhangi bir sağlık durumu için tıbbi
              tavsiye yerine geçmez.
            </li>
            <li>
              Platformun kesintisiz, hatasız veya güvenli olacağını garanti
              etmemekteyiz. Teknik arızalar, bakım çalışmaları veya mücbir
              sebepler nedeniyle hizmet kesintileri yaşanabilir.
            </li>
            <li>
              Kullanıcının Platformu kullanmasından kaynaklanan dolaylı,
              arızi, özel veya cezai zararlardan FitMusc sorumlu tutulamaz.
            </li>
            <li>
              Üçüncü taraf hizmet sağlayıcılarının (veritabanı, e-posta,
              barındırma, AI) neden olduğu kesinti veya veri kayıplarından
              dolayı sorumluluğumuz sınırlıdır.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. AI Özellikleri Uyarısı
          </h2>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="font-semibold text-foreground mb-2">
              Önemli Uyarı: Yapay Zeka Özellikleri Tıbbi Tavsiye Değildir
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                FitMusc&apos;in yapay zeka destekli özellikleri (öğün
                varyasyonları, egzersiz form ipuçları, ilerleme analizi, AI
                koçluk sohbeti) yalnızca genel bilgilendirme amacıyla
                sunulmaktadır.
              </li>
              <li>
                Bu öneriler, bir doktor, diyetisyen, fizyoterapist veya
                herhangi bir sağlık profesyonelinin tavsiyesi yerine geçmez.
              </li>
              <li>
                Herhangi bir sağlık sorununuz, alerjiniz, ilaç
                etkileşiminiz veya özel beslenme ihtiyacınız varsa, AI
                önerilerini uygulamadan önce mutlaka bir sağlık profesyoneline
                danışınız.
              </li>
              <li>
                AI tarafından üretilen içerikler otomatik olarak oluşturulur ve
                hatalar içerebilir. Üretilen içeriklerin doğruluğunu teyit etmek
                kullanıcının sorumluluğundadır.
              </li>
              <li>
                AI özelliklerinin kullanılmasından doğan sağlık sorunları veya
                zararlardan FitMusc sorumlu tutulamaz.
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Fesih Koşulları
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Kullanıcı, herhangi bir zamanda hesabının silinmesini talep
              ederek Platformu kullanmayı sonlandırabilir. Hesap silme
              talebi{" "}
              <a
                href="mailto:destek@fitmusc.com"
                className="text-primary hover:underline"
              >
                destek@fitmusc.com
              </a>{" "}
              adresine iletilmelidir.
            </li>
            <li>
              Hesap silindiğinde, tüm kişisel veriler 30 gün içinde kalıcı
              olarak silinir.
            </li>
            <li>
              FitMusc, bu Şartların ihlali halinde kullanıcı hesabını önceden
              bildirim yaparak veya yapmaksızın askıya alma veya sonlandırma
              hakkını saklı tutar.
            </li>
            <li>
              Platform hizmetinin tamamen durdurulması halinde, kullanıcılar en
              az 30 gün öncesinden bilgilendirilir ve verilerini indirme imkanı
              tanınır.
            </li>
            <li>
              Fesih sonrasında, kullanıcının Platforma erişimi derhal
              sonlandırılır. Paylaşılan planlar otomatik olarak iptal edilir.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Değişiklikler
          </h2>
          <p>
            FitMusc, bu Şartları herhangi bir zamanda değiştirme hakkını saklı
            tutar. Önemli değişiklikler, Platform üzerinden veya e-posta
            yoluyla bildirilir. Değişikliklerden sonra Platformu kullanmaya
            devam etmeniz, güncellenmiş şartları kabul ettiğiniz anlamına
            gelir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Uygulanacak Hukuk ve Uyuşmazlık Çözümü
          </h2>
          <p>
            Bu Şartlar, Türkiye Cumhuriyeti kanunlarına tabidir. Şartlardan
            kaynaklanan veya Şartlarla bağlantılı uyuşmazlıkların çözümünde
            İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. İletişim
          </h2>
          <p>
            Kullanım şartları hakkında sorularınız için bizimle iletişime
            geçebilirsiniz:
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
            Terms of Service
          </h2>
          <p>
            The following terms of service (&quot;Terms&quot;) govern your use
            of the FitMusc platform (&quot;Platform&quot;,
            &quot;Service&quot;). By using the Platform, you agree to be bound
            by these Terms. If you do not agree to these Terms, do not use the
            Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Service Description
          </h2>
          <p>
            FitMusc is a web application providing personalized fitness and
            nutrition tracking services, including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Personalized weekly workout and nutrition plans</li>
            <li>Daily meal tracking and nutritional value calculations</li>
            <li>Exercise logging and workout tracking</li>
            <li>Supplement program management</li>
            <li>
              Body measurement and weight tracking with progress charts
            </li>
            <li>Weekly shopping list generation</li>
            <li>
              AI-powered suggestions (meal variations, exercise form tips,
              progress analysis, AI coaching chat)
            </li>
            <li>Plan sharing (read-only access)</li>
            <li>
              Reminder and notification system (push, email, in-app)
            </li>
          </ul>
          <p className="mt-2">
            The Platform is available as a Progressive Web App (PWA) on mobile
            and desktop devices.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Membership Conditions
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              The Platform operates on an invitation-only basis. New users can
              only be invited by an administrator.
            </li>
            <li>You must be at least 18 years old to become a member.</li>
            <li>
              Temporary passwords sent via invitation email are valid for 24
              hours. You must change your password upon first login.
            </li>
            <li>
              You are responsible for the security of your account credentials.
              Do not share your password with third parties.
            </li>
            <li>
              Each user may create only one account. You may not transfer your
              account to another person.
            </li>
            <li>
              FitMusc reserves the right to refuse any invitation or membership
              request at any time and for any reason.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. User Obligations
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              You agree to use the Platform solely for personal fitness and
              nutrition tracking purposes.
            </li>
            <li>
              You are responsible for ensuring the accuracy and currency of the
              information you provide. FitMusc is not liable for consequences
              arising from incorrect health information entered by you.
            </li>
            <li>
              You may not use the Platform for illegal purposes, in a manner
              that infringes on the rights of others, or in a way that disrupts
              the normal operation of the Platform.
            </li>
            <li>
              You shall not attempt to bypass security measures, reverse
              engineer, or gain unauthorized access to the Platform.
            </li>
            <li>
              Shared plans provide read-only access. Unauthorized copying,
              distribution, or commercial use of shared content is prohibited.
            </li>
            <li>
              You may not use AI features to generate malicious, misleading, or
              harmful content.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Intellectual Property
          </h2>
          <p>
            All content, software, designs, logos, graphics, and other materials
            on the Platform are the intellectual property of FitMusc and are
            protected by copyright laws. Users do not acquire any ownership
            rights over these materials by using the Platform.
          </p>
          <p className="mt-2">
            Personal data, workout logs, and nutrition information entered by
            users remain the property of the user. FitMusc uses this data solely
            for service delivery purposes.
          </p>
          <p className="mt-2">
            Content generated by AI features (meal suggestions, exercise tips,
            analyses) is general information in nature and does not create any
            intellectual property rights.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Limitation of Liability
          </h2>
          <p>
            FitMusc provides the Platform on an &quot;as is&quot; and &quot;as
            available&quot; basis. Our liability is limited in the following
            respects:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>
              Information provided through the Platform is general fitness and
              nutrition information. It does not substitute for medical advice
              for any health condition.
            </li>
            <li>
              We do not guarantee that the Platform will be uninterrupted,
              error-free, or secure. Service interruptions may occur due to
              technical failures, maintenance, or force majeure.
            </li>
            <li>
              FitMusc shall not be held liable for indirect, incidental,
              special, or punitive damages arising from the user&apos;s use of
              the Platform.
            </li>
            <li>
              Our liability for interruptions or data loss caused by third-party
              service providers (database, email, hosting, AI) is limited.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. AI Features Disclaimer
          </h2>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="font-semibold text-foreground mb-2">
              Important Notice: AI Features Are Not Medical Advice
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                FitMusc&apos;s AI-powered features (meal variations, exercise
                form tips, progress analysis, AI coaching chat) are provided for
                general informational purposes only.
              </li>
              <li>
                These suggestions do not replace the advice of a doctor,
                dietitian, physiotherapist, or any other healthcare professional.
              </li>
              <li>
                If you have any health conditions, allergies, drug interactions,
                or special dietary needs, consult a healthcare professional
                before implementing AI recommendations.
              </li>
              <li>
                AI-generated content is produced automatically and may contain
                errors. Verifying the accuracy of generated content is the
                user&apos;s responsibility.
              </li>
              <li>
                FitMusc shall not be held liable for health issues or damages
                arising from the use of AI features.
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Termination
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Users may terminate their use of the Platform at any time by
              requesting account deletion. Deletion requests should be sent to{" "}
              <a
                href="mailto:destek@fitmusc.com"
                className="text-primary hover:underline"
              >
                destek@fitmusc.com
              </a>
              .
            </li>
            <li>
              Upon account deletion, all personal data will be permanently
              deleted within 30 days.
            </li>
            <li>
              FitMusc reserves the right to suspend or terminate user accounts
              with or without prior notice in case of Terms violation.
            </li>
            <li>
              In the event of complete service discontinuation, users will be
              notified at least 30 days in advance and given the opportunity to
              download their data.
            </li>
            <li>
              After termination, access to the Platform is immediately revoked.
              Shared plans are automatically canceled.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Changes
          </h2>
          <p>
            FitMusc reserves the right to modify these Terms at any time.
            Significant changes will be communicated through the Platform or via
            email. Continued use of the Platform after changes constitutes
            acceptance of the updated Terms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Governing Law and Dispute Resolution
          </h2>
          <p>
            These Terms are governed by the laws of the Republic of Turkey. The
            courts and enforcement offices of Istanbul shall have exclusive
            jurisdiction over any disputes arising from or related to these
            Terms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. Contact
          </h2>
          <p>
            For questions regarding these Terms of Service, please contact us:
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
