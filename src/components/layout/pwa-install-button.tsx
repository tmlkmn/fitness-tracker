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

function IosInstructions() {
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3">
        <StepNumber n={1} />
        <span>
          Safari&apos;nin alt menüsündeki{" "}
          <Share className="inline h-4 w-4 -mt-0.5" />{" "}
          <strong>Paylaş</strong> simgesine dokunun
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber n={2} />
        <span>
          Aşağı kaydırın ve <strong>Ana Ekrana Ekle</strong> seçeneğine dokunun
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber n={3} />
        <span>
          Sağ üstteki <strong>Ekle</strong> butonuna dokunun
        </span>
      </li>
    </ol>
  );
}

function AndroidInstructions() {
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3">
        <StepNumber n={1} />
        <span>
          Tarayıcının sağ üst köşesindeki{" "}
          <MoreVertical className="inline h-4 w-4 -mt-0.5" />{" "}
          <strong>menü</strong> simgesine dokunun
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber n={2} />
        <span>
          <strong>Ana ekrana ekle</strong> veya <strong>Uygulamayı yükle</strong>{" "}
          seçeneğine dokunun
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber n={3} />
        <span>
          <strong>Yükle</strong> butonuna dokunun
        </span>
      </li>
    </ol>
  );
}

function DesktopInstructions() {
  return (
    <ol className="space-y-3 list-none">
      <li className="flex items-start gap-3">
        <StepNumber n={1} />
        <span>
          Adres çubuğundaki{" "}
          <Download className="inline h-4 w-4 -mt-0.5" />{" "}
          <strong>yükle</strong> simgesine tıklayın
        </span>
      </li>
      <li className="flex items-start gap-3">
        <StepNumber n={2} />
        <span>
          Veya tarayıcı menüsünden <strong>Uygulamayı yükle</strong> seçeneğini
          kullanın
        </span>
      </li>
    </ol>
  );
}

export function PwaInstallButton() {
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
        aria-label="Uygulamayı İndir"
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
            <DialogTitle>Uygulamayı Yükle</DialogTitle>
            <DialogDescription>
              Uygulamayı ana ekranınıza eklemek için aşağıdaki adımları izleyin.
            </DialogDescription>
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
