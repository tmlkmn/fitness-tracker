"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { subscribeToPush } from "@/lib/push-subscribe";

export function PwaInstallButton() {
  const { canInstall, install } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

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
      // Fallback: open share menu instructions or alert
      alert("Tarayıcınızın menüsünden \"Ana Ekrana Ekle\" seçeneğini kullanın.");
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
