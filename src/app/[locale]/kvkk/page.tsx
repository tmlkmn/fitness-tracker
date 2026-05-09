import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KVKK Aydinlatma Metni",
  robots: { index: true, follow: true },
};

export default function KvkkPage() {
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
          KVKK Aydinlatma Metni
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Son guncelleme / Last updated: 20 Nisan 2026 / April 20, 2026
        </p>
      </header>

      {/* ============ TURKCE ============ */}
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <p>
            6698 sayili Kisisel Verilerin Korunmasi Kanunu (&quot;KVKK&quot;)
            kapsaminda, FitMusc olarak kisisel verilerinizin islenmesine iliskin
            sizleri bilgilendirmek amaciyla isbu aydinlatma metni
            hazirlanmistir. Bu metin, KVKK&apos;nin 10. maddesi ile Aydinlatma
            Yukumlulugununun Yerine Getirilmesinde Uyulacak Usul ve Esaslar
            Hakkinda Teblig uyarinca duzenlenmistir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            1. Veri Sorumlusu
          </h2>
          <p>
            Kisisel verileriniz, veri sorumlusu sifatiyla FitMusc tarafindan
            asagida aciklanan amaclar dogrultusunda ve KVKK&apos;da belirtilen
            kisisel veri isleme sartlari ile ilkeleri cercevesinde
            islenmektedir.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Veri Sorumlusu:</strong> FitMusc
            <br />
            <strong className="text-foreground">Iletisim:</strong>{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            2. Islenen Kisisel Veriler
          </h2>
          <p className="mb-2">
            Platformumuz araciligiyla asagidaki kisisel veri kategorileri
            islenmektedir:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-foreground font-semibold">
                    Veri Kategorisi
                  </th>
                  <th className="py-2 text-foreground font-semibold">
                    Islenen Veriler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Kimlik Bilgileri</td>
                  <td className="py-2">Ad, soyad</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Iletisim Bilgileri</td>
                  <td className="py-2">E-posta adresi</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Saglik Verileri (Ozel Nitelikli)
                  </td>
                  <td className="py-2">
                    Boy, kilo, vucut olculeri (gogus, bel, kalca, kol, bacak),
                    saglik notlari, alerji bilgileri, kullanilan ilaclar
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Fiziksel Aktivite Verileri</td>
                  <td className="py-2">
                    Antrenman kayitlari, egzersiz setleri ve tekrarlari,
                    antrenman sureleri
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Beslenme Verileri</td>
                  <td className="py-2">
                    Ogun planlari, besin degerleri, takviye programlari,
                    alisveris listeleri
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Islem Guvenligi Verileri</td>
                  <td className="py-2">
                    Oturum bilgileri, IP adresi, cihaz bilgileri, tarayici turu,
                    erisim zamanlari
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Bildirim Verileri</td>
                  <td className="py-2">
                    Push bildirim aboneligi, bildirim tercihleri, hatirlatma
                    ayarlari
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            <strong className="text-foreground">Onemli Not:</strong> Saglik
            verileri, KVKK kapsaminda ozel nitelikli kisisel veri olarak kabul
            edilmektedir. Bu veriler, acik rizaniz dogrultusunda ve gerekli
            idari ve teknik tedbirler alinarak islenmektedir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            3. Isleme Amaclari ve Hukuki Sebebi
          </h2>
          <p className="mb-2">
            Kisisel verileriniz asagidaki amaclarla ve hukuki sebeplere
            dayanilarak islenmektedir:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">
                Sozlesmenin ifasi (KVKK md.5/2-c):
              </strong>{" "}
              Kisisellestirilmis fitness ve beslenme planlari olusturma, ilerleme
              takibi, haftalik alisveris listesi ve takviye hatirlatmalari
              hazirlama, hesap yonetimi ve kimlik dogrulama
            </li>
            <li>
              <strong className="text-foreground">
                Acik riza (KVKK md.5/1 ve md.6/2):
              </strong>{" "}
              Saglik verilerinin islenmesi, yapay zeka destekli oneriler ve
              analizlerin sunulmasi (ogun varyasyonlari, egzersiz form ipuclari,
              ilerleme analizi, AI kocluk sohbeti), plan paylasim ozelligi
            </li>
            <li>
              <strong className="text-foreground">
                Mesru menfaat (KVKK md.5/2-f):
              </strong>{" "}
              Platform guvenliginin saglanmasi, hizmet kalitesinin
              iyilestirilmesi, istatistiksel analizler
            </li>
            <li>
              <strong className="text-foreground">
                Hukuki yukumluluk (KVKK md.5/2-c):
              </strong>{" "}
              Yasal duzenleme gerekliliklerinin yerine getirilmesi
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            4. Verilerin Aktarildigi Taraflar
          </h2>
          <p className="mb-2">
            Kisisel verileriniz, KVKK&apos;nin 8. ve 9. maddelerinde
            belirtilen sartlara uygun olarak asagidaki taraflara
            aktarilabilmektedir:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong className="text-foreground">
                Anthropic, PBC (ABD):
              </strong>{" "}
              Yapay zeka ozellikleri icin fitness ve beslenme verilerinizin
              anonim ozetleri islenir. Yurtdisi veri aktarimi acik rizaniza
              dayanmaktadir. Anthropic, aktarilan verileri model egitimi icin
              kullanmamaktadir.
            </li>
            <li>
              <strong className="text-foreground">
                Neon Tech, Inc. (ABD):
              </strong>{" "}
              Veritabani barindirma hizmeti kapsaminda tum kullanici verileri
              sifrelenmis baglanti uzerinden saklanir. Yurtdisi veri aktarimi
              acik rizaniza dayanmaktadir.
            </li>
            <li>
              <strong className="text-foreground">
                Mailjet SAS (Fransa/AB):
              </strong>{" "}
              E-posta gonderim hizmeti kapsaminda yalnizca e-posta adresi ve
              mesaj icerigi paylasalir. AB veri koruma standartlarina (GDPR)
              tabidir.
            </li>
            <li>
              <strong className="text-foreground">
                Vercel, Inc. (ABD):
              </strong>{" "}
              Platform barindirma hizmeti kapsaminda sunucu tablali islemler
              Vercel altyapisinda calisir. Yurtdisi veri aktarimi acik rizaniza
              dayanmaktadir.
            </li>
          </ul>
          <p className="mt-2">
            Yurtdisina veri aktarimi, KVKK md.9 kapsaminda acik rizaniz
            alinarak gerceklestirilmektedir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            5. Veri Saklama Suresi
          </h2>
          <p>
            Kisisel verileriniz, isleme amacinin gerektirdigi sure boyunca ve
            her halukarda hesabinizin aktif oldugu surece saklanir. Hesap silme
            talebiniz uzerine verileriniz 30 gun icinde kalici olarak silinir.
            Yasal zorunluluklar kapsaminda saklanmasi gereken veriler, ilgili
            mevzuatin ongorduugu sure boyunca muhafaza edilir. Ozel nitelikli
            kisisel veriler (saglik verileri), isleme amaci ortadan kalktiktan
            sonra derhal imha edilir.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            6. Ilgili Kisi Haklari (KVKK md.11)
          </h2>
          <p className="mb-2">
            KVKK&apos;nin 11. maddesi uyarinca asagidaki haklara sahipsiniz:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Kisisel verilerinizin islenip islenmedigini ogrenme
            </li>
            <li>
              Kisisel verileriniz islenmisse buna iliskin bilgi talep etme
            </li>
            <li>
              Kisisel verilerinizin islenme amacini ve bunlarin amacina uygun
              kullanilip kullanilmadigini ogrenme
            </li>
            <li>
              Yurt icinde veya yurt disinda kisisel verilerinizin aktarildigi
              ucuncu kisileri bilme
            </li>
            <li>
              Kisisel verilerinizin eksik veya yanlis islenmis olmasi halinde
              bunlarin duzeltilmesini isteme
            </li>
            <li>
              KVKK&apos;nin 7. maddesinde ongorulen sartlar cercevesinde kisisel
              verilerinizin silinmesini veya yok edilmesini isteme
            </li>
            <li>
              Duzeltme ve silme islemlerinin, kisisel verilerinizin aktarildigi
              ucuncu kisilere bildirilmesini isteme
            </li>
            <li>
              Islenen verilerin munhasiran otomatik sistemler vasitasiyla analiz
              edilmesi suretiyle aleyhinize bir sonucun ortaya cikmasina itiraz
              etme
            </li>
            <li>
              Kisisel verilerinizin kanuna aykiri olarak islenmesi sebebiyle
              zarara ugramaniz halinde zararin giderilmesini talep etme
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            7. Basvuru Yontemi
          </h2>
          <p>
            Yukarida belirtilen haklarinizi kullanmak icin asagidaki iletisim
            kanallarindan bize basvurabilirsiniz. Basvurunuzda kimliginizi
            tespit edici bilgiler ile talebinizin acik ve anlasilir bir sekilde
            yer almasi gerekmektedir. Basvurular en gec 30 gun icinde
            sonuclandirilir.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">E-posta:</strong>{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>
          </p>
          <p className="mt-1">
            Basvuru konusu e-postanin konu basliginda &quot;KVKK Bilgi
            Talebi&quot; ibaresi yer almalidir.
          </p>
        </div>
      </section>

      <hr className="border-border" />

      {/* ============ ENGLISH SUMMARY ============ */}
      <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            KVKK Disclosure Text &mdash; English Summary
          </h2>
          <p>
            This document is prepared in accordance with Article 10 of the
            Turkish Personal Data Protection Law No. 6698 (&quot;KVKK&quot;). It
            informs users about how FitMusc collects, processes, and protects
            personal data.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Data Controller
          </h2>
          <p>
            FitMusc acts as the data controller responsible for your personal
            data. Contact:{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Personal Data Processed
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">Identity:</strong> Name,
              surname
            </li>
            <li>
              <strong className="text-foreground">Contact:</strong> Email address
            </li>
            <li>
              <strong className="text-foreground">
                Health Data (Sensitive):
              </strong>{" "}
              Height, weight, body measurements, health notes, allergies,
              medications
            </li>
            <li>
              <strong className="text-foreground">Fitness Data:</strong> Workout
              logs, exercise sets and repetitions, training durations
            </li>
            <li>
              <strong className="text-foreground">Nutrition Data:</strong> Meal
              plans, nutritional values, supplement schedules, shopping lists
            </li>
            <li>
              <strong className="text-foreground">Security Data:</strong> Session
              information, IP address, device info, browser type, access times
            </li>
            <li>
              <strong className="text-foreground">Notification Data:</strong>{" "}
              Push subscription, notification preferences, reminder settings
            </li>
          </ul>
          <p className="mt-2">
            Health data is classified as sensitive personal data under KVKK and
            is processed based on your explicit consent with appropriate
            administrative and technical safeguards.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Processing Purposes and Legal Basis
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-foreground">
                Performance of contract (Art. 5/2-c):
              </strong>{" "}
              Personalized plans, progress tracking, account management
            </li>
            <li>
              <strong className="text-foreground">
                Explicit consent (Art. 5/1 &amp; 6/2):
              </strong>{" "}
              Health data processing, AI-powered features, plan sharing
            </li>
            <li>
              <strong className="text-foreground">
                Legitimate interest (Art. 5/2-f):
              </strong>{" "}
              Platform security, service improvement, statistical analysis
            </li>
            <li>
              <strong className="text-foreground">
                Legal obligation (Art. 5/2-c):
              </strong>{" "}
              Regulatory compliance
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Data Transfers
          </h2>
          <p>
            Data may be transferred to: Anthropic, PBC (USA) for AI features,
            Neon Tech, Inc. (USA) for database hosting, Mailjet SAS
            (France/EU) for email delivery, and Vercel, Inc. (USA) for platform
            hosting. International data transfers are conducted based on your
            explicit consent per KVKK Article 9.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Data Subject Rights (Article 11)
          </h2>
          <p className="mb-2">Under KVKK Article 11, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Learn whether your personal data is processed</li>
            <li>Request information about processing activities</li>
            <li>
              Learn the purpose of processing and whether data is used
              accordingly
            </li>
            <li>Know the third parties to whom data is transferred</li>
            <li>Request correction of incomplete or inaccurate data</li>
            <li>
              Request deletion or destruction of data under Article 7
              conditions
            </li>
            <li>
              Request that corrections or deletions be notified to third parties
            </li>
            <li>
              Object to outcomes arising from exclusively automated analysis
            </li>
            <li>
              Claim compensation for damages caused by unlawful processing
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            How to Apply
          </h2>
          <p>
            To exercise your rights, contact us at{" "}
            <a
              href="mailto:destek@fitmusc.com"
              className="text-primary hover:underline"
            >
              destek@fitmusc.com
            </a>{" "}
            with the subject line &quot;KVKK Information Request&quot;. Your
            application must include identifying information and a clear
            description of your request. Applications are resolved within 30
            days.
          </p>
        </div>
      </section>
    </div>
  );
}
