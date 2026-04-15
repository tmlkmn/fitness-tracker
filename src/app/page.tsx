import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Utensils,
  Calendar,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-utils";
import { getUserProfile } from "@/actions/user";
import { getAllWeeks } from "@/actions/plans";

export default async function HomePage() {
  let user;
  try {
    user = await getAuthSession();
  } catch {
    redirect("/giris");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any).isApproved) {
    redirect("/bekliyor");
  }

  const [profile, weeks] = await Promise.all([
    getUserProfile(),
    getAllWeeks(),
  ]);

  const currentDay = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Parse health notes — support JSON array or plain string
  let healthBadges: string[] = [];
  if (profile.healthNotes) {
    try {
      const parsed = JSON.parse(profile.healthNotes);
      if (Array.isArray(parsed)) healthBadges = parsed;
      else healthBadges = [profile.healthNotes];
    } catch {
      healthBadges = profile.healthNotes
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }

  const hasWeeks = weeks.length > 0;

  return (
    <div className="animate-fade-in">
      <Header title="FitTrack" subtitle={currentDay} rightSlot={<NotificationBell />} />
      <div className="p-4 space-y-4">
        {/* Hero Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              Hoş geldin, {(user as any).name ?? ""}!
            </p>
            {hasWeeks ? (
              <>
                <h2 className="text-xl font-bold mt-1">
                  {weeks.length} Haftalık Program
                </h2>
                {(profile.weight || profile.targetWeight) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.weight ? `${profile.weight} kg` : ""}
                    {profile.weight && profile.targetWeight ? " \u2192 " : ""}
                    {profile.targetWeight
                      ? `Hedef: ${profile.targetWeight} kg`
                      : ""}
                  </p>
                )}
              </>
            ) : (
              <h2 className="text-xl font-bold mt-1">
                Henüz program oluşturulmadı
              </h2>
            )}
            {healthBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {healthBadges.map((note) => (
                  <Badge key={note} variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {note}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        {hasWeeks && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">{weeks.length}</p>
                <p className="text-xs text-muted-foreground">Hafta</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Utensils className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">
                  {profile.weight ? `${profile.weight} kg` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Mevcut Kilo</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hizli Erisim */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hızlı Erişim
          </h3>
          <Link href="/takvim">
            <Card className="hover:bg-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Haftalık Program</p>
                  <p className="text-xs text-muted-foreground">
                    Antrenman ve beslenme takvimi
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ilerleme">
            <Card className="hover:bg-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">İlerleme Takibi</p>
                  <p className="text-xs text-muted-foreground">
                    Kilo ve ölçüm grafikleri
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/paylasilan">
            <Card className="hover:bg-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Paylaşılan Planlar</p>
                  <p className="text-xs text-muted-foreground">
                    Sizinle paylaşılan programlar
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Program Ozeti */}
        {hasWeeks && (
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Program Özeti</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2 space-y-2">
              {weeks.map((week) => (
                <div key={week.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Hafta {week.weekNumber}:
                  </span>
                  <span className="font-medium">
                    {week.title} ({week.phase})
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
