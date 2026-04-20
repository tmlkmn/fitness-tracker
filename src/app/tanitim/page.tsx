import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthAdmin } from "@/lib/auth-utils";
import {
  Dumbbell,
  Brain,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Bell,
  Users,
  Sparkles,
  Shield,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "FitMusc — AI Destekli Kişisel Fitness Takip",
  description:
    "Yapay zeka destekli kişisel antrenman ve beslenme programı. Haftalık plan oluşturma, ilerleme takibi, akıllı öneriler.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "FitMusc — AI Destekli Kişisel Fitness Takip",
    description:
      "Yapay zeka destekli kişisel antrenman ve beslenme programı.",
    type: "website",
  },
};

const features = [
  {
    icon: Brain,
    title: "AI ile Haftalık Plan",
    description:
      "Claude AI, vücut kompozisyonunuzu ve hedeflerinizi analiz ederek kişiye özel haftalık antrenman ve beslenme programı oluşturur.",
  },
  {
    icon: Calendar,
    title: "Akıllı Takvim",
    description:
      "Günlük antrenman ve beslenme planlarınızı takvim üzerinden takip edin. Geçmiş performansınızı görüntüleyin.",
  },
  {
    icon: Dumbbell,
    title: "Antrenman Takibi",
    description:
      "Set, tekrar ve ağırlık bilgilerinizi kaydedin. Egzersiz form ipuçları ve video demoları ile doğru teknik.",
  },
  {
    icon: TrendingUp,
    title: "İlerleme Analizi",
    description:
      "Kilo, vücut ölçüleri ve performans verilerinizi grafiklerle takip edin. AI analiz raporları alın.",
  },
  {
    icon: ShoppingCart,
    title: "Alışveriş Listesi",
    description:
      "Haftalık beslenme planınıza göre otomatik alışveriş listesi oluşturulur. Kategorilere göre gruplandırılır.",
  },
  {
    icon: Bell,
    title: "Bildirimler & Hatırlatıcılar",
    description:
      "Öğün saatleri, antrenman zamanı, su içme hatırlatıcıları. Push notification desteği.",
  },
  {
    icon: Users,
    title: "Plan Paylaşımı",
    description:
      "Haftalık planlarınızı diğer kullanıcılarla paylaşın. Antrenörünüz ilerlemenizi takip etsin.",
  },
  {
    icon: Sparkles,
    title: "AI Koç",
    description:
      "Fitness ve beslenme konularında AI asistanınızla sohbet edin. Kişiselleştirilmiş tavsiyeler alın.",
  },
  {
    icon: Shield,
    title: "Güvenli & Gizli",
    description:
      "Verileriniz şifreli bağlantılarla korunur. KVKK uyumlu veri işleme. Verileriniz sadece sizin.",
  },
  {
    icon: Smartphone,
    title: "Mobil Uygulama",
    description:
      "PWA teknolojisi ile telefonunuza yükleyin. Çevrimdışı erişim, push bildirimler.",
  },
];

export default async function TanitimPage() {
  try {
    await getAuthAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-dvh">
      {/* Hero */}
      <section className="px-4 py-16 text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          AI Destekli
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Kişisel Fitness
          <br />
          <span className="text-primary">Takip Uygulaması</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Yapay zeka destekli antrenman ve beslenme programları ile fitness
          hedeflerinize ulaşın. Kişiye özel planlar, ilerleme takibi ve akıllı
          öneriler.
        </p>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Neler Sunuyoruz?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing placeholder */}
      <section className="px-4 py-12 max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-2xl font-bold">Fiyatlandırma</h2>
        <p className="text-muted-foreground">
          Fiyatlandırma detayları yakında duyurulacaktır.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 space-y-2">
            <p className="font-semibold">Temel</p>
            <p className="text-2xl font-bold">Yakında</p>
            <p className="text-xs text-muted-foreground">
              Manuel plan oluşturma, takvim, ilerleme takibi
            </p>
          </div>
          <div className="rounded-xl border border-primary/50 bg-card p-6 space-y-2 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              Popüler
            </div>
            <p className="font-semibold">Pro</p>
            <p className="text-2xl font-bold">Yakında</p>
            <p className="text-xs text-muted-foreground">
              Tüm AI özellikleri, koç sohbet, analiz raporları
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FitMusc. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <a href="/gizlilik" className="hover:text-foreground transition-colors">
              Gizlilik Politikası
            </a>
            <a href="/kvkk" className="hover:text-foreground transition-colors">
              KVKK
            </a>
            <a href="/kullanim-sartlari" className="hover:text-foreground transition-colors">
              Kullanım Şartları
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
