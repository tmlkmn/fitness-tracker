"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Minus, Check, Trash2, X } from "lucide-react";
import { TURKISH_FOODS, CATEGORY_LABELS, type TurkishFood } from "@/data/turkish-foods";
import { useUserFoods, useCreateUserFood, useDeleteUserFood } from "@/hooks/use-user-foods";
import type { FoodLike } from "@/lib/food-math";
import { cn } from "@/lib/utils";

interface FoodReferencePopoverProps {
  onAdd: (food: FoodLike, multiplier: number) => void;
}

type Tab = "preset" | "user";

const PORTION_STEP = 0.25;
const PORTION_MIN = 0.25;
const PORTION_MAX = 10;

function PortionRow({
  food,
  onAdd,
  onDelete,
}: {
  food: FoodLike;
  onAdd: (multiplier: number) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{food.name}</p>
          <div className="flex gap-1.5 text-[10px] text-muted-foreground items-center">
            <span>{food.portion}</span>
            <span>{food.calories}kcal</span>
            <Badge variant="outline" className="h-3.5 px-1 text-[9px]">P:{food.protein}</Badge>
            <Badge variant="outline" className="h-3.5 px-1 text-[9px]">K:{food.carbs}</Badge>
            <Badge variant="outline" className="h-3.5 px-1 text-[9px]">Y:{food.fat}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              type="button"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            type="button"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const dec = () =>
    setMultiplier((m) => Math.max(PORTION_MIN, +(m - PORTION_STEP).toFixed(2)));
  const inc = () =>
    setMultiplier((m) => Math.min(PORTION_MAX, +(m + PORTION_STEP).toFixed(2)));

  const totalKcal = Math.round(food.calories * multiplier);
  const display = Number.isInteger(multiplier)
    ? `${multiplier}`
    : multiplier.toFixed(2).replace(/\.?0+$/, "");

  return (
    <div className="rounded border border-primary/30 bg-primary/5 px-2 py-1.5 space-y-1.5">
      <p className="text-xs font-medium truncate">{food.name}</p>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={dec}>
          <Minus className="h-3 w-3" />
        </Button>
        <div className="flex-1 text-center text-xs font-mono">
          {display}× {food.portion}
        </div>
        <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={inc}>
          <Plus className="h-3 w-3" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-12 text-right">{totalKcal}kcal</span>
        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            onAdd(multiplier);
            setEditing(false);
            setMultiplier(1);
          }}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setEditing(false);
            setMultiplier(1);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function NewUserFoodForm({ onCancel }: { onCancel: () => void }) {
  const create = useCreateUserFood();
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const handleSave = () => {
    if (!name.trim() || !portion.trim() || !calories) return;
    create.mutate(
      {
        name: name.trim(),
        portion: portion.trim(),
        calories: parseInt(calories) || 0,
        proteinG: protein || null,
        carbsG: carbs || null,
        fatG: fat || null,
      },
      {
        onSuccess: () => {
          setName("");
          setPortion("");
          setCalories("");
          setProtein("");
          setCarbs("");
          setFat("");
          onCancel();
        },
      },
    );
  };

  return (
    <div className="space-y-1.5 p-2 border border-dashed rounded">
      <Input
        placeholder="Besin adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-7 text-xs"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Input
          placeholder="Porsiyon (örn: 100g)"
          value={portion}
          onChange={(e) => setPortion(e.target.value)}
          className="h-7 text-xs"
        />
        <Input
          placeholder="Kalori"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Input
          placeholder="P (g)"
          type="number"
          step="0.1"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          className="h-7 text-xs"
        />
        <Input
          placeholder="K (g)"
          type="number"
          step="0.1"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
          className="h-7 text-xs"
        />
        <Input
          placeholder="Y (g)"
          type="number"
          step="0.1"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={onCancel}
        >
          İptal
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={handleSave}
          disabled={create.isPending || !name.trim() || !portion.trim() || !calories}
        >
          {create.isPending ? "..." : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}

export function FoodReferencePopover({ onAdd }: FoodReferencePopoverProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TurkishFood["category"] | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("preset");
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: userFoodList } = useUserFoods();
  const deleteFood = useDeleteUserFood();

  const filteredPreset = useMemo(() => {
    return TURKISH_FOODS.filter((f) => {
      if (category && f.category !== category) return false;
      if (search) return f.name.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [search, category]);

  const filteredUser = useMemo(() => {
    if (!userFoodList) return [];
    return userFoodList
      .filter((f) =>
        search ? f.name.toLowerCase().includes(search.toLowerCase()) : true,
      )
      .map((f) => ({
        id: f.id,
        name: f.name,
        portion: f.portion,
        calories: f.calories,
        protein: parseFloat(f.proteinG ?? "0") || 0,
        carbs: parseFloat(f.carbsG ?? "0") || 0,
        fat: parseFloat(f.fatG ?? "0") || 0,
      }));
  }, [userFoodList, search]);

  const categories = Object.entries(CATEGORY_LABELS) as [TurkishFood["category"], string][];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5" type="button">
          <BookOpen className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-semibold">Besin Değerleri</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("preset")}
              className={cn(
                "flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                tab === "preset"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              Hazır Besinler
            </button>
            <button
              type="button"
              onClick={() => setTab("user")}
              className={cn(
                "flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                tab === "user"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              Benim ({userFoodList?.length ?? 0})
            </button>
          </div>
          <Input
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          {tab === "preset" && (
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={category === null ? "default" : "outline"}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                type="button"
                onClick={() => setCategory(null)}
              >
                Tümü
              </Button>
              {categories.map(([key, label]) => (
                <Button
                  key={key}
                  variant={category === key ? "default" : "outline"}
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  type="button"
                  onClick={() => setCategory(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          {tab === "preset" && (
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {filteredPreset.map((food, i) => (
                <PortionRow
                  key={i}
                  food={food}
                  onAdd={(m) => {
                    onAdd(food, m);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          )}
          {tab === "user" && (
            <div className="space-y-1.5">
              {showNewForm ? (
                <NewUserFoodForm onCancel={() => setShowNewForm(false)} />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={() => setShowNewForm(true)}
                >
                  <Plus className="h-3 w-3" />
                  Yeni besin ekle
                </Button>
              )}
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {filteredUser.length === 0 && !showNewForm && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Henüz kayıtlı besin yok
                  </p>
                )}
                {filteredUser.map((food) => (
                  <PortionRow
                    key={food.id}
                    food={food}
                    onAdd={(m) => {
                      onAdd(food, m);
                      setOpen(false);
                    }}
                    onDelete={() => deleteFood.mutate(food.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
