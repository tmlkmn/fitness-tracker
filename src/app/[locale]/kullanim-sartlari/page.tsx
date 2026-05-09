import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kullanim Sartlari",
  robots: { index: true, follow: true },
};

export default function KullanimSartlariPage() {
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
          Kullanim Sartlari / Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Son guncelleme / Last updated: 20 Nisan 2026 / April 20, 2026
        </p>
      </header>

      {/* ============ TURKCE ============ */}
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Kullanim Sartlari
          </h2>
          <p>
            Asagidaki kullanim sartlari (&quot;Sartlar&quot;), FitMusc
            platformunu (&quot;Platform&quot;, &quot;Hizmet&quot;) kullaniminizi
            duzenlemektedir. Platformu kullanarak bu Sartlari kabul etmis
            sayilirsiniz. Sartlari kabul etmiyorsaniz Platformu
            kullanmayiniz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Hizmet Tanimi
          </h2>
          <p>
            FitMusc, kisisellestirilmis fitness ve beslenme takibi hizmeti sunan
            bir web uygulamasidir. Platform asagidaki hizmetleri saglar:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>
              Kisisellestirilmis haftalik antrenman ve beslenme planlari
            </li>
            <li>Gunluk ogun takibi ve besin degeri hesaplamalari</li>
            <li>Egzersiz kayitlari ve antrenman takibi</li>
            <li>Takviye (supplement) programi yonetimi</li>
            <li>Vucut olculeri ve kilo takibi ile ilerleme grafikleri</li>
            <li>Haftalik alisveris listesi olusturma</li>
            <li>
              Yapay zeka destekli oneriler (ogun varyasyonlari, egzersiz form
              ipuclari, ilerleme analizi, AI kocluk sohbeti)
            </li>
            <li>Plan paylasimi (salt-okunur erisim)</li>
            <li>
              Hatirlatma ve bildirim sistemi (push, e-posta, uygulama ici)
            </li>
          </ul>
          <p className="mt-2">
            Platform, Progressive Web App (PWA) olarak mobil ve masaustu
            cihazlarda kullanilabilir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Uyelik Kosullari
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Platform yalnizca davet usulu ile calismaktadir. Yeni kullanicilar
              yalnizca yonetici tarafindan davet edilebilir.
            </li>
            <li>
              Uye olmak icin 18 yasini doldurmus olmaniz gerekmektedir.
            </li>
            <li>
              Davet e-postasi ile gonderilen gecici sifre 24 saat gecerlidir.
              Ilk giriste sifrenizi degistirmeniz zorunludur.
            </li>
            <li>
              Hesap bilgilerinizin guvenliginden siz sorumlusunuz. Sifrenizi
              ucuncu kisilerle paylasmayiniz.
            </li>
            <li>
              Her kullanici yalnizca bir hesap olusturabilir. Hesabinizi baska
              birine devredemezsiniz.
            </li>
            <li>
              FitMusc, herhangi bir zamanda ve herhangi bir sebeple davet veya
              uyelik talebini reddetme hakkini sakli tutar.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Kullanici Yukumlulukleri
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Platformu yalnizca kisisel fitness ve beslenme takibi amaciyla
              kullanacaginizi kabul edersiniz.
            </li>
            <li>
              Sagladiginiz bilgilerin dogru ve guncel olmasi sizin
              sorumlulugunuzdadir. Yanlis saglik bilgisi girmeniz durumunda
              olusabilecek sonuclardan FitMusc sorumlu degildir.
            </li>
            <li>
              Platformu yasa disi amaclarla, baskalarinin haklarina tecavuz
              edecek sekilde veya Platformun normal isleyisini bozacak sekilde
              kullanamazsiniz.
            </li>
            <li>
              Platformun guvenlik onlemlerini asmayi, tersine muhendislik
              yapmayi veya yetkisiz erisim elde etmeyi denemeyeceksiniz.
            </li>
            <li>
              Paylasilan planlara yalnizca salt-okunur erisim verilmektedir.
              Paylasilan icerikleri izinsiz kopyalama, dagitma veya ticari amacla
              kullanma yasaktir.
            </li>
            <li>
              AI ozelliklerini kotu niyetli, yaniltici veya zarar verici
              iceriklerin uretilmesi amaciyla kullanamazsiniz.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Fikri Mulkiyet
          </h2>
          <p>
            Platform uzerindeki tum icerikler, yazilim, tasarim, logolar,
            grafikler ve diger materyaller FitMusc&apos;in fikri mulkiyetindedir
            ve telif haklari ile korunmaktadir. Kullanicilar, Platformu
            kullanarak bu icerikler uzerinde herhangi bir mulkiyet hakki elde
            etmez.
          </p>
          <p className="mt-2">
            Kullanici tarafindan girilen kisisel veriler, antrenman kayitlari ve
            beslenme bilgileri kullanicinin mulkiyetinde kalir. FitMusc, bu
            verileri yalnizca hizmet sunumu amaciyla kullanir.
          </p>
          <p className="mt-2">
            AI ozellikleri tarafindan uretilen icerikler (ogun onerileri,
            egzersiz ipuclari, analizler) genel bilgi niteligi tasir ve herhangi
            bir fikri mulkiyet hakki olusturmaz.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Sorumluluk Sinirlamasi
          </h2>
          <p>
            FitMusc, Platformu &quot;oldugu gibi&quot; ve &quot;mevcut
            haliyle&quot; sunmaktadir. Asagidaki hususlarda sorumlulugumuz
            sinirlidir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>
              Platform uzerinden saglanan bilgiler genel fitness ve beslenme
              bilgisi niteligi tasir. Herhangi bir saglik durumu icin tibbi
              tavsiye yerine gecmez.
            </li>
            <li>
              Platformun kesintisiz, hatasiz veya guvenli olacagini garanti
              etmemekteyiz. Teknik arizalar, bakim calismalari veya mucbir
              sebepler nedeniyle hizmet kesintileri yasanabilir.
            </li>
            <li>
              Kullanicinin Platformu kullanmasindan kaynaklanan dolayli,
              arizi, ozel veya cezai zararlardan FitMusc sorumlu tutulamaz.
            </li>
            <li>
              Ucuncu taraf hizmet saglayicilarinin (veritabani, e-posta,
              barindirma, AI) neden oldugu kesinti veya veri kayiplarindan
              dolayi sorumlulugumuz sinirlidir.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. AI Ozellikleri Uyarisi
          </h2>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="font-semibold text-foreground mb-2">
              Onemli Uyari: Yapay Zeka Ozellikleri Tibbi Tavsiye Degildir
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                FitMusc&apos;in yapay zeka destekli ozellikleri (ogun
                varyasyonlari, egzersiz form ipuclari, ilerleme analizi, AI
                kocluk sohbeti) yalnizca genel bilgilendirme amaciyla
                sunulmaktadir.
              </li>
              <li>
                Bu oneriler, bir doktor, diyetisyen, fizyoterapist veya
                herhangi bir saglik profesyonelinin tavsiyesi yerine gecmez.
              </li>
              <li>
                Herhangi bir saglik sorununuz, alerjiniz, ilac
                etkilesiminiz veya ozel beslenme ihtiyaciniz varsa, AI
                onerilerini uygulamadan once mutlaka bir saglik profesyoneline
                danisiniz.
              </li>
              <li>
                AI tarafindan uretilen icerikler otomatik olarak olusturulur ve
                hatalar icerebilir. Uretilen iceriklerin dogrulugunu teyit etmek
                kullanicinin sorumlulugundadir.
              </li>
              <li>
                AI ozelliklerinin kullanilmasindan dogan saglik sorunlari veya
                zararlardan FitMusc sorumlu tutulamaz.
              </li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Fesih Kosullari
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Kullanici, herhangi bir zamanda hesabinin silinmesini talep
              ederek Platformu kullanmayi sonlandirebilir. Hesap silme
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
              Hesap silindiginde, tum kisisel veriler 30 gun icinde kalici
              olarak silinir.
            </li>
            <li>
              FitMusc, bu Sartlarin ihlali halinde kullanici hesabini onceden
              bildirim yaparak veya yapmaksizin askiya alma veya sonlandirma
              hakkini sakli tutar.
            </li>
            <li>
              Platform hizmetinin tamamen durdurulmasi halinde, kullanicilar en
              az 30 gun oncesinden bilgilendirilir ve verilerini indirme imkani
              taninir.
            </li>
            <li>
              Fesih sonrasinda, kullanicinin Platforma erisimi derhal
              sonlandirilir. Paylasilan planlar otomatik olarak iptal edilir.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            8. Degisiklikler
          </h2>
          <p>
            FitMusc, bu Sartlari herhangi bir zamanda degistirme hakkini sakli
            tutar. Onemli degisiklikler, Platform uzerinden veya e-posta
            yoluyla bildirilir. Degisikliklerden sonra Platformu kullanmaya
            devam etmeniz, guncellenmi sartlari kabul ettiginiz anlamina
            gelir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            9. Uygulanacak Hukuk ve Uyusmazlik Cozumu
          </h2>
          <p>
            Bu Sartlar, Turkiye Cumhuriyeti kanunlarina tabidir. Sartlardan
            kaynaklanan veya Sartlarla baglantili uyusmazliklarin cozumunde
            Istanbul Mahkemeleri ve Icra Daireleri yetkilidir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            10. Iletisim
          </h2>
          <p>
            Kullanim sartlari hakkinda sorulariniz icin bizimle iletisime
            gecebilirsiniz:
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
    </div>
  );
}
