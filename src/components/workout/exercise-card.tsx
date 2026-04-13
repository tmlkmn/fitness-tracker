"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

interface ExerciseCardProps {
  id: number;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  isCompleted: boolean;
  onToggle: (id: number, isCompleted: boolean) => void;
}

export function ExerciseCard({
  id,
  name,
  sets,
  reps,
  restSeconds,
  durationMinutes,
  notes,
  isCompleted,
  onToggle,
}: ExerciseCardProps) {
  return (
    <Card className={cn("transition-opacity", isCompleted && "opacity-60")}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => onToggle(id, !!checked)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm", isCompleted && "line-through")}>
              {name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sets && reps ? (
                <Badge variant="secondary" className="text-xs">
                  {sets}x{reps}
                </Badge>
              ) : null}
              {durationMinutes ? (
                <Badge variant="secondary" className="text-xs">
                  {durationMinutes} dk
                </Badge>
              ) : null}
              {restSeconds ? (
                <Badge variant="outline" className="text-xs">
                  <Timer className="h-3 w-3 mr-1" />
                  {restSeconds}sn
                </Badge>
              ) : null}
            </div>
            {notes ? (
              <p className="text-xs text-yellow-500 mt-1">{notes}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
