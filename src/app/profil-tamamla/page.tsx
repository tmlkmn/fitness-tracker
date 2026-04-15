"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { updateUserOnboarding } from "@/actions/user";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Loader2, Ruler, Scale, Target, Heart } from "lucide-react";

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
      await updateUserOnboarding({
        height: h,
        weight: weight,
        targetWeight: targetWeight,
        healthNotes: healthNotes.trim() || undefined,
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
