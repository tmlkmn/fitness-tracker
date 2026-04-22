"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";
import { getTurkeyTodayStr } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dumbbell,
  Utensils,
  Calendar,
  TrendingUp,
  Bot,
  ShoppingCart,
  CreditCard,
  Moon,
  Waves,
  ChevronRight,
  Target,
  Scale,
  AlertCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useUserProfile } from "@/hooks/use-user";
import { useTodayDashboard, useWeekPlansByDate, useAllWeeks } from "@/hooks/use-plans";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { StreakCard } from "@/components/gamification/streak-card";
import { AchievementBadges } from "@/components/gamification/achievement-badges";
import { WaterDashboardWidget } from "@/components/water/water-dashboard-widget";
import { SleepDashboardWidget } from "@/components/sleep/sleep-dashboard-widget";
import { MacroTrendSparkline } from "@/components/meals/macro-trend-sparkline";

const PLAN_TYPE_CONFIG: Record<string, { icon: typeof Dumbbell; label: string; color: string }> = {
  workout: { icon: Dumbbell, label: "Antrenman", color: "text-green-400 bg-green-400/10" },
  swimming: { icon: Waves, label: "Yüzme", color: "text-blue-400 bg-blue-400/10" },
  rest: { icon: Moon, label: "Dinlenme", color: "text-yellow-400 bg-yellow-400/10" },
  nutrition: { icon: Utensils, label: "Beslenme", color: "text-emerald-400 bg-emerald-400/10" },
};

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function ProgressBar({ completed, total, color }: { completed: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
        {completed}/{total}
      </span>
    </div>
  );
}

export default function HomePage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const user = session?.user;

  // Redirect if no session
  useEffect(() => {
    if (!sessionPending && !user) router.push("/giris");
  }, [sessionPending, user, router]);

  const [todayStr] = useState(() => getTurkeyTodayStr());

  const { data: profile } = useUserProfile();
  const { data: today, isLoading: todayLoading } = useTodayDashboard();
  const { data: weekData } = useWeekPlansByDate(todayStr);
  const { data: weeks } = useAllWeeks();
  const { data: activityStats } = useActivityStats();

  // Onboarding carousel — auto-open on first login
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingTriggered, setOnboardingTriggered] = useState(false);

  useEffect(() => {
    if (profile && profile.hasSeenOnboarding === false && !onboardingTriggered) {
      setOnboardingOpen(true);
      setOnboardingTriggered(true);
    }
  }, [profile, onboardingTriggered]);

  // Current day in Turkish
  const [currentDay] = useState(() =>
    new Date().toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );

  // Capture "now" once at mount to avoid Date.now() in render
  const [nowMs] = useState(() => Date.now());

  // Membership info — compute from profile using stable nowMs
  const membershipInfo = (() => {
    if (!profile?.membershipEndDate) return null;
    const end = new Date(profile.membershipEndDate).getTime();
    if (end <= nowMs) return { days: 0, expired: true };
    return { days: Math.ceil((end - nowMs) / (1000 * 60 * 60 * 24)), expired: false };
  })();

  // Compute today's completion
  const mealsDone = today?.meals?.filter((m) => m.isCompleted).length ?? 0;
  const mealsTotal = today?.meals?.length ?? 0;
  const exercisesDone = today?.exercises?.filter((e) => e.isCompleted).length ?? 0;
  const exercisesTotal = today?.exercises?.length ?? 0;

  // Today's day of week (0 = Mon in our schema)
  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Convert JS Sunday=0 to our Monday=0
  })();

  if (sessionPending) {
    return (
      <div className="animate-fade-in">
        <Header title="FitMusc" rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        } />
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <Header
        title="FitMusc"
        subtitle={currentDay}
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />

      {/* Onboarding carousel — auto on first login, re-openable via trigger */}
      <OnboardingCarousel
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        isFirstTime={profile?.hasSeenOnboarding === false}
      />

      <div className="p-4 space-y-4">
        {/* Hero Card — Greeting + Membership */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="text-lg font-bold">Hoş geldin, {(user as any).name?.split(" ")[0] ?? ""}!</p>
                {(profile?.weight || profile?.targetWeight || profile?.height) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {[
                      profile.height ? `${profile.height} cm` : "",
                      profile.weight ? `${profile.weight} kg` : "",
                      profile.targetWeight ? `Hedef: ${profile.targetWeight} kg` : "",
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
                {profile?.healthNotes && (
                  <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                    {profile.healthNotes}
                  </p>
                )}
              </div>
              {profile?.membershipType && (
                <Badge
                  variant={membershipInfo?.expired ? "destructive" : "secondary"}
                  className="shrink-0"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  {profile.membershipType === "unlimited"
                    ? "Sınırsız"
                    : membershipInfo?.expired
                      ? "Süresi Doldu"
                      : `${membershipInfo?.days} gün`}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Incomplete Warning */}
        {profile && (!profile.height || !profile.weight || !profile.targetWeight) && (
          <Link href="/profil-tamamla">
            <Card className="border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Profilini tamamla</p>
                  <p className="text-xs text-muted-foreground">AI kişiselleştirme için bilgilerine ihtiyaç var</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Today's Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Bugünün Planı</h3>
              {today?.dailyPlan && (() => {
                const cfg = PLAN_TYPE_CONFIG[today.dailyPlan.planType] ?? PLAN_TYPE_CONFIG.workout;
                const Icon = cfg.icon;
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                );
              })()}
            </div>

            {todayLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : today?.dailyPlan ? (
              <>
                {today.dailyPlan.workoutTitle && (
                  <p className="text-sm text-muted-foreground">
                    {today.dailyPlan.workoutTitle}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Öğünler</span>
                    </div>
                    <ProgressBar completed={mealsDone} total={mealsTotal} color="bg-primary" />
                  </div>
                  {profile?.serviceType !== "nutrition" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Egzersizler</span>
                    </div>
                    <ProgressBar completed={exercisesDone} total={exercisesTotal} color="bg-green-500" />
                  </div>
                  )}
                </div>
                <Link
                  href={`/gun/${today.dailyPlan.id}`}
                  className="inline-flex items-center justify-center gap-2 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Bugünün Planına Git
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Bugün için plan bulunmuyor
                </p>
                <Link
                  href="/takvim"
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Takvime Git
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Strip */}
        {weekData?.dailyPlans && weekData.dailyPlans.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Bu Hafta</h3>
                {weekData.weeklyPlan && (
                  <span className="text-xs text-muted-foreground">
                    {weekData.weeklyPlan.title}
                  </span>
                )}
              </div>
              <div className="flex justify-between gap-1">
                {weekData.dailyPlans.map((day) => {
                  const cfg = PLAN_TYPE_CONFIG[day.planType] ?? PLAN_TYPE_CONFIG.workout;
                  const Icon = cfg.icon;
                  const isToday = day.dayOfWeek === todayDow;
                  return (
                    <Link
                      key={day.id}
                      href={`/gun/${day.id}`}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-lg py-2 transition-colors ${
                        isToday
                          ? "bg-primary/15 ring-1 ring-primary/30"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {DAY_LABELS[day.dayOfWeek]}
                      </span>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isToday ? "bg-primary/20" : "bg-muted/50"
                      }`}>
                        <Icon className={`h-3.5 w-3.5 ${isToday ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Mevcut</span>
              </div>
              <p className="text-lg font-bold">
                {profile?.weight ? `${profile.weight}` : "—"}
                <span className="text-xs font-normal text-muted-foreground ml-1">kg</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Hedef</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {profile?.targetWeight ? `${profile.targetWeight}` : "—"}
                <span className="text-xs font-normal text-muted-foreground ml-1">kg</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Program</span>
              </div>
              <p className="text-lg font-bold">
                {weeks?.length ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">hafta</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {profile?.serviceType === "nutrition" ? (
                  <>
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Bugün</span>
                  </>
                ) : (
                  <>
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Bugün</span>
                  </>
                )}
              </div>
              <p className="text-lg font-bold">
                {profile?.serviceType === "nutrition"
                  ? (mealsTotal > 0
                      ? `${Math.round((mealsDone / mealsTotal) * 100)}%`
                      : "—")
                  : (exercisesTotal > 0
                      ? `${Math.round((exercisesDone / exercisesTotal) * 100)}%`
                      : "—")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Su & Uyku Widgets */}
        <div className="grid grid-cols-2 gap-3">
          <WaterDashboardWidget />
          <SleepDashboardWidget />
        </div>

        {/* 7 Günlük Kalori Trendi */}
        <MacroTrendSparkline endDate={todayStr} metric="calories" />

        {/* Quick Access */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/takvim", icon: Calendar, label: "Takvim", desc: "Haftalık program" },
            { href: "/ilerleme", icon: TrendingUp, label: "İlerleme", desc: "Kilo & ölçümler" },
            { href: "/asistan", icon: Bot, label: "AI Asistan", desc: "Fitness koçu" },
            { href: "/alisveris", icon: ShoppingCart, label: "Alışveriş", desc: "Haftalık liste" },
            { href: "/paylasilan", icon: Users, label: "Paylaşılan", desc: "Benimle paylaşılan" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="hover:bg-accent hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer h-full">
                <CardContent className="p-3 flex flex-col gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Streak & Achievements */}
        {activityStats && (
          <>
            <StreakCard
              currentStreak={activityStats.currentStreak}
              longestStreak={activityStats.longestStreak}
            />
            <AchievementBadges stats={activityStats} />
          </>
        )}
      </div>
    </div>
  );
}
