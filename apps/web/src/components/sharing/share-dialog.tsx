"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, UserPlus } from "lucide-react";
import { useShareableUsers, useShareWeeklyPlan } from "@/hooks/use-sharing";
import { useTranslations } from "next-intl";

interface ShareDialogProps {
  weeklyPlanId: number;
  existingShareUserIds: string[];
  trigger?: "default" | "icon";
  existingShareCount?: number;
}

export function ShareDialog({
  weeklyPlanId,
  existingShareUserIds,
  trigger = "default",
  existingShareCount,
}: ShareDialogProps) {
  const t = useTranslations("shareManager");
  const [open, setOpen] = useState(false);
  const { data: allUsers, isLoading } = useShareableUsers();
  const shareMutation = useShareWeeklyPlan();

  const availableUsers = allUsers?.filter(
    (u) => !existingShareUserIds.includes(u.id)
  );

  const handleShare = async (userId: string) => {
    await shareMutation.mutateAsync({
      weeklyPlanId,
      sharedWithUserId: userId,
    });
    setOpen(false);
  };

  const triggerNode =
    trigger === "icon" ? (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 relative"
        aria-label={t("shareButton")}
      >
        <Share2 className="h-3.5 w-3.5" />
        {existingShareCount != null && existingShareCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] tabular-nums"
          >
            {existingShareCount}
          </Badge>
        )}
      </Button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {t("shareButton")}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pickUserTitle")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !availableUsers?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noUsers")}
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleShare(user.id)}
                disabled={shareMutation.isPending}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t("select")}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
