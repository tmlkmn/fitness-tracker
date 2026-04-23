import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Crown,
  Dumbbell,
  MessageSquare,
  Share2,
  UtensilsCrossed,
} from "lucide-react";

export type NotificationCategory =
  | "reminder"
  | "share"
  | "membership"
  | "feedback"
  | "other";

export interface NotificationTypeConfig {
  category: NotificationCategory;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  accentBorder: string;
}

const FALLBACK: NotificationTypeConfig = {
  category: "other",
  icon: Bell,
  iconColor: "text-muted-foreground",
  iconBg: "bg-muted",
  accentBorder: "border-l-muted-foreground/40",
};

const CONFIG: Record<string, NotificationTypeConfig> = {
  reminder_workout: {
    category: "reminder",
    icon: Dumbbell,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    accentBorder: "border-l-orange-500",
  },
  reminder_meal: {
    category: "reminder",
    icon: UtensilsCrossed,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    accentBorder: "border-l-amber-500",
  },
  reminder_custom: {
    category: "reminder",
    icon: Bell,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    accentBorder: "border-l-amber-500",
  },
  plan_shared: {
    category: "share",
    icon: Share2,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
    accentBorder: "border-l-sky-500",
  },
  user_invited: {
    category: "membership",
    icon: Crown,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    accentBorder: "border-l-emerald-500",
  },
  membership_extended: {
    category: "membership",
    icon: Crown,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    accentBorder: "border-l-emerald-500",
  },
  membership_expiring: {
    category: "membership",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    accentBorder: "border-l-amber-500",
  },
  membership_expired: {
    category: "membership",
    icon: AlertTriangle,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    accentBorder: "border-l-destructive",
  },
  new_feedback: {
    category: "feedback",
    icon: MessageSquare,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
    accentBorder: "border-l-violet-500",
  },
  feedback_response: {
    category: "feedback",
    icon: MessageSquare,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
    accentBorder: "border-l-violet-500",
  },
};

export function getNotificationConfig(type: string): NotificationTypeConfig {
  if (CONFIG[type]) return CONFIG[type];
  if (type.startsWith("reminder_")) return CONFIG.reminder_custom;
  return FALLBACK;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  reminder: "Hatırlatıcı",
  share: "Paylaşım",
  membership: "Üyelik",
  feedback: "Geri Bildirim",
  other: "Diğer",
};

export const CATEGORY_ORDER: NotificationCategory[] = [
  "reminder",
  "share",
  "membership",
  "feedback",
  "other",
];
