"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { ProgressAiAnalysis } from "@/components/progress/progress-ai-analysis";
import { ChartSelector } from "@/components/progress/chart-selector";
import { WeightTargetEditor } from "@/components/progress/weight-target-editor";
import { ProgressModal } from "@/components/progress/progress-modal";
import { useProgressLogs, useDeleteProgress } from "@/hooks/use-progress";
import { useUserProfile } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Scale,
  Droplets,
  Activity,
  Ruler,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { ActivityHeatmap } from "@/components/gamification/activity-heatmap";
import { WaterChart } from "@/components/water/water-chart";
import { SleepChart } from "@/components/sleep/sleep-chart";

function formatTurkishDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogDetailSection({ title, icon: Icon, items }: { title: string; icon: any; items: { label: string; value: string; unit: string }[] }) {
  const filled = items.filter((i) => i.value);
  if (filled.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {filled.map((item) => (
          <div key={`${item.label}-${item.unit}`} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value} {item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IlerlemePage() {
  const { data: logs } = useProgressLogs();
  const { data: profile } = useUserProfile();
  const deleteProgress = useDeleteProgress();
  const { data: activityStats } = useActivityStats();

  const [modalOpen, setModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const latestLog = logs?.find((l) => l.weight);
  const latestWeight = latestLog?.weight;
  const startingWeight = profile?.weight;
  const targetWeight = profile?.targetWeight;

  const diff =
    latestWeight && startingWeight
      ? (parseFloat(latestWeight) - parseFloat(startingWeight)).toFixed(1)
      : null;

  const handleEdit = (log: NonNullable<typeof logs>[number]) => {
    setEditData(log);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId == null) return;
    await deleteProgress.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
    toast.success("Ölçüm silindi");
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="İlerleme"
        subtitle="Kilo ve ölçüm takibi"
        icon={TrendingUp}
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold tabular-nums">
                {latestWeight ?? startingWeight ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg (şimdi)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p
                className={`text-lg font-bold tabular-nums ${
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
              <p className="text-lg font-bold text-primary tabular-nums">
                {targetWeight ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg hedef</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Heatmap */}
        {activityStats && (
          <ActivityHeatmap completionMap={activityStats.completionMap} />
        )}

        {/* Dynamic chart */}
        <ChartSelector data={logs ?? []} />

        {/* AI Analysis — only show with 2+ measurements */}
        {logs && logs.length >= 2 && <ProgressAiAnalysis />}

        {/* Su & Uyku Charts */}
        <WaterChart />
        <SleepChart />

        {/* Add measurement button */}
        <Button onClick={handleAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Yeni Ölçüm Ekle
        </Button>

        {/* History */}
        {logs && logs.length > 0 && (
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Geçmiş Kayıtlar</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="space-y-1">
                {logs.map((log) => (
                  <Collapsible key={log.id}>
                    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                      <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left group">
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        <span className="text-xs font-medium min-w-[80px]">
                          {formatTurkishDate(log.logDate)}
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
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
                              bel {log.waistCm}cm
                            </Badge>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(log)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteConfirmId(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent className="pb-3 pt-2 pl-6 space-y-3">
                      <LogDetailSection
                        title="Ana Bilgiler"
                        icon={Scale}
                        items={[
                          { label: "Kilo", value: log.weight ?? "", unit: "kg" },
                          { label: "Sıvı", value: log.fluidPercent ?? "", unit: "%" },
                          { label: "Sıvı", value: log.fluidKg ?? "", unit: "kg" },
                          { label: "Yağ", value: log.fatPercent ?? "", unit: "%" },
                          { label: "Yağ", value: log.fatKg ?? "", unit: "kg" },
                          { label: "BMI", value: log.bmi ?? "", unit: "" },
                        ]}
                      />
                      <LogDetailSection
                        title="Vücut Yağ & Kas"
                        icon={Dumbbell}
                        items={[
                          { label: "Sol Kol Yağ", value: log.leftArmFatPercent ?? "", unit: "%" },
                          { label: "Sol Kol Yağ", value: log.leftArmFatKg ?? "", unit: "kg" },
                          { label: "Sol Kol Kas", value: log.leftArmMusclePercent ?? "", unit: "%" },
                          { label: "Sol Kol Kas", value: log.leftArmMuscleKg ?? "", unit: "kg" },
                          { label: "Sağ Kol Yağ", value: log.rightArmFatPercent ?? "", unit: "%" },
                          { label: "Sağ Kol Yağ", value: log.rightArmFatKg ?? "", unit: "kg" },
                          { label: "Sağ Kol Kas", value: log.rightArmMusclePercent ?? "", unit: "%" },
                          { label: "Sağ Kol Kas", value: log.rightArmMuscleKg ?? "", unit: "kg" },
                          { label: "Gövde Yağ", value: log.torsoFatPercent ?? "", unit: "%" },
                          { label: "Gövde Yağ", value: log.torsoFatKg ?? "", unit: "kg" },
                          { label: "Gövde Kas", value: log.torsoMusclePercent ?? "", unit: "%" },
                          { label: "Gövde Kas", value: log.torsoMuscleKg ?? "", unit: "kg" },
                          { label: "Sol Bacak Yağ", value: log.leftLegFatPercent ?? "", unit: "%" },
                          { label: "Sol Bacak Yağ", value: log.leftLegFatKg ?? "", unit: "kg" },
                          { label: "Sol Bacak Kas", value: log.leftLegMusclePercent ?? "", unit: "%" },
                          { label: "Sol Bacak Kas", value: log.leftLegMuscleKg ?? "", unit: "kg" },
                          { label: "Sağ Bacak Yağ", value: log.rightLegFatPercent ?? "", unit: "%" },
                          { label: "Sağ Bacak Yağ", value: log.rightLegFatKg ?? "", unit: "kg" },
                          { label: "Sağ Bacak Kas", value: log.rightLegMusclePercent ?? "", unit: "%" },
                          { label: "Sağ Bacak Kas", value: log.rightLegMuscleKg ?? "", unit: "kg" },
                        ]}
                      />
                      <LogDetailSection
                        title="Ölçüler"
                        icon={Ruler}
                        items={[
                          { label: "Bel", value: log.waistCm ?? "", unit: "cm" },
                          { label: "Sağ Kol", value: log.rightArmCm ?? "", unit: "cm" },
                          { label: "Sol Kol", value: log.leftArmCm ?? "", unit: "cm" },
                          { label: "Sağ Bacak", value: log.rightLegCm ?? "", unit: "cm" },
                          { label: "Sol Bacak", value: log.leftLegCm ?? "", unit: "cm" },
                        ]}
                      />
                      {log.notes && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold">Not</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{log.notes}</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Progress Modal */}
      <ProgressModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditData(null);
        }}
        initialData={editData}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ölçümü Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu ölçüm kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProgress.isPending}
            >
              {deleteProgress.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
