"use client";

interface WeightEntry {
  logDate: string;
  weight: string | null;
}

interface WeightChartProps {
  data: WeightEntry[];
}

export function WeightChart({ data }: WeightChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Henüz veri yok. İlk ölçümünüzü ekleyin!
      </div>
    );
  }

  const weightData = data
    .filter((d) => d.weight)
    .map((d) => ({
      date: d.logDate,
      weight: parseFloat(d.weight!),
    }))
    .reverse();

  if (weightData.length < 2) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {weightData.length === 1 &&
          `Son ölçüm: ${weightData[0].weight} kg — Grafik için en az 2 kayıt gerekli`}
        {weightData.length === 0 && "Henüz kilo verisi yok."}
      </div>
    );
  }

  const minWeight = Math.min(...weightData.map((d) => d.weight)) - 1;
  const maxWeight = Math.max(...weightData.map((d) => d.weight)) + 1;
  const range = maxWeight - minWeight || 1;
  const width = 300;
  const height = 120;

  const points = weightData
    .map((d, i) => {
      const x = (i / (weightData.length - 1)) * width;
      const y = height - ((d.weight - minWeight) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          points={points}
        />
        {weightData.map((d, i) => {
          const x = (i / (weightData.length - 1)) * width;
          const y = height - ((d.weight - minWeight) / range) * height;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill="hsl(var(--primary))" />
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="8"
              >
                {d.weight}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{weightData[0]?.date}</span>
        <span>{weightData[weightData.length - 1]?.date}</span>
      </div>
    </div>
  );
}
