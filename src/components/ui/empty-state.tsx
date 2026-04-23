import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  iconClassName,
  size = "md",
}: EmptyStateProps) {
  const isSmall = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isSmall ? "py-6 px-3 gap-2" : "py-10 px-4 gap-3",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-full bg-muted/50 flex items-center justify-center",
            isSmall ? "h-10 w-10" : "h-14 w-14",
            iconClassName,
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground/70",
              isSmall ? "h-4 w-4" : "h-6 w-6",
            )}
          />
        </div>
      )}
      <div className="space-y-1 max-w-[16rem]">
        <p
          className={cn(
            "font-medium text-foreground",
            isSmall ? "text-sm" : "text-base",
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "text-muted-foreground",
              isSmall ? "text-xs" : "text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
