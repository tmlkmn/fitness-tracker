"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Settings,
  LogOut,
  Loader2,
  Shield,
  Clock,
  Pill,
  Sparkles,
  X,
  Share2,
  Bell,
  BookOpen,
  Target,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { ProfileSummaryCard } from "@/components/settings/profile-summary-card";
import { SettingsGroup } from "@/components/settings/settings-group";
import { SettingsMenuItem } from "@/components/settings/settings-menu-item";
import { PwaInstallCard } from "@/components/layout/pwa-install-card";
import { PwaInstallButton } from "@/components/layout/pwa-install-button";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function AyarlarContent() {
  const { data: session } = useSession();
  const { data: profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const user = session?.user;

  
const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);

useEffect(() => {
  if (searchParams.get("onboarding") === "true") {
    setShowOnboardingBanner(true);
    window.history.replaceState(null, "", "/ayarlar");
  }
}, [searchParams]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
    router.push("/giris");
    router.refresh();
  };

  const routineMissing =
    !profile?.dailyRoutine ||
    !Array.isArray(profile.dailyRoutine) ||
    (profile.dailyRoutine as unknown[]).length === 0 ||
    !profile?.weekendRoutine ||
    !Array.isArray(profile.weekendRoutine) ||
    (profile.weekendRoutine as unknown[]).length === 0;

  const supplementMissing =
    !profile?.supplementSchedule ||
    !Array.isArray(profile.supplementSchedule) ||
    (profile.supplementSchedule as unknown[]).length === 0;

  const healthProfileMissing = profile != null && profile.gender == null;

  return (
    <div className="animate-fade-in">
      <Header
        title="Ayarlar"
        subtitle="Profil ve tercihler"
        icon={Settings}
        rightSlot={
          <div className="flex items-center gap-1">
            <PwaInstallButton />
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {showOnboardingBanner && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Profilinizi Tamamlayın</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Günlük akış, sağlık notları, fitness seviyesi ve supplement
                    bilgileriniz AI değerlendirmelerinde kullanılır. Ne kadar detaylı
                    doldurursanız, size özel program o kadar isabetli olur.
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboardingBanner(false)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <ProfileSummaryCard />

        <SettingsGroup label="Profil & Sağlık">
          <SettingsMenuItem
            icon={ShieldCheck}
            title="Yeni profil bilgileri"
            subtitle="Cinsiyet, günlük aktivite, sağlık durumları"
            href="/ayarlar/saglik"
            warning={healthProfileMissing}
          />
          <SettingsMenuItem
            icon={Clock}
            title="Günlük Akış"
            subtitle="Hafta içi ve hafta sonu rutinin"
            href="/ayarlar/rutin"
            warning={routineMissing}
          />
          <SettingsMenuItem
            icon={Pill}
            title="Takviye Takvimi"
            subtitle="Supplement ve ilaç zamanlaması"
            href="/ayarlar/takviye"
            warning={supplementMissing}
          />
        </SettingsGroup>

        <SettingsGroup label="Hedefler">
          <SettingsMenuItem
            icon={Target}
            title="Makro Hedefleri"
            subtitle="Kalori, protein, karbonhidrat, yağ"
            href="/ayarlar/makro"
          />
        </SettingsGroup>

        <SettingsGroup label="Uygulama">
          <SettingsMenuItem
            icon={Sliders}
            title="Birim ve Panel Tercihleri"
            subtitle="Kg / lbs · kcal / kJ · dashboard kartları"
            href="/ayarlar/tercihler"
          />
          <SettingsMenuItem
            icon={Bell}
            title="Bildirim ve Hatırlatıcılar"
            subtitle="Push, e-posta, hatırlatıcı zamanları"
            href="/ayarlar/bildirim"
          />
        </SettingsGroup>

        <SettingsGroup label="Paylaşım ve Veri">
          <SettingsMenuItem
            icon={BookOpen}
            title="Öğün Kütüphanem"
            subtitle="Kayıtlı öğünler ve günlük planlar"
            href="/ogunlerim"
          />
          <SettingsMenuItem
            icon={Share2}
            title="Plan Paylaşımı"
            subtitle="Programını başka kullanıcılarla paylaş"
            href="/ayarlar/paylasim"
          />
        </SettingsGroup>

        <PwaInstallCard />

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(user as any)?.role === "admin" && (
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md border border-primary/50 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Admin Paneli
          </Link>
        )}

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AyarlarPage() {
  return (
    <Suspense>
      <AyarlarContent />
    </Suspense>
  );
}
