"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_ICONS = [
  "🍳", "🥐", "🥞", "🥓", "🍞", "🥖",
  "🍗", "🥩", "🍖", "🐟", "🦐", "🥚",
  "🥗", "🥙", "🌯", "🍲", "🍛", "🍝",
  "🍚", "🍜", "🌮", "🌭", "🍔", "🍕",
  "🥛", "☕", "🧋", "🍵", "🥤", "🍶",
  "🍎", "🍌", "🥑", "🥜", "🧀", "🍫",
];

interface IconPickerProps {
  value?: string | null;
  onChange: (icon: string | null) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("h-10 w-10 shrink-0 text-lg", className)}
          title="Emoji seç"
        >
          {value ? (
            <span className="text-xl leading-none">{value}</span>
          ) : (
            <Smile className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">Emoji</span>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Temizle
            </button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {PRESET_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => {
                onChange(icon);
                setOpen(false);
              }}
              className={cn(
                "h-9 w-9 rounded-md text-xl leading-none flex items-center justify-center hover:bg-accent transition-colors",
                value === icon && "bg-primary/15 ring-1 ring-primary/40",
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
