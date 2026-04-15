"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, LogOut } from "lucide-react";

export default function UyelikDolduPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Üyelik Süreniz Doldu</h1>
            <p className="text-sm text-muted-foreground">
              Üyelik süreniz dolmuş. Yenilemek için yöneticinizle iletişime
              geçin.
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/giris");
              router.refresh();
            }}
            className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
