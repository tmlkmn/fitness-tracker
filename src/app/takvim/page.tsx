"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  useAllWeeks,
  useDailyPlansByWeek,
  useWeeklyPlan,
} from "@/hooks/use-plans";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Waves, Moon } from "lucide-react";
import Link from "next/link";

const planTypeConfig = {
  workout: { icon: Dumbbell, label: "Antrenman", badge: "default" as const },
  swimming: { icon: Waves, label: "Yüzme", badge: "secondary" as const },
  rest: { icon: Moon, label: "Dinlenme", badge: "outline" as const },
};

export default function TakvimPage() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const { data: weeklyPlan } = useWeeklyPlan(selectedWeek);
  const { data: dailyPlans, isLoading: daysLoading } = useDailyPlansByWeek(
    weeklyPlan?.id ?? 0
  );
  const { data: weeks, isLoading: weeksLoading } = useAllWeeks();

  return (
    <div>
      <Header
        title="Haftalık Program"
        subtitle="Antrenman & Beslenme Takvimi"
      />
      <div className="p-4 space-y-4">
        <Tabs
          value={String(selectedWeek)}
          onValueChange={(v) => setSelectedWeek(Number(v))}
        >
          <TabsList className="grid grid-cols-4 w-full">
            {[1, 2, 3, 4].map((week) => (
              <TabsTrigger key={week} value={String(week)}>
                Hf {week}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {weeklyPlan && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <p className="font-semibold text-sm">{weeklyPlan.title}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {weeklyPlan.phase === "adaptation" ? "Adaptasyon" : "Split"}
              </Badge>
              {weeklyPlan.notes && (
                <p className="text-xs text-muted-foreground mt-2">
                  {weeklyPlan.notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {daysLoading ? (
          <div className="space-y-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {dailyPlans?.map((day) => {
              const config =
                planTypeConfig[day.planType as keyof typeof planTypeConfig] ??
                planTypeConfig.workout;
              const Icon = config.icon;
              return (
                <Link key={day.id} href={`/gun/${day.id}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer active:opacity-80">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {day.dayName}
                          </span>
                          <Badge
                            variant={config.badge}
                            className="text-xs"
                          >
                            {config.label}
                          </Badge>
                        </div>
                        {day.workoutTitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {day.workoutTitle}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {!weeksLoading && !weeks?.length && (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Henüz program yüklenmemiş.</p>
            <p className="text-xs mt-1 font-mono">
              npm run db:seed çalıştırın
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
