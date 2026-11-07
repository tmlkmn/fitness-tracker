# FitMusc — App Store ve Google Play hazırlığı

Bu belge uygulamayı mağazalara göndermek için gerekenleri toplar. Kodda yapılanlar §1'de; geri kalanı geliştirici hesaplarıyla senin yapacağın adımlar ve mağaza formlarına girilecek cevaplar.

## 1. Kodda hazır olanlar

| Konu | Nerede |
|---|---|
| iOS ikonu 1024×1024, saydamsız (App Store alfa kanallı ikonu reddeder) | `assets/images/icon.png` |
| Sürüm `1.0.0`; build numaraları EAS'te uzaktan, otomatik artar | `app.json`, `eas.json` (`appVersionSource: remote`, `autoIncrement`) |
| Şifreleme beyanı (`ITSAppUsesNonExemptEncryption = false` — yalnızca HTTPS) | `app.json` → `ios.config.usesNonExemptEncryption` |
| iOS gizlilik manifesti (izleme yok; React Native ve Expo paketlerinin "required reason" API'leri) | `app.json` → `ios.privacyManifests` |
| Kullanılmayan Android izinleri engellendi (`SYSTEM_ALERT_WINDOW`, harici depolama okuma/yazma) | `app.json` → `android.blockedPermissions` |
| Kullanılmayan Face ID izin metni kaldırıldı | `app.json` → `expo-secure-store` eklentisi |
| Build profilleri: `preview` (dahili dağıtım, Android APK) ve `production` (mağaza) | `eas.json` |
| Uygulama içi hesap silme (App Store 5.1.1(v), Google Play hesap silme kuralı) | Ayarlar → Gizlilik ve hesap → Hesabımı sil (`src/app/delete-account.tsx`) |
| KVKK açık rızası: ilk girişte sağlık verisi ve yurt dışında saklama için zorunlu rıza ekranı (web'deki `/acik-riza` ile aynı kayıt) | `src/components/consent-screen.tsx` (sunucu 403 `ConsentRequired` döndükçe engelli ekranın yerine açılır); Ayarlar → Gizlilik ve hesap → Rızamı geri al |
| Üçüncü taraf AI'a veri göndermeden önce açık izin (App Store 5.1.2(i)); izin Ayarlar'dan geri alınabilir | `src/hooks/ai-consent.ts`; izin sunucuda tutulur (`/api/v1/me/consents`, web ile ortak) ve sunucu izinsiz AI çağrısını 403 `AI_CONSENT_REQUIRED` ile reddeder; tüm AI butonları, sohbet, selamlama ve form ipuçları bu izne bağlı |
| AI içeriğini uygulama içinden bildirme (Google Play'in AI ile üretilen içerik politikası) | Her AI sonucunun altında "İçeriği bildir"; sohbette yanıta uzun basma → `src/app/ai/report.tsx` (geri bildirim olarak admin'e düşer) |
| Uygulama dışında satın almaya yönlendirme yok: deneme süresi / üyelik biten hesapta "Web'de aç" butonu ve "plan seç" metni gösterilmiyor (App Store 3.1.1) | `src/app/blocked.tsx` |
| Gizlilik politikası, KVKK aydınlatma metni ve kullanım şartları bağlantıları | Ayarlar → Gizlilik ve hesap |
| Play Store ikonu (512×512) ve tanıtım görseli (1024×500) | `store/play-icon-512.png`, `store/play-feature-graphic.png` |

## 2. Senin yapacakların (sırayla)

1. **Geliştirici hesapları**
   - Apple Developer Program: yıllık ücretli. Şirket adına açılacaksa D-U-N-S numarası gerekir.
   - Google Play Console: bir kerelik ücret. **2023 sonrası açılan kişisel hesaplarda üretime çıkmadan önce en az 12 test kullanıcısıyla 14 gün kapalı test şartı var.** Şirket hesabında bu şart yok.
2. **EAS projesi**
   - `npm i -g eas-cli`, sonra `eas login`.
   - `cd apps/mobile`, sonra `eas init`. Bu komut `app.json`'a `extra.eas.projectId` ve `owner` ekler; push token almak için bu kimlik şart.
3. **Kimlikler:** `app.fitmusc.mobile`, hem iOS bundle ID'si hem Android paket adı. Mağazaya bir kez çıktıktan sonra değiştirilemez; farklı bir şey istiyorsan şimdi söyle.
4. **Push kimlik bilgileri**
   - **iOS:** İlk iOS build'inde EAS, Apple hesabına bağlanıp sertifikayı, provisioning profile'ı ve APNs anahtarını kendisi oluşturur ("push notifications" sorusuna evet).
   - **Android:**
     - Bir Firebase projesi aç (paket adı `app.fitmusc.mobile`) ve `google-services.json` dosyasını indir.
     - Dosyayı `apps/mobile/` altına koy ve `app.json`'a `"android": { "googleServicesFile": "./google-services.json" }` satırını ekle.
     - Firebase'deki FCM V1 servis hesabı anahtarını `eas credentials` ile EAS'e yükle.
   - Bunlar olmadan Android'de push çalışmaz. Expo Go'da da çalışmaz; denemek için build gerekir.
5. **Test build'i**
   - Android: `eas build -p android --profile preview` komutu APK üretir; telefona doğrudan kurulur.
   - iOS: dahili dağıtım için önce `eas device:create` ile cihazı kaydet, sonra `eas build -p ios --profile preview`. Alternatif olarak production build'i TestFlight'a gönderebilirsin.
6. **İnceleme hesabı**
   - Uygulama girişsiz kullanılamıyor; Apple ve Google inceleme ekiplerine bir hesap vermek zorundayız.
   - Admin olmayan, onaylı, aktif üyeliği ve örnek verisi (birkaç gün plan, öğün, ölçüm) olan **ayrı bir hesap** aç.
   - Bilgilerini App Store Connect → App Review Information ve Play Console → App access bölümlerine yaz.
   - Admin hesabını kullanma.
7. **iOS'a gönderim**
   - App Store Connect'te `app.fitmusc.mobile` ile uygulama kaydını oluştur.
   - `eas build -p ios --profile production`, ardından `eas submit -p ios`.
   - TestFlight'ta dene, sonra §3 ve §5'i doldurup incelemeye gönder.
8. **Android'e gönderim**
   - `eas build -p android --profile production` komutu AAB üretir.
   - **İlk AAB'yi Play Console'a elle yükle; Google ilk yüklemeyi API ile kabul etmez.** Sonraki sürümler `eas submit -p android` ile gider (`eas.json` dahili test kanalına taslak olarak gönderir). Bunun için bir Google servis hesabı JSON anahtarı gerekir.
   - §4'ü ve App content formlarını doldur.
9. **Ekran görüntüleri**
   - iOS: 6.9" iPhone (1320×2868 veya 1290×2796) zorunlu. `supportsTablet: false` olduğu için iPad görüntüsü gerekmez.
   - Play: en az 2 telefon görüntüsü.
   - Gerçek cihazda, inceleme hesabıyla al. Görüntülerde üyelik fiyatı ya da web'den satın alma geçmemeli.

## 3. App Store Connect → App Privacy

- **Tracking:** Hayır. Reklam yok, izleme yok, veri satılmıyor.
- **Toplanan veriler:** Tamamı kullanıcıyla ilişkili (linked); hiçbiri izleme için kullanılmıyor.

| Veri türü | Ne | Amaç |
|---|---|---|
| Contact Info → Name | Ad | App Functionality |
| Contact Info → Email Address | Giriş, bildirim e-postaları | App Functionality |
| Health & Fitness → Health | Kilo, ölçümler, sağlık notları, ilaçlar, alerjiler, uyku | App Functionality |
| Health & Fitness → Fitness | Antrenmanlar, öğünler, su, tamamlama kayıtları | App Functionality |
| User Content → Other User Content | Öğün/egzersiz notları, AI sohbet mesajları | App Functionality |
| User Content → Customer Support | Geri bildirim ve AI içerik bildirimleri | App Functionality |
| Identifiers → User ID | Hesap kimliği | App Functionality |
| Identifiers → Device ID | Push bildirim token'ı | App Functionality |
| Usage Data → Product Interaction | AI kullanım sayıları (kota, admin raporu) | App Functionality, Analytics |
| Other Data | Yaş, cinsiyet, boy | App Functionality |

- **Toplanmayanlar:** Konum, kişiler, fotoğraf, finansal bilgi, tarama geçmişi, reklam verisi.
- **Satın almalar:** Uygulama içinde satın alma yok.
- **Çökme verisi:** Mobil uygulamada Sentry veya analitik yok; web'deki Sentry sunucu tarafında çalışıyor.
- AI işleme (Anthropic) bizim adımıza çalışan bir hizmet sağlayıcısı; Apple'ın tanımına göre "tracking" değil. Ama veri gönderildiği için uygulama içinde açık izin alıyoruz (§1).

## 4. Google Play → Data safety

**Veri toplama:** Evet. Tüm aktarım HTTPS ile şifreli. Kullanıcı silme isteyebilir:
- Uygulama içinde: Ayarlar → Gizlilik ve hesap → Hesabımı sil.
- Web'de: `https://www.fitmusc.com/tr/ayarlar/verilerim`. Bu sayfa giriş istiyor; Google girişsiz bir sayfa ister diye görürse §7'deki kamuya açık silme sayfası notuna bak.

**Paylaşım:** Hayır. Google, bizim adımıza işleyen hizmet sağlayıcıları (Anthropic, Neon, Vercel, Mailjet) "paylaşım" saymaz.

| Kategori → tür | Zorunlu mu | Amaç |
|---|---|---|
| Personal info → Name | Evet | App functionality, Account management |
| Personal info → Email address | Evet | App functionality, Account management, Developer communications |
| Personal info → User IDs | Evet | App functionality, Account management |
| Personal info → Other info (yaş, cinsiyet) | İsteğe bağlı | App functionality |
| Health and fitness → Health info | İsteğe bağlı | App functionality |
| Health and fitness → Fitness info | Evet | App functionality |
| Messages → Other in-app messages (AI sohbeti) | İsteğe bağlı | App functionality |
| App activity → App interactions (AI kullanım sayıları) | Evet | App functionality, Analytics |
| App activity → Other user-generated content (notlar, geri bildirim) | İsteğe bağlı | App functionality |
| Device or other IDs → push token | İsteğe bağlı | App functionality |

Play Console'daki diğer App content formları:
- **Health apps:** Fitness / beslenme / aktivite takibi. Tıbbi cihaz değil.
- **Ads:** Yok.
- **Target audience:** 18+ öneririm (sağlık verisi ve AI koç).
- **Content rating:** IARC anketi.
- **App access:** Giriş gerekli; inceleme hesabının bilgileri.
- **AI-generated content:** Uygulama içi bildirim mevcut.

## 5. İnceleme notları (App Review Information / Play notları için, İngilizce)

> FitMusc is a fitness and nutrition tracker for members of the FitMusc service. Accounts are created by invitation or on our website; the app has no sign-up and no purchases. Use the demo account below. AI features (meal/workout suggestions, weekly plans, progress analysis, coach chat) are powered by Anthropic's Claude: before any data is sent, the app asks for explicit permission (Settings → AI data sharing withdraws it), and every AI answer can be reported from inside the app. On first use the app asks for explicit consent to process health data (required by Turkish data protection law, KVKK); please accept it to continue. Accounts can be deleted in Settings → Privacy & account → Delete my account, also from the consent screen. Push notifications are used for reminders and finished AI plans.

## 6. Mağaza listesi taslakları

| Alan | TR | EN |
|---|---|---|
| Ad | FitMusc | FitMusc |
| iOS alt başlık (≤30) | Antrenman, beslenme ve AI koç | Workouts, meals and an AI coach |
| Play kısa açıklama (≤80) | Antrenmanını, öğünlerini ve ilerlemeni takip et; AI koçundan öneri al. | Track workouts, meals and progress, with suggestions from your AI coach. |
| Kategori | Sağlık ve Fitness | Health & Fitness |
| Destek URL'si | https://www.fitmusc.com/tr/iletisim | https://www.fitmusc.com/en/contact |
| Gizlilik politikası | https://www.fitmusc.com/tr/gizlilik | https://www.fitmusc.com/en/privacy |
| Pazarlama URL'si | https://www.fitmusc.com/tr/tanitim | — |
| iOS anahtar kelimeler (≤100) | fitness,antrenman,beslenme,diyet,kalori,makro,spor,koç,plan,kilo | fitness,workout,nutrition,diet,calorie,macro,gym,coach,plan,weight |

**Uzun açıklama (TR):**

FitMusc, haftalık antrenman ve beslenme programını tek yerde toplar. Günün öğünlerini ve egzersizlerini işaretle, su ve uykunu kaydet, kilonu ve ölçümlerini grafiklerle izle. İnternet yokken işaretlediklerin bağlantı gelince kaydedilir.

Yapay zeka koçu; öğün alternatifleri, egzersiz değişiklikleri, günlük ve haftalık plan önerileri, ilerleme analizi ve sohbetle yanında. Hatırlatıcılar öğün ve antrenman saatini kaçırmamanı sağlar; planlarını başka FitMusc üyeleriyle paylaşabilirsin.

FitMusc bir sağlık hizmeti değildir; öneriler bilgilendirme amaçlıdır.

**Long description (EN):**

FitMusc brings your weekly workout and nutrition program into one place. Check off the day's meals and exercises, log water and sleep, and follow your weight and measurements on charts. Ticks made offline are saved once you're back online.

The AI coach helps with meal alternatives, exercise swaps, daily and weekly plan suggestions, progress analysis and chat. Reminders keep you on time for meals and workouts, and you can share your plans with other FitMusc members.

FitMusc is not a medical service; suggestions are for information only.

**Yaş derecelendirmesi:** Anketteki sağlık/wellness ve tıbbi bilgi sorularına "evet". Sonuç bu cevaplara göre belirlenir.

## 7. Açık riskler ve kararlar

1. **Ödeme (en büyük risk, Faz 7 kararı)**
   - Apple, uygulamada IAP sunmadan web'de satılan bir üyeliğin kilidini açan uygulamaları 3.1.1 / 3.1.3(b) gereği reddedebilir. ABD mağazası hariç; orada dış bağlantıya artık izin var.
   - Uygulamada satın alma ya da yönlendirme yok; bu riski azaltır ama ortadan kaldırmaz.
   - Google Play, başka yerden satın alınmış içeriğin yalnızca kullanılmasına daha toleranslı.
   - Reddedilirse seçenekler: IAP eklemek (RevenueCat), ya da şimdilik yalnızca Android / yalnızca ABD.
2. **KVKK (2026-11-07'de kodda çözülenler ve hukukçuya kalanlar)**
   - Çözüldü: gizlilik politikası ve KVKK aydınlatma metni gerçek veri akışına göre yeniden yazıldı (Anthropic'e giden veriler anonim değil, tüm alt işleyiciler ve ülkeleri listelendi). Açık rızalar artık gerçekten alınıyor ve tarihiyle kaydediliyor (sağlık verisi + yurt dışında saklama zorunlu, AI isteğe bağlı).
   - Hukukçuya: aydınlatma metninde veri sorumlusunun tam unvanı ve adresi yok; VERBİS kaydı gerekip gerekmediği; ABD'ye düzenli aktarımın 2024 değişikliğinden sonra yalnızca açık rızaya dayanıp dayanamayacağı (Kurul'un standart sözleşmesi ve 5 iş günü içinde bildirim gerekebilir); sağlık verisi rızasının hizmetin ön şartı yapılmasının uygunluğu.
   - Paylaşım artık alıcının e-postası yazılarak yapılıyor; kullanıcı listesi gösterilmiyor (2026-11-07).
3. **Kamuya açık silme sayfası:** Google, giriş gerektirmeyen bir sayfayı tercih ediyor. Silme adımlarını anlatan ve iletişim yolu veren bir sayfa (ör. `/hesap-silme`) eklemek Play incelemesini kolaylaştırır.
4. **Logo kaynağı**
   - İkon, 512 piksellik PNG'den 1024'e büyütüldü.
   - Vektör ya da 1024+ ana dosyan varsa `assets/images/icon.png`, `android-icon-foreground.png` ve `store/` görsellerini ondan yeniden üret. İkonlar opak olmalı.
5. **Android bildirim simgesi:** Durum çubuğunda uygulama ikonu beyaz bir kare olarak görünür. Tek renkli 96×96 bir simge (`expo-notifications` eklentisinin `icon` ayarı) eklenebilir.
6. **Web paket güncellemesi:** Next 16.4 ve better-auth 1.6.34 ile giriş (web ve mobil), sayfalar ve PDF dışa aktarma yerelde production build'le test edildi. Push teslimi ve gerçek https ortamı için main'den önce Vercel preview'da bir kez denenmeli. Preview production DB'yi kullandığı için rıza ekranı orada da gerçek hesaplara görünür.
