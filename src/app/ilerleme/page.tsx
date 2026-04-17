"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { ProgressForm } from "@/components/progress/progress-form";
import { ProgressAiAnalysis } from "@/components/progress/progress-ai-analysis";
import { ChartSelector } from "@/components/progress/chart-selector";
import { WeightTargetEditor } from "@/components/progress/weight-target-editor";
import { useProgressLogs } from "@/hooks/use-progress";
import { useUserProfile } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

export default function IlerlemePage() {
  const { data: logs } = useProgressLogs();
  const { data: profile } = useUserProfile();

  const latestLog = logs?.find((l) => l.weight);
  const latestWeight = latestLog?.weight;
  const startingWeight = profile?.weight;
  const targetWeight = profile?.targetWeight;

  const diff =
    latestWeight && startingWeight
      ? (parseFloat(latestWeight) - parseFloat(startingWeight)).toFixed(1)
      : null;

  return (
    <div className="animate-fade-in">
      <Header
        title="İlerleme"
        subtitle="Kilo ve ölçüm takibi"
        icon={TrendingUp}
        rightSlot={
          <div className="flex items-center gap-1">
            <FeedbackButton />
            <NotificationBell />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">
                {latestWeight ?? startingWeight ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg (şimdi)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p
                className={`text-lg font-bold ${
                  diff && parseFloat(diff) < 0
                    ? "text-green-500"
                    : diff && parseFloat(diff) > 0
                      ? "text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                {diff ? (parseFloat(diff) > 0 ? `+${diff}` : diff) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg fark</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center relative">
              <div className="absolute top-1 right-1">
                <WeightTargetEditor
                  currentWeight={startingWeight}
                  currentTarget={targetWeight}
                />
              </div>
              <p className="text-lg font-bold text-primary">
                {targetWeight ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg hedef</p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic chart */}
        <ChartSelector data={logs ?? []} />

        {/* AI Analysis — only show with 2+ measurements */}
        {logs && logs.length >= 2 && <ProgressAiAnalysis />}

        {/* Expanded form */}
        <ProgressForm />

        {/* History */}
        {logs && logs.length > 0 && (
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Geçmiş Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex justify-between items-center py-1.5 border-b border-border last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">
                      {log.logDate}
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {log.weight && (
                        <Badge variant="secondary" className="text-[10px]">
                          {log.weight} kg
                        </Badge>
                      )}
                      {log.fatPercent && (
                        <Badge variant="secondary" className="text-[10px]">
                          %{log.fatPercent} yağ
                        </Badge>
                      )}
                      {log.bmi && (
                        <Badge variant="secondary" className="text-[10px]">
                          BMI {log.bmi}
                        </Badge>
                      )}
                      {log.waistCm && (
                        <Badge variant="outline" className="text-[10px]">
                          bel: {log.waistCm} cm
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
