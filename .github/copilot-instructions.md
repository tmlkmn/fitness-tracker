# Copilot Instructions — Fitness Tracker

Bu dosya GitHub Copilot ve diğer AI asistanlar için proje kurallarını tanımlar.

---

## Güvenlik

- Server action'larda **Zod** ile input validation zorunlu. Kullanıcıdan gelen hiçbir veri doğrulanmadan DB'ye yazılmamalı.
- `DATABASE_URL` ve credential'lar asla client-side'a expose edilmemeli. `NEXT_PUBLIC_` prefix'i ile DB bilgisi paylaşılmamalı.
- Kullanıcı girdisi doğrudan SQL'e geçirilmemeli — her zaman Drizzle ORM parametrik sorguları kullanılmalı.
- `dangerouslySetInnerHTML` kullanımı yasak. Kullanıcı girdisi React JSX ile render edilmeli.
- `next.config.ts`'de security headers tanımlanmalı:
  ```ts
  // Eklenecek header'lar:
  // Content-Security-Policy
  // X-Frame-Options: DENY
  // X-Content-Type-Options: nosniff
  // Referrer-Policy: strict-origin-when-cross-origin
  // Permissions-Policy: camera=(), microphone=(), geolocation=()
  // Strict-Transport-Security (production'da)
  ```
- Hassas veriler (token, şifre, DB URL) için `console.log` kullanılmamalı.
- Production'da server action'lara rate limiting uygulanmalı.
- `.env.local` dosyası git'e eklenmemeli — `.gitignore`'da `.env*` pattern'i korunmalı.

---

## SEO

- Her sayfada benzersiz `title` ve `description` metadata tanımlanmalı (Next.js `Metadata` export ile).
- Root layout'ta `metadataBase` tanımlanmalı — Open Graph ve canonical URL çözümlemesi için gerekli:
  ```ts
  export const metadata: Metadata = {
    metadataBase: new URL("https://domain.com"),
    // ...
  };
  ```
- Open Graph meta tag'leri eklenmeli (`openGraph.title`, `openGraph.description`, `openGraph.images`).
- Twitter Card meta tag'leri eklenmeli (`twitter.card`, `twitter.title`, `twitter.description`).
- Semantic HTML kullanılmalı:
  - `<main>` — sayfa ana içeriği (layout'ta mevcut)
  - `<nav>` — navigasyon (bottom-nav'da mevcut)
  - `<section>` — tematik gruplamalar
  - `<article>` — bağımsız içerik blokları (meal card, exercise card)
  - `<header>` / `<footer>` — bölüm başlık/alt bilgileri
- Görseller için `alt` attribute zorunlu. Dekoratif görsellerde `alt=""` kullanılmalı.
- Görsel render ederken her zaman `next/image` komponenti kullanılmalı — otomatik lazy loading, responsive sizing, format optimizasyonu sağlar.
- Sayfa başlıkları hiyerarşik olmalı: her sayfada tek bir `<h1>`, altında `<h2>`, `<h3>` sırasıyla.
- `<html lang="tr">` korunmalı — arama motorları ve ekran okuyucular için dil bilgisi.
- Gerektiğinde `robots.txt` ve `sitemap.xml` yapılandırılmalı (`next-sitemap` veya App Router `sitemap.ts`).

---

## Mobil / Responsive

- **Mobile-first** yaklaşım: önce mobil stiller yazılmalı, sonra `sm:`, `md:`, `lg:` breakpoint'leri ile büyük ekranlar hedeflenmeli.
- Touch target'lar (buton, link, checkbox) minimum **44x44px** olmalı — `min-h-11 min-w-11` veya padding ile sağlanabilir.
- `max-w-lg mx-auto` layout kısıtlaması korunmalı — tüm içerik bu container içinde kalmalı.
- Bottom nav yüksekliği `h-16` (64px) — içerik alanında `pb-20` (80px) padding korunmalı.
- Yatay scroll önlenmeli — taşan içeriklerde `overflow-x-hidden` veya `overflow-x-auto` kullanılmalı.
- Input `font-size` minimum **16px** olmalı — iOS'ta otomatik zoom'u engeller.
- `viewport` meta'da `maximum-scale=1` PWA davranışı için korunmalı.
- Görseller responsive olmalı: `w-full`, `object-cover`, uygun `aspect-ratio`.
- Tablo ve geniş içerikler yatay scroll ile sarılmalı: `<div className="overflow-x-auto">`.
- Spacing için Tailwind spacing scale kullanılmalı (`p-4`, `gap-3`, `space-y-2`) — hardcoded pixel değerleri yerine.

---

## Performans

- **Server component varsayılan** — `"use client"` directive'i sadece interaktif bileşenlerde (state, effect, event handler) kullanılmalı.
- Büyük client komponentleri `next/dynamic` ile lazy load edilmeli:
  ```ts
  const WeightChart = dynamic(() => import("@/components/progress/weight-chart"), {
    loading: () => <Skeleton className="h-64 w-full" />,
  });
  ```
- TanStack Query `staleTime: 60_000` (60 saniye) standardına uyulmalı — `src/lib/query-client.tsx`'de merkezi yapılandırma.
- Mutation sonrası `invalidateQueries` ile sadece ilgili query key'leri geçersiz kılınmalı — tüm cache temizlenmemeli.
- Gereksiz re-render kaynakları: inline object/array oluşturma, her render'da yeni fonksiyon. `useMemo` ve `useCallback` sadece ölçülebilir performans sorunu olduğunda kullanılmalı.
- Bundle'a gereksiz dependency eklenmemeli — eklenmeden önce bundle-size etkisi değerlendirilmeli.
- Görseller `next/image` ile optimize edilmeli — otomatik WebP/AVIF dönüşümü ve lazy loading.
- Üçüncü parti script'ler `next/script` ile `strategy="lazyOnload"` yüklenmeli.

---

## Erişilebilirlik (a11y)

- İnteraktif elementlerde (buton, link, input) `aria-label` veya görünür metin/label olmalı.
- Renk kontrastı **WCAG 2.1 AA** standardına uygun olmalı — minimum 4.5:1 normal metin, 3:1 büyük metin.
- Tüm interaktif elementler klavye ile erişilebilir olmalı — `Tab` ile gezinme, `Enter`/`Space` ile aktivasyon.
- Focus göstergesi (`outline`, `ring`) kaldırılmamalı — `focus-visible:ring-2` pattern'i tercih edilmeli.
- Form input'larında `<Label htmlFor="id">` eşleşmesi olmalı — ekran okuyucular için zorunlu.
- Loading/skeleton state'lerinde `aria-busy="true"` kullanılmalı.
- Icon-only butonlarda `aria-label` zorunlu:
  ```tsx
  <Button size="icon" aria-label="Ayarları aç">
    <Settings className="h-4 w-4" />
  </Button>
  ```
- Hata mesajları `aria-live="polite"` ile duyurulmalı.
- Modal/dialog'lar `focus trap` içermeli — Radix UI Dialog bunu otomatik sağlar.

---

## Kod Kalitesi

- TypeScript **strict mode** aktif — `any` tipi yasak, tüm fonksiyon parametreleri ve dönüş değerleri tipli olmalı.
- Component prop'ları `interface` veya `type` ile tanımlanmalı:
  ```ts
  interface MealCardProps {
    meal: typeof meals.$inferSelect;
    onComplete: (id: number) => void;
  }
  ```
- Server action dosyaları `"use server"` directive'i ile başlamalı.
- Mutation (insert/update/delete) sonrası ilgili sayfa `revalidatePath()` ile yenilenme.
- Custom hook'lar `use-` prefix'i ile adlandırılmalı (`use-meals.ts`, `use-progress.ts`).
- Hata durumları kullanıcıya `sonner` toast ile gösterilmeli — sessiz hata yutulmamalı:
  ```ts
  onError: () => {
    toast.error("İşlem başarısız oldu");
  },
  ```
- Drizzle schema değişikliklerinden sonra `npm run db:generate` ile migration oluşturulmalı.
- Component dosyaları kebab-case: `meal-card.tsx`, `weight-chart.tsx`.
- Utility fonksiyonları `src/lib/` altında toplanmalı.

---

## PWA

- `public/manifest.json` güncel tutulmalı — icon, tema rengi, dil bilgisi.
- Service worker `src/sw.ts`'de tanımlı — serwist ile precaching ve runtime caching aktif.
- Yeni statik asset eklendiğinde service worker cache stratejisi gözden geçirilmeli.
- Offline durumda kullanıcıya anlamlı feedback verilmeli (toast veya fallback UI).
