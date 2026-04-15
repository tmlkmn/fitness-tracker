# Plan: AI Maliyet Optimizasyonu

## Context

Claude API ile 4 AI özelliği entegre edildi (öğün çeşitlendirme, egzersiz ipuçları, ilerleme analizi, sohbet). Mevcut implementasyonda hiçbir maliyet optimizasyonu yok — prompt caching kullanılmıyor, sunucu tarafı yanıt cache'i yok, sohbet geçmişi her turda tam olarak tekrar gönderiliyor, Sonnet gereksiz yere basit sorular için de kullanılıyor. Bu plan, API maliyetlerini %50-70 düşürmeyi hedefliyor.

**Mevcut maliyet profili:**

| Özellik | Model | Tahmini maliyet/istek | Risk |
|---|---|---|---|
| Öğün çeşitlendirme | Haiku 4.5 | ~$0.0005 | Düşük |
| Egzersiz ipuçları | Haiku 4.5 | ~$0.0005 | Düşük |
| İlerleme analizi | Sonnet 4.6 | ~$0.02 | Yüksek |
| Sohbet (10 tur) | Sonnet 4.6 | ~$0.10-0.20 | Çok yüksek |

**Ana sorunlar:**
1. Prompt caching (`cache_control`) hiç kullanılmıyor → system prompt'lar her istekte tam fiyattan faturalanıyor
2. Sonuç cache'i yok → aynı veriler için tekrar tekrar API çağrısı
3. Sohbet geçmişi sınırlandırılmamış → her turda artan token maliyeti
4. Rate limit sadece memory'de → restart'ta sıfırlanıyor, günlük/aylık limit yok
5. `buildUserContext()` her istekte DB'yi tekrar sorguluyor → gereksiz latency

---

## Değişiklik 1: Prompt Caching (en büyük tasarruf)

**Dosya:** `src/actions/ai.ts`, `src/app/api/ai/analyze/route.ts`, `src/app/api/ai/chat/route.ts`

Anthropic'in prompt caching özelliği, `cache_control: { type: "ephemeral" }` ile işaretlenen blokları 5 dakika TTL ile cache'ler. Cache'lenen tokenlar %90 indirimli faturalanır.

**Strateji:** System prompt'ları ve kullanıcı bağlamını `cache_control` ile işaretle. Özellikle sohbette, system prompt + kullanıcı bağlamı her turda aynı olduğu için büyük tasarruf sağlar.

Örnek (chat route):
```ts
messages.create({
  model: AI_MODELS.smart,
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: COACH_CHAT_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [...],
});
```

**Tahmini tasarruf:** Sohbette tur başına ~%40-60, diğer özelliklerde ~%20-30.

---

## Değişiklik 2: İlerleme Analizi Sonuç Cache'i

**Dosya:** `src/components/progress/progress-ai-analysis.tsx`

Mevcut: "Yenile" butonu her tıklamada Sonnet API çağrısı yapıyor (~$0.02/çağrı).

**Çözüm:** Analiz sonucunu component state'inde cache'le + "Yenile" butonunu kaldır, yerine son analiz zamanını göster. Kullanıcı yeni bir progress log eklediğinde cache'i invalidate et.

Ek olarak: İlerleme log sayısını 20'den **10'a** düşür — son 10 ölçüm yeterli, token maliyetini yarıya indirir. Segment detaylarını da 5'ten 3'e düşür.

**Tahmini tasarruf:** Tekrar çağrıları engeller → %50-80 azalma.

---

## Değişiklik 3: Rate Limit İyileştirmeleri

**Dosya:** `src/lib/ai.ts`

Mevcut: Tek bir 30 req/saat limiti, memory'de.

**Değişiklikler:**
- **Özellik bazlı limit**: Sonnet features (analiz: 3/gün, sohbet: 20/gün) vs Haiku features (öğün: 10/gün, egzersiz: 15/gün)
- Saatlik yerine **günlük** limit — daha anlamlı maliyet kontrolü
- Memory-based kalacak (DB'ye yazmaya gerek yok, bu zaten düşük trafikli invite-only app)

```ts
const DAILY_LIMITS = {
  meal: 10,
  exercise: 15,
  analyze: 3,
  chat: 20,
} as const;
```

**Tahmini tasarruf:** Sonnet kullanımını günde max ~$0.50 ile sınırlar.

---

## Değişiklik 4: Sohbet max_tokens Düşürme

**Dosya:** `src/app/api/ai/chat/route.ts`

Mevcut: `max_tokens: 1024` → mobil ekranda uzun yanıtlar zaten okunmuyor.

**Değişiklik:** `max_tokens: 512` — yeterli, mobil-uyumlu, output token maliyetini %50 azaltır.

Ayrıca sohbet geçmişi limitini 20 mesajdan **12 mesaja** (6 tur) düşür.

---

## Değişiklik 5: Egzersiz İpuçları Server-Side Cache

**Dosya:** `src/actions/ai.ts`

Mevcut: Client-side Map cache var ama sayfa yenilemede sıfırlanıyor.

**Çözüm:** `getExerciseFormTips` içinde basit bir `Map<string, string>` server-side cache ekle (exercise name bazlı). Aynı egzersiz adı için tekrar API çağrısı yapılmaz. Server module scope'da yaşar, restart'ta temizlenir (bu kabul edilebilir).

---

## Değişiklik 6: buildUserContext İçin Basit Cache

**Dosya:** `src/lib/ai-context.ts`

Mevcut: Her AI çağrısında 4 DB sorgusu çalışıyor.

**Çözüm:** 5 dakikalık TTL ile basit memory cache:
```ts
const contextCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 dk
```

Bu hem latency'yi azaltır hem gereksiz DB sorgularını engeller.

---

## Dosya Özeti

| Dosya | Değişiklik |
|---|---|
| `src/lib/ai.ts` | Özellik bazlı günlük rate limit |
| `src/lib/ai-context.ts` | 5dk TTL memory cache |
| `src/actions/ai.ts` | Prompt caching + egzersiz server cache |
| `src/app/api/ai/analyze/route.ts` | Prompt caching + log limiti 10'a düşür |
| `src/app/api/ai/chat/route.ts` | Prompt caching + max_tokens 512 + geçmiş limiti 12 |
| `src/components/progress/progress-ai-analysis.tsx` | Sonuç cache'i + yenile butonunu kısıtla |

---

## Tahmini Toplam Tasarruf

| Özellik | Önce | Sonra | Tasarruf |
|---|---|---|---|
| Öğün (5x/gün) | $0.003 | $0.002 | %30 |
| Egzersiz (3x/gün) | $0.002 | $0.0005 | %75 (cache hit) |
| Analiz (1x/gün) | $0.020 | $0.012 | %40 |
| Sohbet (10 tur) | $0.150 | $0.060 | %60 |
| **Günlük toplam** | **~$0.18** | **~$0.07** | **~%60** |

Aylık: ~$2.10 (tek kullanıcı), önceki ~$5.40'tan düşüş.

---

## Uygulama Sırası

1. `src/lib/ai.ts` — özellik bazlı günlük rate limit
2. `src/lib/ai-context.ts` — 5dk TTL cache
3. `src/actions/ai.ts` — prompt caching + egzersiz server cache
4. `src/app/api/ai/analyze/route.ts` — prompt caching + log limiti
5. `src/app/api/ai/chat/route.ts` — prompt caching + max_tokens + geçmiş limiti
6. `src/components/progress/progress-ai-analysis.tsx` — sonuç cache
7. `npm run build` + `npm run lint`

---

## Doğrulama

1. Build + lint başarılı
2. Aynı egzersiz için 2 kez tıklama → 2. istek cache'den gelir (API log'da tek çağrı)
3. İlerleme analizi → Sonuç gösterildikten sonra tekrar tıklama → cache'den gelir
4. Sohbet'te 7+ tur → 12 mesaj limiti aşılmaz
5. 4+ analiz isteği → "Günlük limit aşıldı" mesajı
6. Rate limit bilgisi Türkçe hata mesajı olarak gösterilir
