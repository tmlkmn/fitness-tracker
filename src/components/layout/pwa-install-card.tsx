"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { subscribeToPush } from "@/lib/push-subscribe";

export function PwaInstallCard() {
  const { canInstall, isInstalled, install } = usePwaInstall();
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
      alert("Tarayıcınızın menüsünden \"Ana Ekrana Ekle\" seçeneğini kullanın.");
    }
  };

  if (isInstalled) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Uygulama Yüklü</p>
              <p className="text-xs text-muted-foreground">
                FitMusc cihazınıza yüklenmiş durumda
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Uygulamayı Cihazına İndir</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ana ekranına ekle, bildirimler otomatik açılsın
            </p>
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={installing}
              className="mt-3 w-full"
            >
              {installing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Cihaza İndir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
