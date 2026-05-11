"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useAiQuota, useInvalidateAiQuota, getQuota } from "@/hooks/use-ai-quota";

function useTimeAgo() {
  const t = useTranslations("progress.aiAnalysis");
  return (date: Date): string => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return t("justNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("minutesAgo", { m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("hoursAgo", { h });
    return t("daysAgo", { d: Math.floor(h / 24) });
  };
}

export function ProgressAiAnalysis() {
  const t = useTranslations("progress.aiAnalysis");
  const timeAgo = useTimeAgo();
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastFetchedAt = useRef<Date | null>(null);
  const [, forceUpdate] = useState(0);

  const { data: quotaData } = useAiQuota();
  const invalidateQuota = useInvalidateAiQuota();
  const analyzeQuota = getQuota(quotaData, "analyze");

  const fetchAnalysis = async () => {
    setLoading(true);
    setError("");
    setAnalysis("");

    try {
      const res = await fetch("/api/ai/analyze", { method: "POST" });

      if (res.status === 429) {
        setError(t("dailyLimit"));
        return;
      }

      if (!res.ok && res.status !== 200) {
        setError(t("unavailable"));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError(t("connectionError"));
        return;
      }

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnalysis(text);
      }

      lastFetchedAt.current = new Date();
      forceUpdate((n) => n + 1);
      invalidateQuota();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  const analyzeLabel = loading
    ? t("analyzing")
    : analyzeQuota?.remaining === 0
      ? t("limitReached")
      : `${t("analyze")}${analyzeQuota ? ` (${analyzeQuota.remaining}/${analyzeQuota.limit})` : ""}`;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t("title")}</span>
            {lastFetchedAt.current && !loading && (
              <span className="text-xs text-muted-foreground">
                · {timeAgo(lastFetchedAt.current)}
              </span>
            )}
          </div>
          {!analysis || loading ? (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalysis}
              disabled={loading || (analyzeQuota?.remaining === 0)}
              className="gap-1 text-xs"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {analyzeLabel}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAnalysis}
              className="gap-1 text-xs text-muted-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              {t("refresh")}
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {analysis}
            </p>
            {loading && (
              <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
