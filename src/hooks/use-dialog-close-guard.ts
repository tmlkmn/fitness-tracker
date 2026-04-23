"use client";

import { useCallback } from "react";

const DEFAULT_MESSAGE =
  "Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?";

export function useDialogCloseGuard(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
  message: string = DEFAULT_MESSAGE,
) {
  return useCallback(
    (open: boolean) => {
      if (!open && isDirty) {
        if (typeof window !== "undefined" && !window.confirm(message)) return;
      }
      onOpenChange(open);
    },
    [isDirty, onOpenChange, message],
  );
}
