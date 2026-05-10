"use client";

import { Download, Loader2, Share, MoreVertical } from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { subscribeToPush } from "@/lib/push-subscribe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

function getPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "other";
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
      {n}
    </span>
  );
}

type RichTags = {
  strong: (chunks: React.ReactNode) => React.ReactNode;
  icon: () => React.ReactNode;
};

function richTags(icon: React.ReactNode): RichTags {
  return {
    strong: (chunks) => <strong>{chunks}</strong>,
    icon: () => <>{icon}</>,
  };
}

function IosInstructions() {
  const t = useTranslations("pwa.ios");
  const tags = richTags(<Share className="inline h-4 w-4 -mt-0.5" />);
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3"><StepNumber n={1} /><span>{t.rich("step1", tags)}</span></li>
      <li className="flex items-start gap-3"><StepNumber n={2} /><span>{t.rich("step2", tags)}</span></li>
      <li className="flex items-start gap-3"><StepNumber n={3} /><span>{t.rich("step3", tags)}</span></li>
    </ol>
  );
}

function AndroidInstructions() {
  const t = useTranslations("pwa.android");
  const tags = richTags(<MoreVertical className="inline h-4 w-4 -mt-0.5" />);
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3"><StepNumber n={1} /><span>{t.rich("step1", tags)}</span></li>
      <li className="flex items-start gap-3"><StepNumber n={2} /><span>{t.rich("step2", tags)}</span></li>
      <li className="flex items-start gap-3"><StepNumber n={3} /><span>{t.rich("step3", tags)}</span></li>
    </ol>
  );
}

function DesktopInstructions() {
  const t = useTranslations("pwa.desktop");
  const tags = richTags(<Download className="inline h-4 w-4 -mt-0.5" />);
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3"><StepNumber n={1} /><span>{t.rich("step1", tags)}</span></li>
      <li className="flex items-start gap-3"><StepNumber n={2} /><span>{t.rich("step2", tags)}</span></li>
    </ol>
  );
}

export function PwaInstallButton() {
  const t = useTranslations("pwa");
  const { canInstall, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleInstall = async () => {
    if (canInstall) {
      setInstalling(true);
      try {
        const accepted = await install();
        if (accepted) {
          await subscribeToPush();
        }
      } finally {
        setInstalling(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const platform = getPlatform();

  return (
    <>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
        aria-label={t("installLabel")}
      >
        {installing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Download className="h-5 w-5 text-primary" />
        )}
      </button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {platform === "ios" && <IosInstructions />}
            {platform === "android" && <AndroidInstructions />}
            {platform === "other" && <DesktopInstructions />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
