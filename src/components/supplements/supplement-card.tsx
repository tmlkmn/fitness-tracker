import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill } from "lucide-react";

interface SupplementCardProps {
  name: string;
  dosage: string;
  timing: string;
  notes?: string | null;
}

export function SupplementCard({
  name,
  dosage,
  timing,
  notes,
}: SupplementCardProps) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Pill className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{name}</p>
              <Badge variant="outline" className="text-xs">
                {dosage}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{timing}</p>
            {notes ? (
              <p className="text-xs text-yellow-500 mt-1">{notes}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
