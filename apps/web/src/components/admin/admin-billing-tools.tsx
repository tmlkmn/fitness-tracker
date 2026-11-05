"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { migrateUserToBilling, grantComplimentary } from "@/actions/admin";
import type { BillingTier } from "@/lib/billing/tier-config";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdminBillingTools() {
  const [migrateId, setMigrateId] = useState("");
  const [migrateTier, setMigrateTier] = useState<BillingTier>("pro");
  const [migrating, setMigrating] = useState(false);

  const [grantId, setGrantId] = useState("");
  const [grantDays, setGrantDays] = useState("30");
  const [granting, setGranting] = useState(false);

  const handleMigrate = async () => {
    if (!migrateId.trim()) return;
    setMigrating(true);
    try {
      await migrateUserToBilling(migrateId.trim(), migrateTier);
      toast.success("Kullanıcı plana taşındı.");
      setMigrateId("");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setMigrating(false);
    }
  };

  const handleGrant = async () => {
    const days = parseInt(grantDays, 10);
    if (!grantId.trim() || !Number.isInteger(days) || days < 1) {
      toast.error("Geçersiz giriş.");
      return;
    }
    setGranting(true);
    try {
      await grantComplimentary(grantId.trim(), days);
      toast.success(`${days} günlük ücretsiz erişim verildi.`);
      setGrantId("");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Plana Taşı (kalıcı, comp)</h2>
          <input
            value={migrateId}
            onChange={(e) => setMigrateId(e.target.value)}
            placeholder="Kullanıcı ID"
            className={inputClass}
          />
          <div className="flex gap-2">
            <select
              value={migrateTier}
              onChange={(e) => setMigrateTier(e.target.value as BillingTier)}
              className={inputClass}
            >
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
            <Button
              size="sm"
              disabled={migrating}
              onClick={handleMigrate}
            >
              {migrating && <Loader2 className="h-4 w-4 animate-spin" />}
              Taşı
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Ücretsiz Süre Ver (otomatik biter)
          </h2>
          <input
            value={grantId}
            onChange={(e) => setGrantId(e.target.value)}
            placeholder="Kullanıcı ID"
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value.replace(/\D/g, ""))}
              placeholder="Gün"
              inputMode="numeric"
              className={inputClass}
            />
            <Button size="sm" disabled={granting} onClick={handleGrant}>
              {granting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
