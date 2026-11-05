"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  /** API route that returns a PDF (e.g. /api/export/weekly-plan/12). */
  url: string;
  /** Suggested filename for the downloaded/shared file. */
  filename: string;
  /** Title used in the native share sheet. */
  shareTitle?: string;
  /** Visible button text. Omit for an icon-only button. */
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
}

/**
 * Fetches a PDF from `url` and either shares it via the Web Share API (native
 * share sheet on phones — WhatsApp, Files, Mail …) or falls back to a download
 * on platforms that can't share files. Used for all in-app PDF exports.
 */
export function ExportButton({
  url,
  filename,
  shareTitle,
  label,
  variant = "outline",
  size = "sm",
  className,
}: ExportButtonProps) {
  const t = useTranslations("export");
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/pdf" });

      // Prefer the native share sheet when the platform can share files.
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (
        typeof nav.share === "function" &&
        typeof nav.canShare === "function" &&
        nav.canShare({ files: [file] })
      ) {
        try {
          await nav.share({ files: [file], title: shareTitle ?? filename });
          return;
        } catch (err) {
          // User dismissed the share sheet — not an error.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Otherwise fall through to download.
        }
      }

      // Fallback: trigger a download.
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={busy}
      onClick={handleExport}
      aria-label={label ?? t("buttonLabel")}
      title={label ?? t("buttonLabel")}
    >
      {!busy && <Download className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
