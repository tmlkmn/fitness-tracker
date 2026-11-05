"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-[85%] text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-line leading-relaxed">{content}</p>
        ) : (
          <div className="chat-markdown leading-relaxed">
            {content ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h3 className="text-sm font-bold text-primary mt-3 mb-1.5 first:mt-0">{children}</h3>
                  ),
                  h2: ({ children }) => (
                    <h4 className="text-sm font-bold text-primary mt-3 mb-1.5 first:mt-0">{children}</h4>
                  ),
                  h3: ({ children }) => (
                    <h4 className="text-sm font-semibold text-primary mt-2.5 mb-1 first:mt-0">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 last:mb-0 space-y-1 ml-0.5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 last:mb-0 space-y-1 ml-0.5 list-decimal list-inside">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex gap-1.5 items-start">
                      <span className="text-primary mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-primary/60 inline-block" />
                      <span className="flex-1">{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-muted-foreground italic">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                  ),
                  hr: () => (
                    <hr className="border-border/50 my-2" />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : null}
            {isStreaming && (
              <span
                className={cn(
                  "inline-block w-0.5 h-3.5 align-[-1px] rounded-[1px] animate-[caret-blink_1s_ease-in-out_infinite]",
                  content ? "bg-foreground/50 ml-0.5" : "bg-primary"
                )}
              />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
