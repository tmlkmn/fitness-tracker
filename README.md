# FitMusc

Kişisel fitness antrenman ve beslenme takip uygulaması.

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- shadcn/ui + Tailwind CSS v4
- Neon PostgreSQL + Drizzle ORM
- TanStack React Query
- better-auth (invite-only)
- Anthropic Claude (AI features)
- PWA Support (Serwist)

## Neon Auto-Suspend

Free Plan'da aylık 100 CU-hour kotası dolduğunda DB komutları reddedilir. Compute'u boştayken hızlı uyutmak için:

**Neon konsolu → Project → Settings → Compute → Auto-suspend delay:** `60s`

Default değer (5 dk) free tier kotasını çabuk tüketir; 60 sn'lik gecikme cron çağrıları arası kompozisyonu kapatıp ay sonuna kadar yetmesini sağlar. Cron her 5 dakikada bir çalışıyor (`vercel.json`), dolayısıyla iki çağrı arasındaki 4+ dk boşlukta compute uyur ve CU-hour sayacı durur.
