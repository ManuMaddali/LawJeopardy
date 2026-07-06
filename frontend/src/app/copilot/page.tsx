"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal } from "lucide-react";

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

export default function CopilotPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const historyForApi = useMemo<CopilotHistoryMessage[]>(
    () =>
      messages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  useEffect(() => {
    async function load() {
      try {
        const response = await getCopilotSuggestions();
        setSuggestions(response.suggestions.slice(0, 6));
      } catch {
        setSuggestions([
          "What are the top MBE traps from my uploaded materials?",
          "Quiz me on exceptions with short hypotheticals.",
          "What timing rules are easiest to miss?",
          "Give me compare-and-contrast rules likely tested.",
        ]);
      } finally {
        setLoadingSuggestions(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function sendQuestion(explicit?: string) {
    const question = (explicit ?? input).trim();
    if (!question || sending) return;

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setSending(true);

    try {
      const response = await askCopilot(question, [...historyForApi, { role: "user", content: question }]);
      const assistantMessage: UiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (response.suggested_questions.length > 0) {
        setSuggestions(response.suggested_questions.slice(0, 6));
      }
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Copilot could not answer that question right now.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const isInitial = messages.length === 0;

  return (
    <div className="flex min-h-[78vh] flex-col">
      {isInitial ? (
        <div className="mx-auto mt-16 w-full max-w-3xl px-4 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Ask from your bar materials
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Copilot answers strictly from your uploaded PDFs and cites source excerpts.
          </p>
        </div>
      ) : (
        <Card className="mx-auto mt-3 flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((message) => (
              <div key={message.id} className={cn(message.role === "user" ? "text-right" : "text-left")}>
                <div
                  className={cn(
                    "inline-block max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted text-foreground",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && message.sources && message.sources.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.slice(0, 4).map((source) => (
                      <span
                        key={`${message.id}-${source.context_id}`}
                        className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary-soft px-2 py-1 text-[11px] font-medium text-secondary-soft-foreground"
                        title={source.excerpt}
                      >
                        {source.topic} • {source.source_hint}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mx-auto mt-auto w-full max-w-3xl px-4 pb-4 pt-6">
        {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendQuestion();
                }
              }}
              rows={2}
              placeholder="Ask a bar exam question from your uploaded materials..."
              className="max-h-40 min-h-[48px] flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              disabled={sending}
            />
            <Button
              type="button"
              className="h-11 shrink-0 rounded-xl px-3"
              onClick={() => void sendQuestion()}
              disabled={sending}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {loadingSuggestions ? (
              <span className="text-xs text-muted-foreground">Loading suggestions...</span>
            ) : (
              suggestions.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:opacity-90"
                  onClick={() => void sendQuestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
