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
  type LucideIcon,
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
