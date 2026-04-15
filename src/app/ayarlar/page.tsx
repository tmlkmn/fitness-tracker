"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  User,
  Scale,
  Ruler,
  Heart,
  Info,
  Settings,
  LogOut,
  Loader2,
  Shield,
  ChevronDown,
  CreditCard,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { ShareManager } from "@/components/sharing/share-manager";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { ReminderSettingsCard } from "@/components/reminders/reminder-settings-card";
import { PwaInstallCard } from "@/components/layout/pwa-install-card";
import { PwaInstallButton } from "@/components/layout/pwa-install-button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const MEMBERSHIP_LABELS: Record<string, string> = {
  unlimited: "Sınırsız",
  "1-month": "1 Ay",
  "3-month": "3 Ay",
  "6-month": "6 Ay",
  "1-year": "1 Yıl",
  custom: "Özel",
};

function MembershipInfo({
  profile,
}: {
  profile: {
    membershipType: string | null;
    membershipStartDate: Date | null;
    membershipEndDate: Date | null;
  };
}) {
  const label = MEMBERSHIP_LABELS[profile.membershipType ?? ""] ?? profile.membershipType;
  const startDate = profile.membershipStartDate
    ? new Date(profile.membershipStartDate).toLocaleDateString("tr-TR")
    : null;
  const endDate = profile.membershipEndDate
    ? new Date(profile.membershipEndDate).toLocaleDateString("tr-TR")
    : null;

  const [snapshot] = useState(() => {
    if (!profile.membershipEndDate) return { isExpired: false, remainingDays: null };
    const end = new Date(profile.membershipEndDate).getTime();
    const now = Date.now();
    const expired = end <= now;
    return {
      isExpired: expired,
      remainingDays: expired ? null : Math.ceil((end - now) / (1000 * 60 * 60 * 24)),
    };
  });

  const { isExpired, remainingDays } = snapshot;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Üyelik</span>
        </div>
        <Badge variant={isExpired ? "destructive" : "secondary"}>
          {label}
        </Badge>
      </div>
      {startDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Başlangıç</span>
          <span className="text-sm font-medium">{startDate}</span>
        </div>
      )}
      {endDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Bitiş</span>
          <span className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
            {endDate}
          </span>
        </div>
      )}
      {remainingDays !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Kalan Süre</span>
          <span className="text-sm font-medium text-primary">
            {remainingDays} gün
          </span>
        </div>
      )}
      {profile.membershipType === "unlimited" && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Bitiş</span>
          <span className="text-sm font-medium">—</span>
        </div>
      )}
    </div>
  );
}

function CollapsibleCard({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{title}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 pt-2">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AyarlarPage() {
  const { data: session } = useSession();
  const { data: profile } = useUserProfile();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const user = session?.user;

  let healthNotes: string[] = [];
  if (profile?.healthNotes) {
    try {
      healthNotes = JSON.parse(profile.healthNotes);
    } catch {
      healthNotes = [profile.healthNotes];
    }
  }

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
    router.push("/giris");
    router.refresh();
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Ayarlar"
        subtitle="Profil ve sağlık bilgileri"
        icon={Settings}
        rightSlot={
          <div className="flex items-center gap-1">
            <PwaInstallButton />
            <NotificationBell />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {/* Profile — always open, not collapsible */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {user && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">E-posta</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Başlangıç kilosu
                </span>
              </div>
              <span className="text-sm font-medium">
                {profile?.weight ? `${profile.weight} kg` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Hedef kilo
                </span>
              </div>
              <span className="text-sm font-medium text-primary">
                {profile?.targetWeight ? `${profile.targetWeight} kg` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Boy</span>
              </div>
              <span className="text-sm font-medium">
                {profile?.height ? `${profile.height} cm` : "—"}
              </span>
            </div>
            {/* Membership info */}
            {profile?.membershipType && (
              <>
                <div className="border-t border-border my-2" />
                <MembershipInfo profile={profile} />
              </>
            )}
          </CardContent>
        </Card>

        <PwaInstallCard />

        <CollapsibleCard title="Sağlık Notları" icon={Heart}>
          <div className="space-y-2">
            {healthNotes.length > 0 ? (
              healthNotes.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Info className="h-3 w-3" />
                  </Badge>
                  <p className="text-sm">{note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Sağlık notu bulunmuyor.
              </p>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Günlük Akış" icon={Info}>
          <div className="space-y-2">
            {[
              { time: "08:30", event: "Uyanış" },
              { time: "08:30-11:00", event: "Çocuk okula, toplantılar" },
              { time: "10:30-11:00", event: "İlk kahvaltı fırsatı" },
              { time: "19:00-20:30", event: "Antrenman" },
              { time: "20:30-21:00", event: "Duş & toparlanma" },
              { time: "21:00", event: "Antrenman sonrası beslenme" },
              { time: "24:00", event: "Uyku" },
            ].map(({ time, event }) => (
              <div key={time} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{time}</span>
                <span>{event}</span>
              </div>
            ))}
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Supplement Takvimi" icon={Info}>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hafta 1-2:</span>
              <span className="font-medium">Supplement yok</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hafta 3:</span>
              <span className="font-medium">Whey Protein (su ile)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hafta 4:</span>
              <span className="font-medium">Whey + Omega-3 + Magnezyum</span>
            </div>
          </div>
        </CollapsibleCard>

        <NotificationPreferencesCard />

        <ReminderSettingsCard />

        <ShareManager />

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
