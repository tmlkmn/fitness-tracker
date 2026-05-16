"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { ProgressAiAnalysis } from "@/components/progress/progress-ai-analysis";
import { ChartSelector } from "@/components/progress/chart-selector";
import { WeightTargetEditor } from "@/components/progress/weight-target-editor";
import { ProgressModal } from "@/components/progress/progress-modal";
import { PageTour } from "@/components/onboarding/page-tour";
import { useProgressLogs, useDeleteProgress } from "@/hooks/use-progress";
import { useUserProfile } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Activity,
  Ruler,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { ActivityHeatmap } from "@/components/gamification/activity-heatmap";
import { WaterChart } from "@/components/water/water-chart";
import { SleepChart } from "@/components/sleep/sleep-chart";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";

function formatLocaleDate(dateStr: string, locale: Locale): string {
  return formatDate(parseDateOnly(dateStr), locale, {
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
  const { data: logs, isLoading: logsLoading } = useProgressLogs();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const deleteProgress = useDeleteProgress();
  const { data: activityStats } = useActivityStats();
  const t = useTranslations("progress");
  const locale = useLocale() as Locale;

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
    toast.success(t("logDeleted"));
  };

  return (
    <div className="animate-fade-in">
      <Header
        title={t("title")}
        subtitle={t("subtitle")}
        icon={TrendingUp}
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <PageTour surface="progress" ready={!logsLoading} />
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        {logsLoading || profileLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3 text-center space-y-1">
                  <Skeleton className="h-6 w-12 mx-auto" />
                  <Skeleton className="h-3 w-14 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold tabular-nums">
                {latestWeight ?? startingWeight ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{t("summary.now")}</p>
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
              <p className="text-xs text-muted-foreground">{t("summary.diff")}</p>
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
              <p className="text-xs text-muted-foreground">{t("summary.target")}</p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Activity Heatmap */}
        {false && activityStats && (
          <ActivityHeatmap completionMap={activityStats!.completionMap} />
        )}

        {/* Dynamic chart */}
        <div data-tour="progress-chart">
          {logsLoading ? (
            <Card>
              <CardHeader className="p-3 pb-0 flex-row items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-35 rounded-md" />
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ChartSelector data={logs ?? []} />
          )}
        </div>

        {/* AI Analysis — only show with 2+ measurements */}
        {logs && logs.length >= 2 && <ProgressAiAnalysis />}

        {/* AI Analysis empty hint — exactly 1 measurement */}
        {logs && logs.length === 1 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{t("aiHint.title")}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("aiHint.body")}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleAdd}>
                  <Plus className="h-3 w-3" />
                  {t("addMeasurement")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Su & Uyku Charts */}
        <WaterChart />
        <SleepChart />

        {/* Add measurement button */}
        <Button onClick={handleAdd} className="w-full gap-2" data-tour="add-measurement">
          <Plus className="h-4 w-4" />
          {t("addMeasurement")}
        </Button>

        {/* History */}
        {logsLoading ? (
          <Card>
            <CardHeader className="p-3 pb-0">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="p-3 pt-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : logs && logs.length > 0 && (
          <Card>
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">{t("pastRecords")}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="space-y-1">
                {logs.map((log) => (
                  <Collapsible key={log.id}>
                    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                      <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left group">
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        <span className="text-xs font-medium min-w-[80px]">
                          {formatLocaleDate(log.logDate, locale)}
                        </span>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {log.weight && (
                            <Badge variant="secondary" className="text-[10px]">
                              {log.weight} kg
                            </Badge>
                          )}
                          {log.fatPercent && (
                            <Badge variant="secondary" className="text-[10px]">
                              %{log.fatPercent} {t("badges.fat")}
                            </Badge>
                          )}
                          {log.bmi && (
                            <Badge variant="secondary" className="text-[10px]">
                              BMI {log.bmi}
                            </Badge>
                          )}
                          {log.waistCm && (
                            <Badge variant="outline" className="text-[10px]">
                              {t("badges.waist")} {log.waistCm}cm
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
                        title={t("sections.main")}
                        icon={Scale}
                        items={[
                          { label: t("labels.weight"), value: log.weight ?? "", unit: "kg" },
                          { label: t("labels.fluid"), value: log.fluidPercent ?? "", unit: "%" },
                          { label: t("labels.fluid"), value: log.fluidKg ?? "", unit: "kg" },
                          { label: t("labels.fat"), value: log.fatPercent ?? "", unit: "%" },
                          { label: t("labels.fat"), value: log.fatKg ?? "", unit: "kg" },
                          { label: t("labels.bmi"), value: log.bmi ?? "", unit: "" },
                        ]}
                      />
                      <LogDetailSection
                        title={t("sections.bodyFatMuscle")}
                        icon={Dumbbell}
                        items={[
                          { label: t("labels.leftArmFat"), value: log.leftArmFatPercent ?? "", unit: "%" },
                          { label: t("labels.leftArmFat"), value: log.leftArmFatKg ?? "", unit: "kg" },
                          { label: t("labels.leftArmMuscle"), value: log.leftArmMusclePercent ?? "", unit: "%" },
                          { label: t("labels.leftArmMuscle"), value: log.leftArmMuscleKg ?? "", unit: "kg" },
                          { label: t("labels.rightArmFat"), value: log.rightArmFatPercent ?? "", unit: "%" },
                          { label: t("labels.rightArmFat"), value: log.rightArmFatKg ?? "", unit: "kg" },
                          { label: t("labels.rightArmMuscle"), value: log.rightArmMusclePercent ?? "", unit: "%" },
                          { label: t("labels.rightArmMuscle"), value: log.rightArmMuscleKg ?? "", unit: "kg" },
                          { label: t("labels.torsoFat"), value: log.torsoFatPercent ?? "", unit: "%" },
                          { label: t("labels.torsoFat"), value: log.torsoFatKg ?? "", unit: "kg" },
                          { label: t("labels.torsoMuscle"), value: log.torsoMusclePercent ?? "", unit: "%" },
                          { label: t("labels.torsoMuscle"), value: log.torsoMuscleKg ?? "", unit: "kg" },
                          { label: t("labels.leftLegFat"), value: log.leftLegFatPercent ?? "", unit: "%" },
                          { label: t("labels.leftLegFat"), value: log.leftLegFatKg ?? "", unit: "kg" },
                          { label: t("labels.leftLegMuscle"), value: log.leftLegMusclePercent ?? "", unit: "%" },
                          { label: t("labels.leftLegMuscle"), value: log.leftLegMuscleKg ?? "", unit: "kg" },
                          { label: t("labels.rightLegFat"), value: log.rightLegFatPercent ?? "", unit: "%" },
                          { label: t("labels.rightLegFat"), value: log.rightLegFatKg ?? "", unit: "kg" },
                          { label: t("labels.rightLegMuscle"), value: log.rightLegMusclePercent ?? "", unit: "%" },
                          { label: t("labels.rightLegMuscle"), value: log.rightLegMuscleKg ?? "", unit: "kg" },
                        ]}
                      />
                      <LogDetailSection
                        title={t("sections.measurements")}
                        icon={Ruler}
                        items={[
                          { label: t("labels.waist"), value: log.waistCm ?? "", unit: "cm" },
                          { label: t("labels.rightArm"), value: log.rightArmCm ?? "", unit: "cm" },
                          { label: t("labels.leftArm"), value: log.leftArmCm ?? "", unit: "cm" },
                          { label: t("labels.rightLeg"), value: log.rightLegCm ?? "", unit: "cm" },
                          { label: t("labels.leftLeg"), value: log.leftLegCm ?? "", unit: "cm" },
                        ]}
                      />
                      {log.notes && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold">{t("sections.note")}</span>
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
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirm")}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProgress.isPending}
            >
              {deleteProgress.isPending ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
