"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Utensils,
  Dumbbell,
  Bot,
  TrendingUp,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMarkOnboardingSeen } from "@/hooks/use-user";

const SLIDE_KEYS = ["welcome", "weekly", "daily", "ai", "progress"] as const;
type SlideKey = (typeof SLIDE_KEYS)[number];

const SLIDE_VISUALS: Record<SlideKey, { icon: React.ReactNode; color: string }> = {
  welcome: {
    icon: <Rocket className="h-12 w-12" />,
    color: "text-primary bg-primary/10",
  },
  weekly: {
    icon: <Calendar className="h-12 w-12" />,
    color: "text-blue-400 bg-blue-400/10",
  },
  daily: {
    icon: (
      <div className="flex gap-2">
        <Utensils className="h-10 w-10" />
        <Dumbbell className="h-10 w-10" />
      </div>
    ),
    color: "text-green-400 bg-green-400/10",
  },
  ai: {
    icon: <Bot className="h-12 w-12" />,
    color: "text-purple-400 bg-purple-400/10",
  },
  progress: {
    icon: <TrendingUp className="h-12 w-12" />,
    color: "text-yellow-400 bg-yellow-400/10",
  },
};

interface OnboardingCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstTime?: boolean;
}

export function OnboardingCarousel({
  open,
  onOpenChange,
  isFirstTime,
}: OnboardingCarouselProps) {
  const t = useTranslations("onboarding.carousel");
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const markSeen = useMarkOnboardingSeen();

  const isLast = current === SLIDE_KEYS.length - 1;

  const handleComplete = useCallback(() => {
    if (isFirstTime) {
      markSeen.mutate();
    }
    onOpenChange(false);
    setCurrent(0);
  }, [isFirstTime, markSeen, onOpenChange]);

  const handleSkip = useCallback(() => {
    if (isFirstTime) {
      markSeen.mutate();
    }
    onOpenChange(false);
    setCurrent(0);
  }, [isFirstTime, markSeen, onOpenChange]);

  const next = useCallback(() => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [isLast, handleComplete]);

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
  };

  const slideKey = SLIDE_KEYS[current];
  const visual = SLIDE_VISUALS[slideKey];

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleSkip();
      }}
    >
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        <div
          className="px-6 pt-8 pb-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="text-center space-y-4">
            <div
              className={`h-20 w-20 rounded-2xl ${visual.color} flex items-center justify-center mx-auto transition-all duration-300`}
            >
              {visual.icon}
            </div>
            <h2 className="text-xl font-bold">{t(`slides.${slideKey}.title`)}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`slides.${slideKey}.description`)}
            </p>
          </div>

          <div className="flex justify-center gap-1.5 mt-6">
            {SLIDE_KEYS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          {current > 0 ? (
            <Button variant="ghost" size="sm" onClick={prev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("back")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              {t("skip")}
            </Button>
          )}

          <Button size="sm" onClick={next}>
            {isLast ? t("start") : t("next")}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
