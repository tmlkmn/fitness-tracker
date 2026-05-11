"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Dumbbell,
  Bot,
  Utensils,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Flame,
  Trophy,
  Target,
  Zap,
  Star,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Bell,
  Moon,
  Droplets,
  Activity,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const FEATURE_KEYS = ["ai", "nutrition", "progress", "weekly", "streak", "reminders"] as const;
const FEATURE_VISUALS: Record<
  (typeof FEATURE_KEYS)[number],
  { icon: typeof Bot; color: string; bg: string; border: string }
> = {
  ai: { icon: Bot, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-500/20 hover:border-violet-500/40" },
  nutrition: { icon: Utensils, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/20 hover:border-emerald-500/40" },
  progress: { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-500/20 hover:border-blue-500/40" },
  weekly: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-500/20 hover:border-orange-500/40" },
  streak: { icon: Flame, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-500/20 hover:border-red-500/40" },
  reminders: { icon: Bell, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-500/20 hover:border-yellow-500/40" },
};

const STEP_KEYS = ["invite", "profile", "go"] as const;
const STEP_VISUALS: Record<
  (typeof STEP_KEYS)[number],
  { num: string; icon: typeof Lock; color: string; bg: string; border: string }
> = {
  invite: { num: "1", icon: Lock, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  profile: { num: "2", icon: Target, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-500/30" },
  go: { num: "3", icon: Zap, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/30" },
};

const STAT_KEYS = ["aiIntegrations", "aiAccess", "experience", "pwa"] as const;
const STAT_VISUALS: Record<
  (typeof STAT_KEYS)[number],
  { value: string; icon: typeof Sparkles; color: string }
> = {
  aiIntegrations: { value: "6", icon: Sparkles, color: "text-violet-400" },
  aiAccess: { value: "24/7", icon: Bot, color: "text-primary" },
  experience: { value: "100%", icon: Star, color: "text-yellow-400" },
  pwa: { value: "PWA", icon: Dumbbell, color: "text-emerald-400" },
};

const GAME_KEYS = ["streak", "badges", "rings", "friends"] as const;
const GAME_VISUALS: Record<
  (typeof GAME_KEYS)[number],
  { icon: typeof Flame; color: string; bg: string }
> = {
  streak: { icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10" },
  badges: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  rings: { icon: Activity, color: "text-red-400", bg: "bg-red-400/10" },
  friends: { icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

const WELLNESS_KEYS = ["water", "sleep", "meals", "shopping"] as const;
const WELLNESS_VISUALS: Record<
  (typeof WELLNESS_KEYS)[number],
  { icon: typeof Droplets; color: string; bg: string }
> = {
  water: { icon: Droplets, color: "text-blue-400", bg: "bg-blue-400/10" },
  sleep: { icon: Moon, color: "text-indigo-400", bg: "bg-indigo-400/10" },
  meals: { icon: Utensils, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  shopping: { icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-400/10" },
};

export default function TanitimPage() {
  const t = useTranslations("landing");
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const aiBullets = t.raw("aiSpotlight.bullets") as string[];
  const progressBullets = t.raw("progress.bullets") as string[];
  const miniFeatures = t.raw("miniFeatures.items") as string[];

  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <nav
        aria-label={t("nav.ariaLabel")}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="font-extrabold text-base tracking-tight">FitMusc</span>
          </div>
          <Link
            href="/giris"
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            {t("nav.signIn")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative pt-28 pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full bg-primary/8 blur-[140px]" />
          <div className="absolute top-24 left-1/4 w-[350px] h-[350px] rounded-full bg-violet-500/7 blur-[100px]" />
          <div className="absolute top-16 right-1/4 w-[280px] h-[280px] rounded-full bg-emerald-500/6 blur-[90px]" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center space-y-7">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-semibold text-primary transition-all duration-700 ${
              heroVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {t("hero.pill")}
          </div>

          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight transition-all duration-700 delay-150 ${
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {t("hero.headline1")}
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">
              {t("hero.headline2")}
            </span>
          </h1>

          <p
            className={`text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-300 ${
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {t("hero.subhead")}
          </p>

          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 delay-500 ${
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Link
              href="/giris"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-primary/30"
            >
              {t("hero.ctaStart")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t("hero.inviteNote")}
            </span>
          </div>

          <div
            className={`relative mt-14 mx-auto max-w-sm transition-all duration-1000 delay-700 ${
              heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-4 space-y-4 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Dumbbell className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">{t("mock.todaysPlan")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("mock.todaysPlanSub")}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                  {t("mock.inProgress")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("mock.calories"), value: "1840", unit: "kcal", color: "text-orange-400" },
                  { label: t("mock.protein"), value: "148", unit: "g", color: "text-blue-400" },
                  { label: t("mock.carbs"), value: "210", unit: "g", color: "text-emerald-400" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl bg-muted/50 p-2.5 text-center">
                    <p className={`text-sm font-extrabold ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{m.unit}</p>
                    <p className="text-[9px] text-muted-foreground/70">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Utensils className="h-2.5 w-2.5" /> {t("mock.meals")}
                    </span>
                    <span className="font-semibold">3 / 5</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-3/5 rounded-full bg-primary transition-all" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Dumbbell className="h-2.5 w-2.5" /> {t("mock.exercises")}
                    </span>
                    <span className="font-semibold">4 / 6</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-emerald-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 sm:-right-6 -top-5 rounded-xl border border-violet-500/30 bg-card/95 backdrop-blur-sm p-3 shadow-xl max-w-[175px]">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-violet-400" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t("mock.aiBubble")}
                </p>
              </div>
            </div>

            <div className="absolute -left-4 sm:-left-6 -bottom-4 rounded-xl border border-orange-500/30 bg-card/95 backdrop-blur-sm p-2.5 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-500/15 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold">{t("mock.streakTitle")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("mock.streakSub")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 px-4 border-y border-border/40 bg-muted/20">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STAT_KEYS.map((key, i) => {
            const v = STAT_VISUALS[key];
            const Icon = v.icon;
            return (
              <AnimatedSection key={key} delay={i * 80} className="text-center space-y-1.5">
                <Icon className={`h-5 w-5 ${v.color} mx-auto`} />
                <p className="text-2xl font-extrabold">{v.value}</p>
                <p className="text-xs text-muted-foreground">{t(`stats.${key}`)}</p>
              </AnimatedSection>
            );
          })}
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-14 space-y-3">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest">
              {t("features.tag")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">{t("features.heading")}</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t("features.subhead")}</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_KEYS.map((key, i) => {
              const v = FEATURE_VISUALS[key];
              const Icon = v.icon;
              return (
                <AnimatedSection key={key} delay={i * 70}>
                  <div className={`group rounded-2xl border ${v.border} bg-card/50 p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full`}>
                    <div className={`h-11 w-11 rounded-xl ${v.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${v.color}`} />
                    </div>
                    <h3 className="font-bold text-sm">{t(`features.items.${key}.title`)}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`features.items.${key}.desc`)}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-violet-500/6 via-violet-500/3 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection className="space-y-6">
              <span className="inline-block text-xs font-bold text-violet-400 uppercase tracking-widest">
                {t("aiSpotlight.tag")}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-snug">
                {t("aiSpotlight.heading1")}
                <span className="block text-violet-400">{t("aiSpotlight.heading2")}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("aiSpotlight.bodyA")}
                <strong className="text-foreground">{t("aiSpotlight.bodyStrong")}</strong>
                {t("aiSpotlight.bodyB")}
              </p>
              <ul className="space-y-3">
                {aiBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection delay={200} className="relative">
              <div className="rounded-2xl border border-violet-500/25 bg-card/70 backdrop-blur-sm p-5 space-y-4 shadow-xl shadow-violet-900/10">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                    <Bot className="h-4.5 w-4.5 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t("aiSpotlight.chatTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("aiSpotlight.chatModel")}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    {t("aiSpotlight.online")}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/15 px-3.5 py-2.5 text-xs">
                      {t("aiSpotlight.userMsg1")}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-violet-400" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted/80 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                      {t("aiSpotlight.aiMsg1A")}
                      <strong className="text-foreground">{t("aiSpotlight.aiMsg1Strong")}</strong>
                      {t("aiSpotlight.aiMsg1B")}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/15 px-3.5 py-2.5 text-xs">
                      {t("aiSpotlight.userMsg2")}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-violet-400" />
                    </div>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted/80 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                      {t("aiSpotlight.aiMsg2A")}
                      <strong className="text-foreground">{t("aiSpotlight.aiMsg2Strong")}</strong>
                      {t("aiSpotlight.aiMsg2B")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <div className="flex-1 h-9 rounded-lg bg-muted/50 border border-border/50 px-3 flex items-center text-xs text-muted-foreground/50">
                    {t("aiSpotlight.inputPlaceholder")}
                  </div>
                  <button
                    type="button"
                    aria-label={t("aiSpotlight.send")}
                    className="h-9 w-9 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-violet-400" />
                  </button>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection className="relative order-2 md:order-1">
              <div className="rounded-2xl border border-blue-500/20 bg-card/70 backdrop-blur-sm p-5 space-y-5 shadow-xl shadow-blue-900/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{t("progress.summaryTitle")}</h4>
                  <span className="text-xs text-blue-400 font-medium">{t("progress.summarySub")}</span>
                </div>

                <div className="flex items-end gap-1 h-20">
                  {[35, 50, 42, 62, 55, 68, 64, 78, 72, 82, 75, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-blue-500/70 to-blue-400/30"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{t("progress.dateStart")}</span>
                  <span>{t("progress.dateMid")}</span>
                  <span>{t("progress.dateEnd")}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t("progress.startLabel"), value: "89 kg", className: "text-muted-foreground" },
                    { label: t("progress.nowLabel"), value: "83 kg", className: "font-bold text-foreground" },
                    { label: t("progress.targetLabel"), value: "78 kg", className: "text-primary font-bold" },
                  ].map((s) => (
                    <div key={s.label} className="text-center rounded-xl bg-muted/50 p-2.5">
                      <p className={`text-sm ${s.className}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("progress.distance")}</span>
                    <span className="text-primary font-bold">{t("progress.distanceValue")}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-primary w-[55%]" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">{t("progress.complete")}</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200} className="space-y-6 order-1 md:order-2">
              <span className="inline-block text-xs font-bold text-blue-400 uppercase tracking-widest">
                {t("progress.tag")}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-snug">
                {t("progress.heading1")}
                <span className="block text-blue-400">{t("progress.heading2")}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">{t("progress.body")}</p>
              <ul className="space-y-3">
                {progressBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-orange-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <AnimatedSection className="space-y-3">
            <span className="inline-block text-xs font-bold text-orange-400 uppercase tracking-widest">
              {t("gamification.tag")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">{t("gamification.heading")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{t("gamification.subhead")}</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {GAME_KEYS.map((key, i) => {
              const v = GAME_VISUALS[key];
              const Icon = v.icon;
              return (
                <AnimatedSection key={key} delay={i * 80}>
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-3 text-center h-full hover:border-border transition-colors">
                    <div className={`h-11 w-11 rounded-xl ${v.bg} flex items-center justify-center mx-auto`}>
                      <Icon className={`h-5 w-5 ${v.color}`} />
                    </div>
                    <p className="text-sm font-bold">{t(`gamification.items.${key}.title`)}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t(`gamification.items.${key}.desc`)}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-10 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{t("wellness.heading")}</h2>
            <p className="text-muted-foreground">{t("wellness.subhead")}</p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {WELLNESS_KEYS.map((key, i) => {
              const v = WELLNESS_VISUALS[key];
              const Icon = v.icon;
              return (
                <AnimatedSection key={key} delay={i * 80}>
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-5 space-y-2.5 text-center hover:border-border transition-colors">
                    <div className={`h-10 w-10 rounded-xl ${v.bg} flex items-center justify-center mx-auto`}>
                      <Icon className={`h-5 w-5 ${v.color}`} />
                    </div>
                    <p className="text-sm font-bold">{t(`wellness.items.${key}.title`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`wellness.items.${key}.desc`)}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection className="text-center mb-14 space-y-3">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-widest">
              {t("how.tag")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">{t("how.heading")}</h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div
              className="hidden sm:block absolute top-9 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent"
              aria-hidden="true"
            />

            {STEP_KEYS.map((key, i) => {
              const v = STEP_VISUALS[key];
              const Icon = v.icon;
              return (
                <AnimatedSection key={key} delay={i * 150} className="relative text-center space-y-4">
                  <div className="relative inline-block">
                    <div className={`h-20 w-20 rounded-2xl border-2 ${v.border} ${v.bg} flex items-center justify-center mx-auto`}>
                      <Icon className={`h-8 w-8 ${v.color}`} />
                    </div>
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center shadow">
                      {v.num}
                    </span>
                  </div>
                  <h3 className="font-bold">{t(`how.steps.${key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`how.steps.${key}.desc`)}</p>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold">{t("miniFeatures.heading")}</h2>
            <p className="text-muted-foreground text-sm">{t("miniFeatures.subhead")}</p>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {miniFeatures.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3 hover:border-border hover:bg-card/60 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <AnimatedSection className="space-y-7">
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl font-semibold leading-relaxed">
              &ldquo;{t("testimonial.quote")}&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                <span className="text-sm font-extrabold text-primary">AY</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">{t("testimonial.author")}</p>
                <p className="text-xs text-muted-foreground">{t("testimonial.authorMeta")}</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="relative max-w-lg mx-auto text-center space-y-7">
          <AnimatedSection className="space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold">{t("finalCta.heading")}</h2>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {t("finalCta.body")}
            </p>
            <div className="space-y-3">
              <Link
                href="/giris"
                className="inline-flex items-center gap-2 h-13 px-12 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-all hover:scale-[1.03] active:scale-[0.98] shadow-2xl shadow-primary/30"
              >
                {t("finalCta.signIn")}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" />
                {t("finalCta.access")}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-3 w-3 text-primary" />
            </div>
            <span className="font-bold text-foreground">FitMusc</span>
            <span>{t("footer.tagline")}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/gizlilik" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/kullanim-sartlari" className="hover:text-foreground transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/kvkk" className="hover:text-foreground transition-colors">
              {t("footer.kvkk")}
            </Link>
            <Link href="/giris" className="hover:text-foreground transition-colors">
              {t("footer.signIn")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
