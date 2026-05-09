"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { MacroTargetsCard } from "@/components/meals/macro-targets-card";
import { AIMacroCalculator } from "@/components/meals/ai-macro-calculator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Flame, Beef, Wheat, Droplets, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MACROS = [
  {
    icon: Flame,
    label: "Kalori",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    desc: "Vücudun enerji birimidir. Harcadığından fazla alırsan yağ depolar; eksik alırsan yağ yakar.",
  },
  {
    icon: Beef,
    label: "Protein",
    color: "text-red-400",
    bg: "bg-red-400/10",
    desc: "Kas dokusu başta olmak üzere her hücrenin yapı taşıdır. Toparlanma, doygunluk ve yağsız kütle için kritik.",
  },
  {
    icon: Wheat,
    label: "Karbonhidrat",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    desc: "Beyin ve kasların birincil yakıtıdır. Antrenman performansı ve glikojen depoları için gereklidir.",
  },
  {
    icon: Droplets,
    label: "Yağ",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    desc: "Hormon üretimi, yağda çözünen vitaminler (A, D, E, K) ve uzun süreli enerji için vazgeçilmezdir.",
  },
] as const;

function MacroInfoCard() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Makro Besinler Nedir?</p>
                <p className="text-xs text-muted-foreground">Kalori, protein, karb ve yağın rolü</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Makro besinler (makrolar), vücudun enerji ve yapı taşı olarak kullandığı üç temel
              besin grubudur. Doğru makro dengesini bulmak; hedefine ulaşmanın, enerjini korumanın
              ve kas–yağ oranını optimize etmenin temelidir.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MACROS.map(({ icon: Icon, label, color, bg, desc }) => (
                <div key={label} className={cn("rounded-lg p-3 space-y-2", bg)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", color)} />
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Kalori başına gram:</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><span className="text-red-400 font-medium">Protein</span> → 4 kcal/g</span>
                <span><span className="text-amber-400 font-medium">Karb</span> → 4 kcal/g</span>
                <span><span className="text-blue-400 font-medium">Yağ</span> → 9 kcal/g</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">İpucu:</span> Makro hedefleri belirlerken
              hedefinle (yağ kaybı, kas kazanımı, idame) tutarlı olduğuna emin ol. Aşağıdaki AI
              hesaplayıcısı profil ve ölçüm verilerini baz alarak senin için optimize eder.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function MakroPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Makro Hedefleri"
        subtitle="Kalori ve makro dağılımı"
        icon={Target}
        showBack
        backHref="/ayarlar"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        <MacroInfoCard />
        <AIMacroCalculator />
        <MacroTargetsCard />
      </div>
    </div>
  );
}
