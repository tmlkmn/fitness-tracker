import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        <section className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-4 w-32 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="h-5 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
