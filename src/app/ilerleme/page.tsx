"use client";

import { Header } from "@/components/layout/header";
import { ProgressForm } from "@/components/progress/progress-form";
import { WeightChart } from "@/components/progress/weight-chart";
import { useProgressLogs } from "@/hooks/use-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function IlerlемePage() {
  const { data: logs } = useProgressLogs(1);

  const latestWeight = logs?.find((l) => l.weight)?.weight;
  const startingWeight = 96;
  const targetWeight = 85;
  const diff = latestWeight
    ? (parseFloat(latestWeight) - startingWeight).toFixed(1)
    : null;

  return (
    <div>
      <Header title="İlerleme" subtitle="Kilo ve ölçüm takibi" />
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{latestWeight ?? "96"}</p>
              <p className="text-xs text-muted-foreground">kg (şimdi)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p
                className={`text-lg font-bold ${
                  diff && parseFloat(diff) < 0
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                {diff ? diff : "0"}
              </p>
              <p className="text-xs text-muted-foreground">kg fark</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-primary">{targetWeight}</p>
              <p className="text-xs text-muted-foreground">kg hedef</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Kilo Grafiği</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2">
            <WeightChart data={logs ?? []} />
          </CardContent>
        </Card>

        <ProgressForm />

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
                    className="flex justify-between items-center py-1 border-b border-border last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">
                      {log.logDate}
                    </span>
                    <div className="flex gap-3 text-xs">
                      {log.weight && (
                        <span className="font-medium">{log.weight} kg</span>
                      )}
                      {log.waistCm && (
                        <span className="text-muted-foreground">
                          bel: {log.waistCm} cm
                        </span>
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
