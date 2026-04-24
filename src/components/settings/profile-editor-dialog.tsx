"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileEditor } from "./profile-editor";
import { useUserProfile } from "@/hooks/use-user";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ReturnType<typeof useUserProfile>["data"];
  userEmail?: string;
}

export function ProfileEditorDialog({ open, onOpenChange, profile, userEmail }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader sticky>
          <DialogTitle>Profili Düzenle</DialogTitle>
        </DialogHeader>
        <ProfileEditor
          profile={profile}
          userEmail={userEmail}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
