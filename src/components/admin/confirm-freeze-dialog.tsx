"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Snowflake,
  Play,
  LockKeyhole,
  LockKeyholeOpen,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ConfirmFreezeDialog({
  type,
  userName,
  onConfirm,
  onClose,
}: {
  type: "freeze" | "unfreeze";
  userName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("admin.freeze");

  const isFreeze = type === "freeze";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isFreeze ? (
                <div className="h-8 w-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <LockKeyhole className="h-4 w-4 text-blue-400" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-green-400/10 flex items-center justify-center">
                  <LockKeyholeOpen className="h-4 w-4 text-green-400" />
                </div>
              )}
              <h2 className="text-base font-semibold">
                {isFreeze ? t("freezeTitle") : t("unfreezeTitle")}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`rounded-lg p-3 text-sm ${
              isFreeze
                ? "bg-blue-400/10 text-blue-300"
                : "bg-green-400/10 text-green-300"
            }`}
          >
            <p className="font-medium">{userName}</p>
            <p className="mt-1 text-xs opacity-80">
              {isFreeze ? t("freezeWarning") : t("unfreezeWarning")}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                isFreeze
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFreeze ? (
                <>
                  <Snowflake className="h-4 w-4" /> {t("freezeButton")}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> {t("unfreezeButton")}
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
