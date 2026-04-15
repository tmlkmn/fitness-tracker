"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import {
  useSharedWeeklyPlan,
  useSharedDailyPlansByWeek,
} from "@/hooks/use-shared-plans";
import Link from "next/link";

const planTypeLabel: Record<string, string> = {
  workout: "Antrenman",
  swimming: "Yüzme",
  rest: "Dinlenme",
};

interface PageProps {
  params: Promise<{ weeklyPlanId: string }>;
}

export default function PaylasilanHaftaPage({ params }: PageProps) {
  const { weeklyPlanId } = use(params);
  const id = parseInt(weeklyPlanId);
  const { data: weeklyPlan, isLoading: loadingPlan } = useSharedWeeklyPlan(id);
  const { data: days, isLoading: loadingDays } =
    useSharedDailyPlansByWeek(id);

  const isLoading = loadingPlan || loadingDays;

  return (
    <div className="animate-fade-in">
      <Header
        title={weeklyPlan?.title ?? "Paylaşılan Plan"}
        subtitle={
          weeklyPlan
            ? `${weeklyPlan.ownerName} tarafından paylaşıldı`
            : undefined
        }
        showBack
        backHref="/paylasilan"
        rightSlot={<NotificationBell />}
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-primary/10 border border-primary/20">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-primary">Salt okunur görünüm</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !days?.length ? (
          <p className="text-center text-muted-foreground py-12">
            Günlük plan bulunamadı
          </p>
        ) : (
          <div className="space-y-2">
            {days.map((day) => {
              const dateLabel = day.date
                ? new Date(day.date + "T00:00:00").toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    weekday: "short",
                  })
                : null;

              return (
                <Link
                  key={day.id}
                  href={`/paylasilan/gun/${day.id}`}
                >
                  <Card className="hover:bg-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{day.dayName}</p>
                        {dateLabel && (
                          <p className="text-xs text-muted-foreground">
                            {dateLabel}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {day.workoutTitle ??
                          planTypeLabel[day.planType] ??
                          day.planType}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
