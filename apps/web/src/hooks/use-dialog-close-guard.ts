"use client";

import { useCallback, useState } from "react";

export function useDialogCloseGuard(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const guardedOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isDirty) {
        setConfirmOpen(true);
        return;
      }
      onOpenChange(open);
    },
    [isDirty, onOpenChange],
  );

  const onConfirmClose = useCallback(() => {
    setConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const onCancelClose = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return { guardedOpenChange, confirmOpen, onConfirmClose, onCancelClose };
}
