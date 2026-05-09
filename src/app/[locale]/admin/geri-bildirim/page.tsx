"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listAllFeedbacks, respondToFeedback, closeFeedback } from "@/actions/feedback";
import type { FeedbackWithUser } from "@/actions/feedback";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Bug,
  Star,
  Loader2,
  X,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; className: string }> = {
  suggestion: { label: "Öneri", icon: Lightbulb, className: "text-blue-400 bg-blue-400/10" },
  complaint: { label: "Şikayet", icon: AlertTriangle, className: "text-orange-400 bg-orange-400/10" },
  bug: { label: "Hata", icon: Bug, className: "text-red-400 bg-red-400/10" },
  general: { label: "Diğer", icon: MessageSquare, className: "text-muted-foreground bg-muted" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  open: { label: "Açık", icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
  responded: { label: "Yanıtlandı", icon: CheckCircle, className: "text-green-400 bg-green-400/10" },
  closed: { label: "Kapalı", icon: XCircle, className: "text-muted-foreground bg-muted" },
};

type FilterStatus = "all" | "open" | "responded" | "closed";

function formatTimeAgo(date: Date | null): string {
  if (!date) return "-";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

function Stars({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= count ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  );
}

function RespondDialog({
  feedback,
  onClose,
  onSuccess,
}: {
  feedback: FeedbackWithUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) {
      setError("Yanıt boş olamaz.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await respondToFeedback(feedback.id, response.trim());
      onSuccess();
    } catch {
      setError("Yanıt gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Yanıtla</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{feedback.userName}</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{feedback.message}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Yanıtınızı yazın..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
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
                  Yanıt Gönder
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState<FeedbackWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [respondTarget, setRespondTarget] = useState<FeedbackWithUser | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);

  const fetchFeedbacks = async () => {
    try {
      const data = await listAllFeedbacks();
      setFeedbackList(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      if (message === "Forbidden") {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async (id: number) => {
    setClosingId(id);
    try {
      await closeFeedback(id);
      await fetchFeedbacks();
    } catch {
      // silent
    } finally {
      setClosingId(null);
    }
  };

  const filtered = filter === "all"
    ? feedbackList
    : feedbackList.filter((f) => f.status === filter);

  const counts = {
    all: feedbackList.length,
    open: feedbackList.filter((f) => f.status === "open").length,
    responded: feedbackList.filter((f) => f.status === "responded").length,
    closed: feedbackList.filter((f) => f.status === "closed").length,
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const FILTERS: { value: FilterStatus; label: string }[] = [
    { value: "all", label: `Tümü (${counts.all})` },
    { value: "open", label: `Açık (${counts.open})` },
    { value: "responded", label: `Yanıtlanan (${counts.responded})` },
    { value: "closed", label: `Kapalı (${counts.closed})` },
  ];

  return (
    <div className="min-h-dvh pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors shrink-0"
            aria-label="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Geri Bildirimler</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feedback list */}
        <div className="space-y-3">
          {filtered.map((fb) => {
            const cat = CATEGORY_CONFIG[fb.category] ?? CATEGORY_CONFIG.general;
            const status = STATUS_CONFIG[fb.status] ?? STATUS_CONFIG.open;
            const CatIcon = cat.icon;
            const StatusIcon = status.icon;

            return (
              <Card key={fb.id}>
                <CardContent className="p-4 space-y-2.5">
                  {/* Top row: rating + category + time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stars count={fb.rating} />
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cat.className}`}>
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(fb.createdAt)}
                    </span>
                  </div>

                  {/* User info */}
                  <div>
                    <p className="text-sm font-medium">{fb.userName}</p>
                    <p className="text-xs text-muted-foreground">{fb.userEmail}</p>
                  </div>

                  {/* Message */}
                  <p className="text-sm leading-relaxed">{fb.message}</p>

                  {/* Status + admin response */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>

                  {fb.adminResponse && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Admin Yanıtı:</p>
                      <p className="text-sm">{fb.adminResponse}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {fb.status === "open" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setRespondTarget(fb)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Yanıtla
                      </button>
                      <button
                        onClick={() => handleClose(fb.id)}
                        disabled={closingId === fb.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {closingId === fb.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Kapat
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {fb.status === "responded" && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleClose(fb.id)}
                        disabled={closingId === fb.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {closingId === fb.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Kapat
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filter === "all" ? "Henüz geri bildirim yok." : "Bu filtrede geri bildirim yok."}
            </p>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Admin Paneline Dön
          </Link>
        </div>
      </div>

      {respondTarget && (
        <RespondDialog
          feedback={respondTarget}
          onClose={() => setRespondTarget(null)}
          onSuccess={() => {
            setRespondTarget(null);
            fetchFeedbacks();
          }}
        />
      )}
    </div>
  );
}
