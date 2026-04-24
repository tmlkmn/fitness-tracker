"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareStreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  currentStreak: number;
  longestStreak: number;
  unlockedBadges: number;
  totalBadges: number;
}

const WIDTH = 1080;
const HEIGHT = 1080;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderShareImage(
  canvas: HTMLCanvasElement,
  props: Omit<ShareStreakDialogProps, "open" | "onOpenChange">,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // Gradient background
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#0a1f14");
  bg.addColorStop(0.5, "#0d2818");
  bg.addColorStop(1, "#071510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Accent blur circles
  const glow1 = ctx.createRadialGradient(180, 220, 10, 180, 220, 420);
  glow1.addColorStop(0, "rgba(34, 197, 94, 0.35)");
  glow1.addColorStop(1, "rgba(34, 197, 94, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(900, 860, 10, 900, 860, 480);
  glow2.addColorStop(0, "rgba(251, 146, 60, 0.28)");
  glow2.addColorStop(1, "rgba(251, 146, 60, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Brand
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.fillText("FitMusc", 80, 110);

  // Subtitle
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 38px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.fillText("Günlük Seri", WIDTH / 2, 320);

  // Flame
  ctx.font = "200px system-ui";
  ctx.fillText("🔥", WIDTH / 2, 500);

  // Big streak number
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 240px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(String(props.currentStreak), WIDTH / 2, 720);

  // "gün üst üste"
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 42px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("gün üst üste", WIDTH / 2, 790);

  // Stats card
  const cardY = 860;
  const cardH = 140;
  const cardX = 80;
  const cardW = WIDTH - 160;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 26px system-ui";
  ctx.fillText("En uzun seri", WIDTH / 4 + 40, cardY + 55);
  ctx.fillText("Rozetler", (3 * WIDTH) / 4 - 40, cardY + 55);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px system-ui";
  ctx.fillText(`${props.longestStreak} gün`, WIDTH / 4 + 40, cardY + 110);
  ctx.fillText(
    `${props.unlockedBadges}/${props.totalBadges}`,
    (3 * WIDTH) / 4 - 40,
    cardY + 110,
  );

  // User name ribbon
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 30px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(props.userName, WIDTH / 2, 220);
}

export function ShareStreakDialog({
  open,
  onOpenChange,
  userName,
  currentStreak,
  longestStreak,
  unlockedBadges,
  totalBadges,
}: ShareStreakDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderShareImage(canvas, {
      userName,
      currentStreak,
      longestStreak,
      unlockedBadges,
      totalBadges,
    });
    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [open, userName, currentStreak, longestStreak, unlockedBadges, totalBadges]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitmusc-seri-${currentStreak}gun.png`;
    a.click();
    toast.success("Görsel indirildi");
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `fitmusc-seri.png`, {
          type: "image/png",
        });
        if (
          typeof navigator !== "undefined" &&
          "share" in navigator &&
          navigator.canShare?.({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: "FitMusc Seri",
            text: `${currentStreak} gün üst üste! 🔥`,
          });
        } else {
          handleDownload();
        }
      }, "image/png");
    } catch {
      // user cancelled share
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Serini Paylaş</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <canvas ref={canvasRef} className="hidden" />
          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Seri görseli önizleme"
                className="w-full aspect-square object-cover"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              İndir
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              Paylaş
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
