"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  AlertTriangle,
  Bug,
  MessageSquare,
  Star,
  Loader2,
} from "lucide-react";
import { submitFeedback } from "@/actions/feedback";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "suggestion", label: "Öneri", icon: Lightbulb },
  { value: "complaint", label: "Şikayet", icon: AlertTriangle },
  { value: "bug", label: "Hata", icon: Bug },
  { value: "general", label: "Diğer", icon: MessageSquare },
];

export function FeedbackModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState("suggestion");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Lütfen mesajınızı yazın.");
      return;
    }
    setSending(true);
    try {
      await submitFeedback({
        category,
        rating: rating > 0 ? rating : undefined,
        message: message.trim(),
      });
      toast.success("Geri bildiriminiz iletildi!");
      setCategory("suggestion");
      setRating(0);
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error("Gönderilemedi, tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Geri Bildirim</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Kategori</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs font-medium transition-colors ${
                    category === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Uygulamayı Puanla (isteğe bağlı)
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Mesajınız</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Öneri, şikayet veya hata bildiriminizi yazın..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Gönder"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
