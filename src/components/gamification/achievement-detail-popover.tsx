"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { DynamicIcon } from "@/lib/icon-map";
import type { Achievement } from "@/data/achievements";

interface AchievementDetailPopoverProps {
  achievement: Achievement;
  unlocked: boolean;
}

export function AchievementDetailPopover({
  achievement,
  unlocked,
}: AchievementDetailPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[4.5rem] transition-colors",
            unlocked
              ? "hover:bg-muted/50"
              : "opacity-40 hover:opacity-60",
          )}
        >
          {unlocked ? (
            <DynamicIcon icon={achievement.icon} className="h-5 w-5 text-primary" />
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-[10px] text-center leading-tight max-w-[4rem] truncate">
            {achievement.title}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {unlocked ? (
              <DynamicIcon icon={achievement.icon} className="h-5 w-5 text-primary" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm font-semibold">{achievement.title}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {achievement.description}
          </p>
          <Badge
            variant={unlocked ? "default" : "outline"}
            className="text-[10px]"
          >
            {unlocked ? "Kazanıldı" : "Kilitli"}
          </Badge>
        </div>
      </PopoverContent>
    </Popover>
  );
}
