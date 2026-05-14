"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sendUserNudge } from "@/actions/admin-user-detail";

export function NudgeDialog({
  userId,
  userName,
  onClose,
  onSuccess,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("admin.nudge");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!subject.trim()) {
      setError(t("subjectRequired"));
      return;
    }
    if (!message.trim()) {
      setError(t("messageRequired"));
      return;
    }
    setLoading(true);
    try {
      await sendUserNudge(userId, subject, message);
      onSuccess();
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("title")}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{userName}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("subjectLabel")}
              </label>
              <input
                type="text"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("messageLabel")}
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("send")}
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
