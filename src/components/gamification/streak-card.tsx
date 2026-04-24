"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareStreakDialog } from "./share-streak-dialog";
import { useSession } from "@/lib/auth-client";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { ACHIEVEMENTS } from "@/data/achievements";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const { data: session } = useSession();
  const { data: stats } = useActivityStats();

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

  const unlocked = stats ? ACHIEVEMENTS.filter((a) => a.check(stats)).length : 0;
  const userName = session?.user?.name ?? "Ben";

  return (
    <>
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
                  <p className="text-sm font-semibold tabular-nums">
                    {currentStreak} gün üst üste
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={percent} className="flex-1 h-1.5" />
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      En uzun: {longestStreak}
                    </span>
                  </div>
                </>
              )}
            </div>
            {currentStreak > 0 && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Serini paylaş"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
      {shareOpen && (
        <ShareStreakDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          userName={userName}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          unlockedBadges={unlocked}
          totalBadges={ACHIEVEMENTS.length}
        />
      )}
    </>
  );
}
