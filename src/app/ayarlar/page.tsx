"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ShieldAlert,
  LogOut,
  Loader2,
  Shield,
  ChevronDown,
  CreditCard,
  Plus,
  Trash2,
  Clock,
  Pill,
  Pencil,
  Calendar,
  Sparkles,
  X,
  AlertTriangle,
  Share2,
  Bell,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateDailyRoutine, updateWeekendRoutine, updateSupplementSchedule, updateUserProfile } from "@/actions/user";
import { ShareManager } from "@/components/sharing/share-manager";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { ReminderSettingsCard } from "@/components/reminders/reminder-settings-card";
import { PwaInstallCard } from "@/components/layout/pwa-install-card";
import { PwaInstallButton } from "@/components/layout/pwa-install-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
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
  warning = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  warning?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{title}</span>
              {warning && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
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
  const [weekdayItems, setWeekdayItems] = useState<RoutineItem[]>([]);
  const [weekendItems, setWeekendItems] = useState<RoutineItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"weekday" | "weekend">("weekday");

  useEffect(() => {
    if (profile?.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
      setWeekdayItems(profile.dailyRoutine as RoutineItem[]);
    }
    if (profile?.weekendRoutine && Array.isArray(profile.weekendRoutine)) {
      setWeekendItems(profile.weekendRoutine as RoutineItem[]);
    }
  }, [profile?.dailyRoutine, profile?.weekendRoutine]);

  const handleSave = async () => {
    const filteredWeekday = weekdayItems.filter((i) => i.time.trim() && i.event.trim());
    const filteredWeekend = weekendItems.filter((i) => i.time.trim() && i.event.trim());
    setSaving(true);
    try {
      await updateDailyRoutine(filteredWeekday);
      await updateWeekendRoutine(filteredWeekend);
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const items = activeTab === "weekday" ? weekdayItems : weekendItems;
  const setItems = activeTab === "weekday" ? setWeekdayItems : setWeekendItems;

  const tabButton = (tab: "weekday" | "weekend", label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
        activeTab === tab
          ? "bg-primary/15 border-primary/40 text-primary"
          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );

  if (!editing) {
    const hasWeekend = weekendItems.length > 0;
    return (
      <div className="space-y-2">
        {weekdayItems.length > 0 ? (
          <>
            {hasWeekend && (
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hafta İçi</p>
            )}
            {weekdayItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{item.time}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Henüz günlük akış eklenmemiş.</p>
            <div className="opacity-40 space-y-1">
              {[
                { time: "07:00", event: "Uyanış" },
                { time: "08:00", event: "Kahvaltı" },
                { time: "12:30", event: "Öğle yemeği" },
                { time: "17:00", event: "Antrenman" },
                { time: "19:00", event: "Akşam yemeği" },
                { time: "23:00", event: "Uyku" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-mono">{item.time}</span>
                  <span>{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {hasWeekend && (
          <>
            <div className="border-t border-border/50 my-2" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hafta Sonu</p>
            {weekendItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono">{item.time}</span>
                <span>{item.event}</span>
              </div>
            ))}
          </>
        )}
        {weekdayItems.length > 0 && !hasWeekend && (
          <>
            <div className="border-t border-border/50 my-2" />
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 text-xs text-yellow-500 hover:underline"
            >
              <AlertTriangle className="h-3 w-3" />
              Hafta sonu programı eklenmemiş
            </button>
          </>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {weekdayItems.length > 0 ? "Düzenle" : "Ekle"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {tabButton("weekday", "Hafta İçi")}
        {tabButton("weekend", "Hafta Sonu")}
      </div>

      {items.map((item, i) => (
        <div key={`${activeTab}-${i}`} className="flex items-center gap-2">
          <input
            type="time"
            value={item.time}
            onChange={(e) => {
              const copy = [...items];
              copy[i] = { ...copy[i], time: e.target.value };
              setItems(copy);
            }}
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
              setWeekdayItems(profile.dailyRoutine as RoutineItem[]);
            }
            if (profile?.weekendRoutine && Array.isArray(profile.weekendRoutine)) {
              setWeekendItems(profile.weekendRoutine as RoutineItem[]);
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

const SUPPLEMENT_PERIOD_OPTIONS = [
  { value: "Sabah", label: "Sabah (uyanınca)" },
  { value: "Kahvaltı ile", label: "Kahvaltı ile" },
  { value: "Öğle", label: "Öğle" },
  { value: "Antrenman öncesi", label: "Antrenman öncesi" },
  { value: "Antrenman sonrası", label: "Antrenman sonrası" },
  { value: "Akşam yemeği ile", label: "Akşam yemeği ile" },
  { value: "Yatmadan önce", label: "Yatmadan önce" },
];

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
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Henüz supplement takvimi eklenmemiş.</p>
            <div className="opacity-40 space-y-1">
              {[
                { period: "Sabah", supplements: "Omega-3, Vitamin D" },
                { period: "Antrenman öncesi", supplements: "Kreatin, Kafein" },
                { period: "Yatmadan önce", supplements: "Magnezyum, ZMA" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.period}:</span>
                  <span>{item.supplements}</span>
                </div>
              ))}
            </div>
          </div>
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
      {items.map((item, i) => {
        const usedPeriods = items.map((it, idx) => idx !== i ? it.period : null).filter(Boolean);
        return (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={SUPPLEMENT_PERIOD_OPTIONS.some((o) => o.value === item.period) ? item.period : ""}
              onValueChange={(val) => {
                const copy = [...items];
                copy[i] = { ...copy[i], period: val };
                setItems(copy);
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs shrink-0">
                <SelectValue placeholder="Zaman seçin" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLEMENT_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={usedPeriods.includes(opt.value)}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={item.supplements}
              onChange={(e) => {
                const copy = [...items];
                copy[i] = { ...copy[i], supplements: e.target.value };
                setItems(copy);
              }}
              placeholder="ör. Omega-3, Kreatin"
              className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            />
            <button
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
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

const ALLERGEN_TAGS = [
  "Süt ürünleri", "Yumurta", "Fıstık", "Yer fıstığı",
  "Balık", "Kabuklu deniz ürünü", "Buğday (Gluten)",
  "Soya", "Susam", "Kereviz", "Hardal", "Bal",
];

const FITNESS_LEVEL_OPTIONS = [
  { value: "beginner", label: "Yeni başlayan" },
  { value: "returning", label: "Ara vermiş, tekrar başlayan" },
  { value: "intermediate", label: "Orta düzey" },
  { value: "advanced", label: "İleri düzey" },
];

function ProfileEditor({
  profile,
  userEmail,
}: {
  profile: ReturnType<typeof useUserProfile>["data"];
  userEmail?: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [age, setAge] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [sportHistory, setSportHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [serviceType, setServiceType] = useState("full");
  const [allergenMode, setAllergenMode] = useState<"none" | "has">("none");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [otherAllergens, setOtherAllergens] = useState("");

  useEffect(() => {
    if (profile) {
      setHeight(profile.height ? String(profile.height) : "");
      setWeight(profile.weight ?? "");
      setTargetWeight(profile.targetWeight ?? "");
      setAge(profile.age ? String(profile.age) : "");
      setHealthNotes(profile.healthNotes ?? "");
      setFitnessLevel(profile.fitnessLevel ?? "");
      setSportHistory(profile.sportHistory ?? "");
      setCurrentMedications(profile.currentMedications ?? "");
      setServiceType(profile.serviceType ?? "full");
      // Prefill allergens
      if (profile.foodAllergens) {
        try {
          const parsed = JSON.parse(profile.foodAllergens);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed.length === 1 && parsed[0] === "Yok") {
              setAllergenMode("none");
              setSelectedAllergens([]);
              setOtherAllergens("");
            } else {
              setAllergenMode("has");
              const known = parsed.filter((a: string) => ALLERGEN_TAGS.includes(a));
              const other = parsed.filter((a: string) => !ALLERGEN_TAGS.includes(a));
              setSelectedAllergens(known);
              setOtherAllergens(other.join(", "));
            }
          }
        } catch {
          setAllergenMode("has");
          setOtherAllergens(profile.foodAllergens);
        }
      }
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    // Build foodAllergens JSON
    let foodAllergens: string | undefined;
    if (allergenMode === "none") {
      foodAllergens = JSON.stringify(["Yok"]);
    } else {
      const all = [...selectedAllergens];
      if (otherAllergens.trim()) {
        const extras = otherAllergens.split(",").map((s) => s.trim()).filter(Boolean);
        all.push(...extras);
      }
      foodAllergens = all.length > 0 ? JSON.stringify(all) : JSON.stringify(["Yok"]);
    }
    try {
      await updateUserProfile({
        height: height ? parseInt(height, 10) : undefined,
        weight: weight || undefined,
        targetWeight: targetWeight || undefined,
        age: age ? parseInt(age, 10) : null,
        healthNotes: healthNotes.trim(),
        fitnessLevel: fitnessLevel || undefined,
        sportHistory: sportHistory.trim() || undefined,
        currentMedications: currentMedications.trim() || undefined,
        serviceType,
        foodAllergens,
      });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setHeight(profile.height ? String(profile.height) : "");
      setWeight(profile.weight ?? "");
      setTargetWeight(profile.targetWeight ?? "");
      setAge(profile.age ? String(profile.age) : "");
      setHealthNotes(profile.healthNotes ?? "");
      setFitnessLevel(profile.fitnessLevel ?? "");
      setSportHistory(profile.sportHistory ?? "");
      setCurrentMedications(profile.currentMedications ?? "");
      setServiceType(profile.serviceType ?? "full");
      // Reset allergens
      if (profile.foodAllergens) {
        try {
          const parsed = JSON.parse(profile.foodAllergens);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed.length === 1 && parsed[0] === "Yok") {
              setAllergenMode("none");
              setSelectedAllergens([]);
              setOtherAllergens("");
            } else {
              setAllergenMode("has");
              const known = parsed.filter((a: string) => ALLERGEN_TAGS.includes(a));
              const other = parsed.filter((a: string) => !ALLERGEN_TAGS.includes(a));
              setSelectedAllergens(known);
              setOtherAllergens(other.join(", "));
            }
          }
        } catch {
          setAllergenMode("has");
          setOtherAllergens(profile.foodAllergens);
        }
      } else {
        setAllergenMode("none");
        setSelectedAllergens([]);
        setOtherAllergens("");
      }
    }
    setEditing(false);
  };

  let healthNotesArr: string[] = [];
  if (profile?.healthNotes) {
    try {
      healthNotesArr = JSON.parse(profile.healthNotes);
    } catch {
      healthNotesArr = [profile.healthNotes];
    }
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="flex-1">Profil</span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Düzenle
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {userEmail && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">E-posta</span>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Yaş</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!profile?.age && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              <span className="text-sm font-medium">
                {profile?.age ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Boy</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!profile?.height && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              <span className="text-sm font-medium">
                {profile?.height ? `${profile.height} cm` : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Başlangıç kilosu</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!profile?.weight && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              <span className="text-sm font-medium">
                {profile?.weight ? `${profile.weight} kg` : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Hedef kilo</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!profile?.targetWeight && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              <span className="text-sm font-medium text-primary">
                {profile?.targetWeight ? `${profile.targetWeight} kg` : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hizmet Tipi</span>
            <span className="text-sm font-medium">
              {profile?.serviceType === "nutrition" ? "Sadece Beslenme" : "Tam Program"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fitness Seviyesi</span>
            <div className="flex items-center gap-1.5">
              {!profile?.fitnessLevel && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              <span className="text-sm font-medium">
                {profile?.fitnessLevel
                  ? FITNESS_LEVEL_OPTIONS.find((o) => o.value === profile.fitnessLevel)?.label ?? profile.fitnessLevel
                  : "—"}
              </span>
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Spor Geçmişi</span>
              {!profile?.sportHistory && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
            </div>
            <p className="text-sm font-medium line-clamp-3">
              {profile?.sportHistory || "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">İlaçlar</span>
              {!profile?.currentMedications && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
            </div>
            <p className="text-sm font-medium line-clamp-3">
              {profile?.currentMedications || "—"}
            </p>
          </div>
          <>
            <div className="border-t border-border my-1" />
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Sağlık Notları
                {healthNotesArr.length === 0 && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              </span>
              {healthNotesArr.length > 0 ? (
                healthNotesArr.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 pl-6">
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Info className="h-3 w-3" />
                    </Badge>
                    <p className="text-sm line-clamp-2">{note}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground pl-6">Henüz sağlık notu eklenmemiş.</p>
              )}
            </div>
          </>
          <>
            <div className="space-y-1.5">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Gıda Alerjileri
                {!profile?.foodAllergens && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              </span>
              {(() => {
                if (!profile?.foodAllergens) {
                  return <p className="text-xs text-muted-foreground pl-6">Henüz belirtilmemiş.</p>;
                }
                try {
                  const parsed = JSON.parse(profile.foodAllergens);
                  if (Array.isArray(parsed) && parsed.length === 1 && parsed[0] === "Yok") {
                    return <p className="text-sm font-medium pl-6">Yok</p>;
                  }
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1.5 pl-6">
                        {parsed.map((a: string, i: number) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    );
                  }
                } catch {
                  return <p className="text-sm font-medium pl-6">{profile.foodAllergens}</p>;
                }
                return null;
              })()}
            </div>
          </>
          {profile?.membershipType && (
            <>
              <div className="border-t border-border my-2" />
              <MembershipInfo profile={profile} />
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  const inputClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Profil Düzenle
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        {userEmail && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">E-posta</span>
            <span className="text-sm font-medium">{userEmail}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Yaş <span className="text-red-400">*</span></label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={100} placeholder="28" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Boy (cm)</label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} min={100} max={250} placeholder="175" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Başlangıç kilosu (kg)</label>
          <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={300} placeholder="80" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Hedef kilo (kg)</label>
          <input type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} min={30} max={300} placeholder="75" className={inputClass} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Hizmet Tipi</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setServiceType("full")}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${serviceType === "full" ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent"}`}
            >
              Tam Program
            </button>
            <button
              type="button"
              onClick={() => setServiceType("nutrition")}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${serviceType === "nutrition" ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent"}`}
            >
              Sadece Beslenme
            </button>
          </div>
        </div>

        {serviceType === "full" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Fitness Seviyesi <span className="text-red-400">*</span></label>
            <select
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className={inputClass}
            >
              <option value="">Seçiniz</option>
              {FITNESS_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {serviceType === "full" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Spor Geçmişi <span className="text-red-400">*</span></label>
            <textarea value={sportHistory} onChange={(e) => setSportHistory(e.target.value)} rows={2} placeholder="Daha önce yaptığınız sporlar..." className={`${inputClass} h-auto resize-none`} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">İlaçlar / Supplementler <span className="text-red-400">*</span></label>
          <textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} rows={2} placeholder="Kullandığınız ilaçlar veya takviyeler..." className={`${inputClass} h-auto resize-none`} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Sağlık Notları <span className="text-red-400">*</span></label>
          <textarea value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} rows={3} placeholder="Yaralanmalar, alerjiler, diyet kısıtlamaları..." className={`${inputClass} h-auto resize-none`} />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Gıda Alerjileri
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setAllergenMode("none"); setSelectedAllergens([]); setOtherAllergens(""); }}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${allergenMode === "none" ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent"}`}
            >
              Alerjim yok
            </button>
            <button
              type="button"
              onClick={() => setAllergenMode("has")}
              className={`p-2 rounded-md border text-xs font-medium transition-colors ${allergenMode === "has" ? "border-destructive bg-destructive/10 text-destructive" : "border-input hover:bg-accent"}`}
            >
              Var, belirtmek istiyorum
            </button>
          </div>
          {allergenMode === "has" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedAllergens((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedAllergens.includes(tag)
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={otherAllergens}
                onChange={(e) => setOtherAllergens(e.target.value)}
                rows={2}
                placeholder="Diğer alerjiler (virgülle ayırın)..."
                className={`${inputClass} h-auto resize-none`}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
            İptal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AyarlarContent() {
  const { data: session } = useSession();
  const { data: profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const user = session?.user;

  useEffect(() => {
    if (searchParams.get("onboarding") === "true") {
      setShowOnboardingBanner(true);
      // Clean URL without reload
      window.history.replaceState(null, "", "/ayarlar");
    }
  }, [searchParams]);

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
                    Günlük akış, sağlık notları, fitness seviyesi ve supplement bilgileriniz
                    AI değerlendirmelerinde kullanılır. Ne kadar detaylı doldurursanız,
                    size özel program o kadar isabetli olur.
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

        <ProfileEditor profile={profile} userEmail={user?.email} />

        <NotificationPreferencesCard />

        <PwaInstallCard />

        <CollapsibleCard title="Günlük Akış" icon={Clock} defaultOpen warning={!profile?.dailyRoutine || !Array.isArray(profile.dailyRoutine) || (profile.dailyRoutine as unknown[]).length === 0 || !profile?.weekendRoutine || !Array.isArray(profile.weekendRoutine) || (profile.weekendRoutine as unknown[]).length === 0}>
          <DailyRoutineEditor profile={profile} />
        </CollapsibleCard>

        <CollapsibleCard title="Supplement / Takviye / İlaç Takvimi" icon={Pill} defaultOpen>
          <SupplementScheduleEditor profile={profile} />
        </CollapsibleCard>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="flex-1 text-left">Hatırlatıcılar</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardTitle>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ReminderSettingsCard />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  <span className="flex-1 text-left">Plan Paylaşımı</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardTitle>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ShareManager />
          </CollapsibleContent>
        </Collapsible>

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
