import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UserDetailSkeleton() {
  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-48" />
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>

        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
