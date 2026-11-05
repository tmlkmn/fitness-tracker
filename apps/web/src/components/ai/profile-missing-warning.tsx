"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { MissingField } from "@/hooks/use-profile-check";
import { useTranslations } from "next-intl";

interface ProfileMissingWarningProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: MissingField[];
}

export function ProfileMissingWarning({
  open,
  onOpenChange,
  missingFields,
}: ProfileMissingWarningProps) {
  const t = useTranslations("assistant.profileMissing");
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("body")}</p>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-1.5">
            {missingFields.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                <span className="text-sm text-yellow-500">{field.label}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push("/ayarlar");
            }}
          >
            {t("cta")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
