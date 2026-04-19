"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS } from "@/data/achievements";
import { AchievementDetailPopover } from "./achievement-detail-popover";
import type { ActivityStats } from "@/actions/activity-stats";
import { Trophy } from "lucide-react";

interface AchievementBadgesProps {
  stats: ActivityStats;
}

export function AchievementBadges({ stats }: AchievementBadgesProps) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.check(stats)).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Rozetler</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {unlockedCount} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {ACHIEVEMENTS.map((achievement) => (
            <AchievementDetailPopover
              key={achievement.id}
              achievement={achievement}
              unlocked={achievement.check(stats)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
