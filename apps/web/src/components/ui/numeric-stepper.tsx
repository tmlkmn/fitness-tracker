"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface NumericStepperProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  id?: string;
}

export function NumericStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  placeholder,
  suffix,
  id,
}: NumericStepperProps) {
  const numValue = value ? parseFloat(value) : 0;

  const handleDecrement = () => {
    const next = Math.max(min, numValue - step);
    const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
    onChange(next.toFixed(decimals));
  };

  const handleIncrement = () => {
    const next = Math.min(max, numValue + step);
    const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
    onChange(next.toFixed(decimals));
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleDecrement}
        disabled={value !== "" && numValue <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <div className="relative flex-1">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && value && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleIncrement}
        disabled={value !== "" && numValue >= max}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
