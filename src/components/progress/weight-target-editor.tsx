"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateUserWeightTargets } from "@/hooks/use-user";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface WeightTargetEditorProps {
  currentWeight?: string | null;
  currentTarget?: string | null;
}

export function WeightTargetEditor({
  currentWeight,
  currentTarget,
}: WeightTargetEditorProps) {
  const [open, setOpen] = useState(false);
  const [startWeight, setStartWeight] = useState(currentWeight ?? "");
  const [targetWeight, setTargetWeight] = useState(currentTarget ?? "");
  const mutation = useUpdateUserWeightTargets();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartWeight(currentWeight ?? "");
      setTargetWeight(currentTarget ?? "");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    await mutation.mutateAsync({
      weight: startWeight || undefined,
      targetWeight: targetWeight || undefined,
    });
    toast.success("Hedefler güncellendi");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kilo Hedefleri</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="start-weight" className="text-xs">
              Başlangıç Kilo (kg)
            </Label>
            <Input
              id="start-weight"
              type="number"
              step="0.1"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target-weight" className="text-xs">
              Hedef Kilo (kg)
            </Label>
            <Input
              id="target-weight"
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
