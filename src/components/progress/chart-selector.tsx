"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricChart } from "@/components/progress/metric-chart";

const METRIC_OPTIONS = [
  { value: "weight", label: "Kilo", unit: "kg" },
  { value: "fatPercent", label: "Yağ Oranı", unit: "%" },
  { value: "fatKg", label: "Yağ (kg)", unit: "kg" },
  { value: "fluidPercent", label: "Sıvı Oranı", unit: "%" },
  { value: "fluidKg", label: "Sıvı (kg)", unit: "kg" },
  { value: "bmi", label: "BMI", unit: "" },
  { value: "waistCm", label: "Bel", unit: "cm" },
  { value: "rightArmCm", label: "Sağ Kol", unit: "cm" },
  { value: "leftArmCm", label: "Sol Kol", unit: "cm" },
  { value: "rightLegCm", label: "Sağ Bacak", unit: "cm" },
  { value: "leftLegCm", label: "Sol Bacak", unit: "cm" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogEntry = Record<string, any>;

interface ChartSelectorProps {
  data: LogEntry[];
}

export function ChartSelector({ data }: ChartSelectorProps) {
  const [selected, setSelected] = useState("weight");
  const option = METRIC_OPTIONS.find((o) => o.value === selected)!;

  return (
    <Card>
      <CardHeader className="p-3 pb-0 flex-row items-center justify-between">
        <CardTitle className="text-sm">Grafik</CardTitle>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <MetricChart
          data={data}
          metric={option.value}
          label={option.label}
          unit={option.unit}
        />
      </CardContent>
    </Card>
  );
}
