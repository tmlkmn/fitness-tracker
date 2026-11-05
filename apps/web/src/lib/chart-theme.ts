import type { CSSProperties } from "react";

export const CHART_GRID_STROKE = "hsl(var(--border) / 0.5)";
export const CHART_AXIS_TICK = {
  fontSize: 10,
  fill: "hsl(var(--muted-foreground))",
} as const;

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "calc(var(--radius) - 2px)",
  boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)",
  fontSize: 12,
  padding: "6px 10px",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontWeight: 500,
  marginBottom: 2,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "hsl(var(--foreground))",
  padding: 0,
};

export const CHART_TOOLTIP_CURSOR = {
  stroke: "hsl(var(--border))",
  strokeWidth: 1,
  strokeDasharray: "4 4",
};

export const CHART_TOOLTIP_CURSOR_BAR = {
  fill: "hsl(var(--accent) / 0.4)",
  radius: 4,
};

export const chartGradientId = (key: string) => `chart-gradient-${key}`;
