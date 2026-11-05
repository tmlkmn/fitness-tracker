"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";
import { deleteMyAccount } from "@/actions/account";

export function DataPrivacyCard() {
  const t = useTranslations("account");
  const { data: session } = useSession();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const email = session?.user?.email ?? "";
  const canDelete =
    email.length > 0 &&
    confirmText.trim().toLowerCase() === email.toLowerCase();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount(confirmText.trim());
      toast.success(t("delete.success"));
      await signOut();
      router.push("/giris");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "EmailMismatch"
          ? t("delete.errorMismatch")
          : t("delete.errorGeneric");
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t("export.title")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("export.description")}
          </p>
          <Button asChild size="sm" variant="outline">
            <a href="/api/account/export" download>
              <Download className="h-4 w-4" />
              {t("export.button")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">{t("delete.title")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("delete.description")}
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setConfirmText("");
              setDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("delete.button")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("delete.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="delete-confirm">
              {t("delete.confirmLabel")}
            </label>
            <Input
              id="delete-confirm"
              type="email"
              autoComplete="off"
              placeholder={email}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={deleting}>
                {t("delete.cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              disabled={!canDelete}
              loading={deleting}
              onClick={handleDelete}
            >
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
