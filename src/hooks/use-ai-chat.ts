"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getChatHistory, clearChatHistory, saveChatMessage } from "@/actions/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Typewriter: characters revealed per animation frame. Tuned for ~60 cps
// while keeping up during network bursts by batching overflow.
const CHARS_PER_FRAME = 2;
const MAX_BATCH_LAG = 80; // if buffer gets too far ahead, burst-flush

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useAIChat() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const history = await getChatHistory();
        if (history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      } catch {
        // silent — start with empty chat
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const send = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Typewriter state
      let networkBuffer = "";
      let visibleLength = 0;
      let streamDone = false;
      let rafId: number | null = null;
      const reducedMotion = prefersReducedMotion();

      const commit = (text: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: text } : m,
          ),
        );
      };

      const pump = () => {
        const remaining = networkBuffer.length - visibleLength;
        if (remaining > 0) {
          const step =
            remaining > MAX_BATCH_LAG
              ? Math.ceil(remaining / 8)
              : CHARS_PER_FRAME;
          visibleLength = Math.min(networkBuffer.length, visibleLength + step);
          commit(networkBuffer.slice(0, visibleLength));
        }
        if (streamDone && visibleLength >= networkBuffer.length) {
          rafId = null;
          return;
        }
        rafId = requestAnimationFrame(pump);
      };

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          commit("Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.");
          return;
        }

        if (!res.ok) {
          commit("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();

        if (!reducedMotion) {
          rafId = requestAnimationFrame(pump);
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          networkBuffer += chunk;
          if (reducedMotion) {
            commit(networkBuffer);
            visibleLength = networkBuffer.length;
          }
        }

        streamDone = true;
        // Flush in case typewriter hasn't caught up on unmount/error paths
        if (reducedMotion) {
          commit(networkBuffer);
          visibleLength = networkBuffer.length;
        }

        if (networkBuffer) {
          saveChatMessage("assistant", networkBuffer).catch(() => {});
        }
      } catch (err) {
        streamDone = true;
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled — keep whatever was visible
        } else {
          if (!networkBuffer) {
            commit("Bağlantı hatası. Tekrar deneyin.");
          }
        }
      } finally {
        // Wait briefly for the typewriter to drain the buffer, but don't
        // block forever. Max 2s catch-up, then force-flush.
        const drainStart = Date.now();
        while (
          !reducedMotion &&
          visibleLength < networkBuffer.length &&
          Date.now() - drainStart < 2000
        ) {
          await new Promise((r) => setTimeout(r, 16));
        }
        if (visibleLength < networkBuffer.length) {
          commit(networkBuffer);
        }
        if (rafId !== null) cancelAnimationFrame(rafId);
        setIsStreaming(false);
        abortRef.current = null;
        qc.invalidateQueries({ queryKey: ["ai.quota"] });
      }
    },
    [messages, qc]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await clearChatHistory();
      setMessages([]);
    } catch {
      // silent
    }
  }, []);

  return { messages, isStreaming, isLoading, send, abort, clearHistory };
}
