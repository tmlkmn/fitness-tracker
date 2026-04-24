"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriendStreaks } from "@/hooks/use-friend-stats";

function medalFor(rank: number) {
  if (rank === 0) return "text-amber-400";
  if (rank === 1) return "text-slate-300";
  if (rank === 2) return "text-orange-400";
  return "text-muted-foreground";
}

function flameColor(streak: number) {
  if (streak === 0) return "text-muted-foreground";
  if (streak < 7) return "text-orange-400";
  if (streak < 30) return "text-amber-400";
  return "text-red-500";
}

export function FriendStreakCard() {
  const { data, isLoading } = useFriendStreaks();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Arkadaş Serileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) return null;

  const topStreak = data[0]?.currentStreak ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Arkadaş Serileri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {data.map((row, i) => {
          const isLeader = i === 0 && row.currentStreak > 0;
          return (
            <div
              key={row.userId}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                row.isMe && "bg-primary/10 ring-1 ring-primary/30",
              )}
            >
              <span
                className={cn(
                  "shrink-0 w-5 text-center text-xs font-semibold tabular-nums",
                  medalFor(i),
                )}
              >
                {i < 3 ? <Trophy className="h-3.5 w-3.5 mx-auto" /> : i + 1}
              </span>
              <span
                className={cn(
                  "flex-1 text-sm truncate",
                  row.isMe && "font-semibold",
                )}
              >
                {row.isMe ? "Sen" : row.name}
              </span>
              {row.currentStreak > 0 && (
                <div className="flex items-center gap-1">
                  <Flame
                    className={cn("h-3.5 w-3.5", flameColor(row.currentStreak))}
                  />
                  <span className="text-xs font-medium tabular-nums">
                    {row.currentStreak}
                  </span>
                </div>
              )}
              {row.currentStreak === 0 && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              {isLeader && row.isMe && (
                <span className="text-[10px] text-amber-400 font-semibold">
                  LİDER
                </span>
              )}
            </div>
          );
        })}
        {topStreak > 0 && data.find((r) => r.isMe)?.currentStreak === 0 && (
          <p className="pt-2 text-[11px] text-muted-foreground text-center">
            Arkadaşlarına yetişmek için bugün başla!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
