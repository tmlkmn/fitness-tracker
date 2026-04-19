"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const percent =
    longestStreak > 0
      ? Math.round((currentStreak / longestStreak) * 100)
      : 0;

  const flameColor =
    currentStreak === 0
      ? "text-muted-foreground"
      : currentStreak < 7
        ? "text-orange-400"
        : currentStreak < 30
          ? "text-amber-400"
          : "text-red-500";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("shrink-0", flameColor)}>
            <Flame className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            {currentStreak === 0 ? (
              <>
                <p className="text-sm font-semibold">Seri yok</p>
                <p className="text-xs text-muted-foreground">
                  Bugün ilk günün olsun!
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">
                  {currentStreak} gün üst üste
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={percent} className="flex-1 h-1.5" />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    En uzun: {longestStreak}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
