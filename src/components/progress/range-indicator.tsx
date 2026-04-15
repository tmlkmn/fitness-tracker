"use client";

interface RangeIndicatorProps {
  value: string;
  type: "fluid" | "fat" | "bmi";
}

const RANGES = {
  fluid: { green: [55, 66], yellow: [50, 70], label: "Sıvı Oranı" },
  fat: { green: [14, 23], yellow: [10, 28], label: "Yağ Oranı" },
  bmi: { green: [20, 25], yellow: [18.5, 30], label: "BMI" },
} as const;

export function RangeIndicator({ value, type }: RangeIndicatorProps) {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;

  const range = RANGES[type];
  const [greenMin, greenMax] = range.green;
  const [yellowMin, yellowMax] = range.yellow;

  let color: string;
  let label: string;

  if (num >= greenMin && num <= greenMax) {
    color = "bg-green-500";
    label = "Normal";
  } else if (num >= yellowMin && num <= yellowMax) {
    color = "bg-yellow-500";
    label = "Sınırda";
  } else {
    color = "bg-red-500";
    label = "Dikkat";
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">
        {label} ({greenMin}-{greenMax})
      </span>
    </div>
  );
}
