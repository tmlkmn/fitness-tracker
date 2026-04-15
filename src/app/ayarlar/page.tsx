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
  Plus,
  Trash2,
  Clock,
  Pill,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateDailyRoutine, updateSupplementSchedule } from "@/actions/user";
import { ShareManager } from "@/components/sharing/share-manager";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { ReminderSettingsCard } from "@/components/reminders/reminder-settings-card";
import { PwaInstallCard } from "@/components/layout/pwa-install-card";
import { PwaInstallButton } from "@/components/layout/pwa-install-button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

type RoutineItem = { time: string; event: string };

function DailyRoutineEditor({ profile }: { profile: ReturnType<typeof useUserProfile>["data"] }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
      setItems(profile.dailyRoutine as RoutineItem[]);
    }
  }, [profile?.dailyRoutine]);

  const handleSave = async () => {
    const filtered = items.filter((i) => i.time.trim() && i.event.trim());
    setSaving(true);
    try {
      await updateDailyRoutine(filtered);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground font-mono">{item.time}</span>
              <span>{item.event}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Henüz günlük akış eklenmemiş.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {items.length > 0 ? "Düzenle" : "Ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item.time}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], time: e.target.value };
              setItems(copy);
            }}
            placeholder="08:30"
            className="flex h-8 w-24 rounded-md border border-input bg-background px-2 text-xs font-mono"
          />
          <input
            value={item.event}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], event: e.target.value };
              setItems(copy);
            }}
            placeholder="Etkinlik"
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          />
          <button
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems([...items, { time: "", event: "" }])}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Satır Ekle
      </button>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
        </button>
        <button
          onClick={() => {
            if (profile?.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
              setItems(profile.dailyRoutine as RoutineItem[]);
            }
            setEditing(false);
          }}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent"
        >
          İptal
        </button>
      </div>
    </div>
  );
}

type SupplementItem = { period: string; supplements: string };

function SupplementScheduleEditor({ profile }: { profile: ReturnType<typeof useUserProfile>["data"] }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.supplementSchedule && Array.isArray(profile.supplementSchedule)) {
      setItems(profile.supplementSchedule as SupplementItem[]);
    }
  }, [profile?.supplementSchedule]);

  const handleSave = async () => {
    const filtered = items.filter((i) => i.period.trim() && i.supplements.trim());
    setSaving(true);
    try {
      await updateSupplementSchedule(filtered);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.period}:</span>
              <span className="font-medium">{item.supplements}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Henüz supplement takvimi eklenmemiş.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {items.length > 0 ? "Düzenle" : "Ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item.period}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], period: e.target.value };
              setItems(copy);
            }}
            placeholder="Hafta 1-2"
            className="flex h-8 w-24 rounded-md border border-input bg-background px-2 text-xs"
          />
          <input
            value={item.supplements}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], supplements: e.target.value };
              setItems(copy);
            }}
            placeholder="Supplement listesi"
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          />
          <button
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems([...items, { period: "", supplements: "" }])}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> Satır Ekle
      </button>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
        </button>
        <button
          onClick={() => {
            if (profile?.supplementSchedule && Array.isArray(profile.supplementSchedule)) {
              setItems(profile.supplementSchedule as SupplementItem[]);
            }
            setEditing(false);
          }}
          className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent"
        >
          İptal
        </button>
      </div>
    </div>
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

        <CollapsibleCard title="Günlük Akış" icon={Clock}>
          <DailyRoutineEditor profile={profile} />
        </CollapsibleCard>

        <CollapsibleCard title="Supplement Takvimi" icon={Pill}>
          <SupplementScheduleEditor profile={profile} />
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
