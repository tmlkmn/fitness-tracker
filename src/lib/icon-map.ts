import React from "react";
import {
  Coffee,
  Egg,
  Car,
  Sandwich,
  Moon,
  Apple,
  Beef,
  Wheat,
  Milk,
  Carrot,
  Droplets,
  Pill,
  ShoppingBasket,
  Cookie,
  Salad,
  Fish,
  CupSoda,
  IceCreamCone,
  Flame,
  Waves,
  Footprints,
  Zap,
  Shield,
  Sword,
  Crown,
  Trophy,
  Star,
  Medal,
  Gem,
  Sparkles,
  Dumbbell,
  HeartPulse,
  Utensils,
  ChefHat,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const emojiIconMap: Record<string, LucideIcon> = {
  "☕": Coffee,
  "🍳": Egg,
  "🚗": Car,
  "🥪": Sandwich,
  "🌙": Moon,
  "🍎": Apple,
  "🥩": Beef,
  "🌾": Wheat,
  "🥛": Milk,
  "🥕": Carrot,
  "💧": Droplets,
  "💊": Pill,
  "🛒": ShoppingBasket,
};

const emojiRegex =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export function stripEmoji(text: string): string {
  return text.replace(emojiRegex, "").trim();
}

export function getIconForText(text: string): LucideIcon | null {
  for (const [emoji, icon] of Object.entries(emojiIconMap)) {
    if (text.includes(emoji)) return icon;
  }
  return null;
}

// ── Meal label → icon mapping ──────────────────────────────────────────

const mealLabelIcons: [RegExp, LucideIcon][] = [
  [/kahvaltı/i, Coffee],
  [/ara\s*öğün|snack|atıştırma/i, Cookie],
  [/öğle/i, Salad],
  [/akşam/i, Beef],
  [/gece|casein|kazein/i, Moon],
  [/pre[- ]?workout|antrenman\s*önce/i, Flame],
  [/post[- ]?workout|antrenman\s*sonra/i, CupSoda],
  [/balık|fish|omega/i, Fish],
  [/protein|shake|whey/i, Milk],
  [/meyve|fruit/i, Apple],
  [/tatlı|dessert/i, IceCreamCone],
];

export function getMealIcon(mealLabel: string): LucideIcon {
  const cleaned = stripEmoji(mealLabel);
  for (const [pattern, icon] of mealLabelIcons) {
    if (pattern.test(cleaned)) return icon;
  }
  return Sandwich; // default meal icon
}

// ── Exercise section → icon mapping ────────────────────────────────────

const sectionIcons: Record<string, LucideIcon> = {
  warmup: Flame,
  main: Beef,
  cooldown: Waves,
  sauna: Droplets,
  swimming: Waves,
};

export function getSectionIcon(section: string): LucideIcon {
  return sectionIcons[section] ?? Beef;
}

// ── Dynamic icon renderer (avoids react-hooks/static-components lint) ─────

const iconNameMap: Record<string, LucideIcon> = {
  Footprints,
  Zap,
  Shield,
  Sword,
  Crown,
  Trophy,
  Star,
  Medal,
  Gem,
  Sparkles,
  Dumbbell,
  Flame,
  HeartPulse,
  Utensils,
  ChefHat,
};

interface DynamicIconProps extends LucideProps {
  icon: LucideIcon | string;
}

export function DynamicIcon({ icon, ...props }: DynamicIconProps) {
  const resolved = typeof icon === "string" ? iconNameMap[icon] ?? Star : icon;
  return React.createElement(resolved, props);
}
