"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getChatHistory, clearChatHistory } from "@/actions/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Load chat history from DB on mount
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

      try {
        // Build message history for API
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
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content:
                      "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.",
                  }
                : m
            )
          );
          return;
        }

        if (!res.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content:
                      "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                  }
                : m
            )
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          const currentText = text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: currentText } : m
            )
          );
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content:
                      m.content || "Bağlantı hatası. Tekrar deneyin.",
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages]
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
