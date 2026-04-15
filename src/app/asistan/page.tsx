"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ChatMessage } from "@/components/ai/chat-message";
import { ChatInput } from "@/components/ai/chat-input";
import { useAIChat } from "@/hooks/use-ai-chat";
import { Bot } from "lucide-react";

export default function AsistanPage() {
  const { messages, isStreaming, send, abort } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[100dvh] animate-fade-in">
      <Header
        title="AI Asistan"
        subtitle="Kişisel fitness koçunuz"
        icon={Bot}
        rightSlot={<NotificationBell />}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">FitTrack Asistan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Beslenme, antrenman ve sağlık hakkında sorular sorabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {[
                "Bugün ne yemeliyim?",
                "Menisküs ile squat yapabilir miyim?",
                "Kilo verme hızım nasıl?",
                "Su tüketimi ne kadar olmalı?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={
              isStreaming &&
              msg.role === "assistant" &&
              i === messages.length - 1
            }
          />
        ))}
      </div>

      <div className="sticky bottom-16">
        <ChatInput
          onSend={send}
          onAbort={abort}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
