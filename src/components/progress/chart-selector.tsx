"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricChart } from "@/components/progress/metric-chart";

const METRIC_KEYS = [
  { value: "weight", unit: "kg" },
  { value: "fatPercent", unit: "%" },
  { value: "fatKg", unit: "kg" },
  { value: "fluidPercent", unit: "%" },
  { value: "fluidKg", unit: "kg" },
  { value: "bmi", unit: "" },
  { value: "waistCm", unit: "cm" },
  { value: "rightArmCm", unit: "cm" },
  { value: "leftArmCm", unit: "cm" },
  { value: "rightLegCm", unit: "cm" },
  { value: "leftLegCm", unit: "cm" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogEntry = Record<string, any>;

interface ChartSelectorProps {
  data: LogEntry[];
}

export function ChartSelector({ data }: ChartSelectorProps) {
  const t = useTranslations("progress.chart");
  const [selected, setSelected] = useState<(typeof METRIC_KEYS)[number]["value"]>("weight");
  const option = METRIC_KEYS.find((o) => o.value === selected)!;
  const label = t(`metrics.${option.value}`);

  return (
    <Card>
      <CardHeader className="p-3 pb-0 flex-row items-center justify-between">
        <CardTitle className="text-sm">{t("title")}</CardTitle>
        <Select value={selected} onValueChange={(v) => setSelected(v as typeof selected)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_KEYS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(`metrics.${opt.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <MetricChart
          data={data}
          metric={option.value}
          label={label}
          unit={option.unit}
        />
      </CardContent>
    </Card>
  );
}
