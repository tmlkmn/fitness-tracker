"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill, Pencil, Trash2 } from "lucide-react";

interface SupplementCardProps {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  notes?: string | null;
  isCompleted?: boolean;
  onToggle?: (id: number, completed: boolean) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  readOnly?: boolean;
}

export function SupplementCard({
  id,
  name,
  dosage,
  timing,
  notes,
  isCompleted,
  onToggle,
  onEdit,
  onDelete,
  readOnly,
}: SupplementCardProps) {
  return (
    <Card className={cn("transition-opacity", isCompleted && "opacity-60")}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {!readOnly && onToggle && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => onToggle(id, !!checked)}
              className="mt-0.5"
            />
          )}
          {(readOnly || !onToggle) && (
            <Pill className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={cn("font-medium text-sm", isCompleted && "line-through")}>
                {name}
              </p>
              <Badge variant="outline" className="text-xs shrink-0">
                {dosage}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{timing}</p>
            {notes ? (
              <p className="text-xs text-yellow-500 mt-1">{notes}</p>
            ) : null}
          </div>
          {!readOnly && (onEdit || onDelete) && !isCompleted && (
            <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit(id)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
