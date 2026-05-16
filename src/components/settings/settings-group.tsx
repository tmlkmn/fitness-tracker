import { Card } from "@/components/ui/card";
import React from "react";

interface Props {
  label: string;
  children: React.ReactNode;
  /** Optional `data-tour` anchor for the guided tour. */
  dataTour?: string;
}

export function SettingsGroup({ label, children, dataTour }: Props) {
  const items = React.Children.toArray(children);
  return (
    <div className="space-y-1.5" data-tour={dataTour}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3">
        {label}
      </p>
      <Card className="overflow-hidden">
        {items.map((child, i) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-border/50 ml-16" />}
            {child}
          </div>
        ))}
      </Card>
    </div>
  );
}
