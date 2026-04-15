"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateUserOnboarding } from "@/actions/user";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Loader2, Ruler, Scale, Target, Heart, Sunrise, Briefcase, UtensilsCrossed, Home, Moon, Pill } from "lucide-react";

export default function ProfilTamamlaPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = session?.user;

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Daily routine
  const [wakeTime, setWakeTime] = useState("");
  const [workStartTime, setWorkStartTime] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [workoutTime, setWorkoutTime] = useState("");
  const [sleepTime, setSleepTime] = useState("");

  // Fitness background
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [sportHistory, setSportHistory] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  // Service type
  const [serviceType, setServiceType] = useState("full");

  useEffect(() => {
    if (!sessionPending && !user) router.push("/giris");
  }, [sessionPending, user, router]);

  // Prefill from existing profile data
  useEffect(() => {
    if (profile && !prefilled) {
      if (profile.height) setHeight(String(profile.height));
      if (profile.weight) setWeight(profile.weight);
      if (profile.targetWeight) setTargetWeight(profile.targetWeight);
      if (profile.healthNotes) setHealthNotes(profile.healthNotes);
      if (profile.fitnessLevel) setFitnessLevel(profile.fitnessLevel);
      if (profile.sportHistory) setSportHistory(profile.sportHistory);
      if (profile.currentMedications) setCurrentMedications(profile.currentMedications);
      if (profile.serviceType) setServiceType(profile.serviceType);
      if (profile.dailyRoutine && Array.isArray(profile.dailyRoutine)) {
        const routine = profile.dailyRoutine as { time: string; event: string }[];
        const eventMap: Record<string, (v: string) => void> = {
          "Uyanış": setWakeTime,
          "İşe gidiş": setWorkStartTime,
          "Öğle yemeği": setLunchTime,
          "İşten çıkış": setWorkEndTime,
          "Antrenman": setWorkoutTime,
          "Uyku": setSleepTime,
        };
        for (const item of routine) {
          eventMap[item.event]?.(item.time);
        }
      }
      setPrefilled(true);
    }
  }, [profile, prefilled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const h = parseInt(height, 10);
    if (!h || h < 100 || h > 250) {
      setError("Boy 100-250 cm arasında olmalıdır.");
      return;
    }

    const w = parseFloat(weight);
    if (!w || w < 30 || w > 300) {
      setError("Kilo 30-300 kg arasında olmalıdır.");
      return;
    }

    const tw = parseFloat(targetWeight);
    if (!tw || tw < 30 || tw > 300) {
      setError("Hedef kilo 30-300 kg arasında olmalıdır.");
      return;
    }

    setSaving(true);
    try {
      // Build daily routine array from filled time inputs
      const routineEntries: { time: string; event: string }[] = [];
      if (wakeTime) routineEntries.push({ time: wakeTime, event: "Uyanış" });
      if (workStartTime) routineEntries.push({ time: workStartTime, event: "İşe gidiş" });
      if (lunchTime) routineEntries.push({ time: lunchTime, event: "Öğle yemeği" });
      if (workEndTime) routineEntries.push({ time: workEndTime, event: "İşten çıkış" });
      if (workoutTime) routineEntries.push({ time: workoutTime, event: "Antrenman" });
      if (sleepTime) routineEntries.push({ time: sleepTime, event: "Uyku" });

      await updateUserOnboarding({
        height: h,
        weight: weight,
        targetWeight: targetWeight,
        healthNotes: healthNotes.trim() || undefined,
        dailyRoutine: routineEntries.length > 0 ? routineEntries : undefined,
        fitnessLevel: fitnessLevel || undefined,
        sportHistory: sportHistory.trim() || undefined,
        currentMedications: currentMedications.trim() || undefined,
        serviceType,
      });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      router.push("/");
      router.refresh();
    } catch {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  if (sessionPending || profileLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Profilini Tamamla</h1>
            <p className="text-sm text-muted-foreground">
              Sana özel program oluşturabilmemiz için bilgilerine ihtiyacımız var
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Hizmet Tipi</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setServiceType("full")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    serviceType === "full"
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <Dumbbell className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-xs font-medium">Tam Program</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Antrenman + Beslenme</p>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceType("nutrition")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    serviceType === "nutrition"
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <UtensilsCrossed className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                  <p className="text-xs font-medium">Sadece Beslenme</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Kişiye özel beslenme</p>
                </button>
              </div>
            </div>

            <Separator />
            <div className="space-y-2">
              <label htmlFor="height" className="text-sm font-medium leading-none flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                Boy (cm)
              </label>
              <input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                required
                min={100}
                max={250}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="175"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="weight" className="text-sm font-medium leading-none flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                Mevcut Kilo (kg)
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                min={30}
                max={300}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="80"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="targetWeight" className="text-sm font-medium leading-none flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Hedef Kilo (kg)
              </label>
              <input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                required
                min={30}
                max={300}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="75"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="healthNotes" className="text-sm font-medium leading-none flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                Sağlık Notları
                <span className="text-xs text-muted-foreground font-normal">(opsiyonel)</span>
              </label>
              <textarea
                id="healthNotes"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Yaralanmalar, alerjiler, diyet kısıtlamaları..."
              />
            </div>

            <Separator />

            {/* Daily Routine Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                Günlük Programın
                <span className="text-xs text-muted-foreground font-normal">(opsiyonel)</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="wakeTime" className="text-xs font-medium flex items-center gap-1.5">
                    <Sunrise className="h-3.5 w-3.5 text-muted-foreground" />
                    Kaçta kalkıyorsun?
                  </label>
                  <input id="wakeTime" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="workStartTime" className="text-xs font-medium flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    Kaçta işe gidiyorsun?
                  </label>
                  <input id="workStartTime" type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lunchTime" className="text-xs font-medium flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                    Öğle yemeği saatin?
                  </label>
                  <input id="lunchTime" type="time" value={lunchTime} onChange={(e) => setLunchTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="workEndTime" className="text-xs font-medium flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    Kaçta işten çıkıyorsun?
                  </label>
                  <input id="workEndTime" type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
                {serviceType === "full" && (
                  <div className="space-y-1.5">
                    <label htmlFor="workoutTime" className="text-xs font-medium flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                      Kaçta antrenman yapabilirsin?
                    </label>
                    <input id="workoutTime" type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="sleepTime" className="text-xs font-medium flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                    Kaçta yatıyorsun?
                  </label>
                  <input id="sleepTime" type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Fitness Background Section — only for full program users */}
            {serviceType === "full" && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                Fitness Geçmişin
                <span className="text-xs text-muted-foreground font-normal">(opsiyonel)</span>
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Deneyim Seviyesi</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "beginner", label: "Yeni Başlayan" },
                    { value: "returning", label: "Ara Vermiş, Tekrar Başlayan" },
                    { value: "intermediate", label: "Orta Düzey" },
                    { value: "advanced", label: "İleri Düzey" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFitnessLevel(fitnessLevel === opt.value ? "" : opt.value)}
                      className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                        fitnessLevel === opt.value
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sportHistory" className="text-xs font-medium flex items-center gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                  Spor Geçmişi
                </label>
                <textarea
                  id="sportHistory"
                  value={sportHistory}
                  onChange={(e) => setSportHistory(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Daha önce hangi sporları yaptın, ne kadar süre?"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="currentMedications" className="text-xs font-medium flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                  İlaçlar / Supplementler
                </label>
                <textarea
                  id="currentMedications"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Kullandığın ilaçlar veya supplementler"
                />
              </div>
            </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Kaydet ve Devam Et"
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
