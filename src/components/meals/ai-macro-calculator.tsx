"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { generateAIMacroTargets, type AIMacroResult } from "@/actions/ai-macro";
import { updateMacroTargets } from "@/actions/user";
import { AiQuotaBadge } from "@/components/ai/ai-quota-badge";

export function AIMacroCalculator() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AIMacroResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const canCalculate = description.trim().length >= 20 && !isPending;

  const handleCalculate = () => {
    startTransition(async () => {
      try {
        const res = await generateAIMacroTargets(description);
        setResult(res);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Hesaplanamadı";
        if (msg.startsWith("COOLDOWN:")) {
          const secs = parseInt(msg.split(":")[1] ?? "60");
          toast.error(`Lütfen ${secs} saniye bekle.`);
        } else if (msg === "RATE_LIMITED") {
          toast.error("Günlük AI limitine ulaştın. Yarın tekrar dene.");
        } else if (msg === "AI_UNAVAILABLE") {
          toast.error("AI şu an kullanılamıyor. Daha sonra tekrar dene.");
        } else {
          toast.error(msg);
        }
      }
    });
  };

  const handleApprove = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await updateMacroTargets({
        targetCalories: result.macros.calories,
        targetProteinG: String(result.macros.protein),
        targetCarbsG: String(result.macros.carbs),
        targetFatG: String(result.macros.fat),
      });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["macro.resolved"] });
      qc.invalidateQueries({ queryKey: ["ai.quota"] });
      toast.success("Makro hedefleri kaydedildi");
      setResult(null);
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI ile Makro Hesapla
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-xs text-muted-foreground">
          Vücudun hakkında bölge bölge bilgi ver — karın, kol, bacak nasıl? AI
          profilini ve son ölçümünü de baz alarak makrolarını hesaplar.
        </p>

        <textarea
          placeholder="Örn: Karın bölgem dolgun ve sarkık, bacaklarım ince, kollarım da zayıf. Özellikle bel çevresini inceltmek istiyorum."
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setDescription(e.target.value);
            if (result) setResult(null);
          }}
          rows={4}
          maxLength={600}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {description.trim().length}/600
          </span>
          {description.trim().length > 0 && description.trim().length < 20 && (
            <span className="text-[10px] text-amber-500">
              En az 20 karakter gerekli
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleCalculate}
            disabled={!canCalculate}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isPending ? "Hesaplanıyor..." : "AI ile Hesapla"}
          </Button>
          <AiQuotaBadge feature="macro-ai" />
        </div>

        {result && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  { label: "Kalori", value: result.macros.calories, unit: "kcal" },
                  { label: "Protein", value: result.macros.protein, unit: "g" },
                  { label: "Karb", value: result.macros.carbs, unit: "g" },
                  { label: "Yağ", value: result.macros.fat, unit: "g" },
                ] as const
              ).map(({ label, value, unit }) => (
                <div key={label} className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-semibold tabular-nums">
                    {value}
                    <span className="text-[10px] font-normal ml-0.5">{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {result.explanation && (
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                &ldquo;{result.explanation}&rdquo;
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleApprove}
                disabled={isSaving}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isSaving ? "Kaydediliyor..." : "Onayla ve Kaydet"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setResult(null)}
                disabled={isSaving}
              >
                <X className="h-3.5 w-3.5" />
                İptal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
