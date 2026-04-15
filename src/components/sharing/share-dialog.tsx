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
import { Loader2, UserPlus } from "lucide-react";
import { useShareableUsers, useShareWeeklyPlan } from "@/hooks/use-sharing";

interface ShareDialogProps {
  weeklyPlanId: number;
  existingShareUserIds: string[];
}

export function ShareDialog({
  weeklyPlanId,
  existingShareUserIds,
}: ShareDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <UserPlus className="h-3 w-3" />
          Paylaş
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kullanıcı Seç</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !availableUsers?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Paylaşılacak kullanıcı yok
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
                  Seç
                </Badge>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
