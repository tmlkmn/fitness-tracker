interface MacroSummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function DailyMacroSummary({
  calories,
  protein,
  carbs,
  fat,
}: MacroSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg">
      <div className="text-center">
        <p className="text-lg font-bold text-primary">{calories}</p>
        <p className="text-xs text-muted-foreground">kcal</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold">{protein}g</p>
        <p className="text-xs text-muted-foreground">Protein</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold">{carbs}g</p>
        <p className="text-xs text-muted-foreground">Karb</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold">{fat}g</p>
        <p className="text-xs text-muted-foreground">Yağ</p>
      </div>
    </div>
  );
}
