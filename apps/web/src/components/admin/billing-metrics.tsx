"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CURSOR_BAR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-theme";
import type { BillingMetricsData } from "@/actions/admin";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export function BillingMetrics({ data }: { data: BillingMetricsData }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Abonelik Analitiği</h2>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="MRR (tahmini)" value={`$${data.mrrUsd.toFixed(2)}`} />
        <Metric label="ARPU" value={`$${data.arpuUsd.toFixed(2)}`} />
        <Metric label="Churn oranı" value={`%${data.churnRatePct}`} />
        <Metric
          label="Deneme dönüşümü"
          value={`%${data.trialConversionPct}`}
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Son 6 Ay</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={data.monthly}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke={CHART_GRID_STROKE}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                cursor={CHART_TOOLTIP_CURSOR_BAR}
              />
              <Bar
                yAxisId="left"
                dataKey="revenueUsd"
                name="Gelir ($)"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="newCustomers"
                name="Yeni müşteri"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cancellations"
                name="İptal"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground">
            Gelir, tahsil edilen faturalardan (USD&apos;ye normalize edilmiş)
            türetilmiştir; gerçek tarihsel MRR değildir.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
