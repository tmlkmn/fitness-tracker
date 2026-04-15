"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { subscribeToPush } from "@/lib/push-subscribe";

export function PwaInstallButton() {
  const { canInstall, isInstalled, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const accepted = await install();
      if (accepted) {
        await subscribeToPush();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
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
  );
}
