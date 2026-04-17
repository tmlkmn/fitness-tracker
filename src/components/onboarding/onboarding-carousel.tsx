"use client";

import { useState, useRef, useCallback } from "react";
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

interface Slide {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const slides: Slide[] = [
  {
    icon: <Rocket className="h-12 w-12" />,
    title: "FitMusc'a Hoş Geldiniz!",
    description:
      "Kişisel fitness ve beslenme asistanınız. Antrenman programınızı takip edin, beslenmenizi planlayın ve ilerlemenizi görün.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: <Calendar className="h-12 w-12" />,
    title: "Haftalık Plan",
    description:
      "AI ile haftalık antrenman ve beslenme planı oluşturun. Her hafta size özel program hazırlansın.",
    color: "text-blue-400 bg-blue-400/10",
  },
  {
    icon: (
      <div className="flex gap-2">
        <Utensils className="h-10 w-10" />
        <Dumbbell className="h-10 w-10" />
      </div>
    ),
    title: "Günlük Takip",
    description:
      "Öğünlerinizi ve egzersizlerinizi tamamlandıkça işaretleyin. Günlük ilerlemenizi anlık görün.",
    color: "text-green-400 bg-green-400/10",
  },
  {
    icon: <Bot className="h-12 w-12" />,
    title: "AI Asistan",
    description:
      "Fitness koçunuza sorularınızı sorun. Beslenme önerileri, egzersiz alternatifleri ve motivasyon desteği alın.",
    color: "text-purple-400 bg-purple-400/10",
  },
  {
    icon: <TrendingUp className="h-12 w-12" />,
    title: "İlerleme Takibi",
    description:
      "Kilo, ölçüm ve grafiklerle gelişiminizi takip edin. AI analizi ile ilerlemenizi değerlendirin.",
    color: "text-yellow-400 bg-yellow-400/10",
  },
];

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
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const markSeen = useMarkOnboardingSeen();

  const isLast = current === slides.length - 1;

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

  const slide = slides[current];

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
          {/* Slide content */}
          <div className="text-center space-y-4">
            <div
              className={`h-20 w-20 rounded-2xl ${slide.color} flex items-center justify-center mx-auto transition-all duration-300`}
            >
              {slide.icon}
            </div>
            <h2 className="text-xl font-bold">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-6">
            {slides.map((_, i) => (
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

        {/* Navigation */}
        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          {current > 0 ? (
            <Button variant="ghost" size="sm" onClick={prev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Geri
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Atla
            </Button>
          )}

          <Button size="sm" onClick={next}>
            {isLast ? "Başla" : "İleri"}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
