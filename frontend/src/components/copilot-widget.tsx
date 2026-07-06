"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { askCopilot, getCopilotSuggestions } from "@/lib/api";
import type { CopilotHistoryMessage, CopilotSource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CopilotSource[];
};

const starterMessage =
  "Ask me anything from your uploaded bar materials. I will only answer from those documents.";

export function CopilotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "starter", role: "assistant", content: starterMessage },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const historyForApi = useMemo<CopilotHistoryMessage[]>(
    () =>
      messages
        .filter((message) => message.id !== "starter")
        .slice(-8)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages],
  );

  useEffect(() => {
    if (!open) return;
    if (suggestions.length > 0) return;
    async function loadSuggestions() {
      try {
        const response = await getCopilotSuggestions();
        setSuggestions(response.suggestions.slice(0, 6));
      } catch {
        setSuggestions([
          "What are high-yield MBE traps from my materials?",
          "Quiz me on exceptions likely to be tested.",
          "What timing rules should I memorize?",
        ]);
      }
    }
    void loadSuggestions();
  }, [open, suggestions.length]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  async function sendQuestion(explicitQuestion?: string) {
    const question = (explicitQuestion ?? input).trim();
    if (!question || sending) return;

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const response = await askCopilot(question, [...historyForApi, { role: "user", content: question }]);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
        },
      ]);
      if (response.suggested_questions.length > 0) {
        setSuggestions(response.suggested_questions.slice(0, 6));
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I could not answer that right now. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (pathname === "/copilot") {
    return null;
  }

  return (
    <>
      <Button
        className="fixed bottom-5 right-5 z-40 rounded-full px-4 shadow-lg"
        onClick={() => setOpen((prev) => !prev)}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Copilot
      </Button>

      {open ? (
        <Card className="fixed bottom-20 right-5 z-50 flex h-[620px] w-[390px] flex-col overflow-hidden border border-border bg-card p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">Bar Copilot</p>
                <p className="text-xs text-muted-foreground">Answers only from uploaded materials</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/copilot"
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Open page
              </Link>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-card p-4">
            {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "border border-border bg-muted text-card-foreground",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && message.sources && message.sources.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {message.sources.slice(0, 3).map((source) => (
                      <span
                        key={`${message.id}-${source.context_id}`}
                        className="inline-flex items-center rounded-full border border-secondary/25 bg-secondary-soft px-2 py-1 text-[11px] font-medium text-secondary-soft-foreground"
                        title={source.excerpt}
                      >
                        {source.topic} • {source.filename}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-card p-3">
            {suggestions.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1">
                {suggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground hover:opacity-90"
                    onClick={() => void sendQuestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion();
                  }
                }}
                placeholder="Ask from your bar PDFs..."
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                disabled={sending}
              />
              <Button
                type="button"
                onClick={() => void sendQuestion()}
                disabled={sending}
                className="h-11 rounded-xl px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </>
  );
}
