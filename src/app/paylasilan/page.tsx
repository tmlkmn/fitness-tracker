"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { usePlansSharedWithMe } from "@/hooks/use-sharing";
import { formatWeekRange } from "@/lib/utils";
import Link from "next/link";

export default function PaylasilanPage() {
  const { data: plans, isLoading } = usePlansSharedWithMe();

  return (
    <div className="animate-fade-in">
      <Header
        title="Paylaşılan Planlar"
        subtitle="Sizinle paylaşılan programlar"
        icon={Users}
        showBack
        backHref="/"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !plans?.length ? (
          <p className="text-center text-muted-foreground py-12">
            Henüz sizinle paylaşılan plan yok
          </p>
        ) : (
          plans.map((plan) => (
            <Link
              key={plan.shareId}
              href={`/paylasilan/hafta/${plan.weeklyPlanId}`}
            >
              <Card className="hover:bg-accent hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Hafta {plan.weekNumber} — {plan.phase}
                      </p>
                      {plan.startDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatWeekRange(plan.startDate)}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {plan.ownerName}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
