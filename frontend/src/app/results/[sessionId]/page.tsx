"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Download,
  Loader2,
  RefreshCcw,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";

import { getSessionResults, missedCsvUrl } from "@/lib/api";
import type { SessionResults } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { PageHero } from "@/components/page-hero";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [results, setResults] = useState<SessionResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    async function load() {
      try {
        setResults(await getSessionResults(sessionId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load results.");
      }
    }
    void load();
  }, [sessionId]);

  const accuracy = useMemo(() => {
    if (!results) return 0;
    const answered = results.session.correct_count + results.session.incorrect_count;
    if (answered === 0) return 0;
    return Math.round((results.session.correct_count / answered) * 100);
  }, [results]);

  if (!results && !error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Crunching your results...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <EmptyState
        title="Could not load results"
        description={error ?? "These results are unavailable right now."}
        action={
          <Button asChild variant="outline">
            <Link href="/boards">Go to Boards</Link>
          </Button>
        }
      />
    );
  }

  const { session } = results;

  return (
    <div className="space-y-8">
      <PageHero
        variant="success"
        eyebrow={
          <Badge variant="played">
            <Trophy className="h-3.5 w-3.5" />
            Session complete
          </Badge>
        }
        title={`${results.board_title} results`}
        description="Here's how this round went. Review your misses, then run it back to lock in the rules."
        aside={
          <Card className="w-full min-w-[220px] border-border/70 text-center">
            <CardContent className="space-y-1 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accuracy</p>
              <p className="font-display text-5xl font-extrabold tabular-nums text-success">{accuracy}%</p>
              <p className="text-sm font-medium text-muted-foreground">
                Final score{" "}
                <span className="font-bold text-foreground tabular-nums">{session.score}</span>
              </p>
            </CardContent>
          </Card>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Correct" value={session.correct_count} tone="success" />
        <StatCard label="Incorrect" value={session.incorrect_count} tone="danger" />
        <StatCard label="Skipped" value={session.skipped_count} tone="accent" />
        <StatCard label="Total" value={session.total_questions} tone="primary" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-danger" />
              Weakest topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {results.weakest_topics.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No weak spots this round"
                description="You didn't miss anything here. Keep that momentum going."
                className="py-5"
              />
            ) : (
              results.weakest_topics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5"
                >
                  <p className="font-medium text-foreground">{topic.topic}</p>
                  <Badge variant="danger">{topic.missed} missed</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Rule summaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {results.rule_summaries.length === 0 ? (
              <EmptyState
                title="Nothing to summarize"
                description="No missed rules this session. Your explanations list is clean."
                className="py-5"
              />
            ) : (
              results.rule_summaries.map((summary, idx) => (
                <div
                  key={summary}
                  className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-sm leading-relaxed"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground">
                    {idx + 1}
                  </span>
                  <p className="text-foreground/90">{summary}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Missed questions</CardTitle>
            <CardDescription>Review your misses, replay, or export them as CSV.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={missedCsvUrl(sessionId)} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href={`/play/${session.board_id}`}>
                <RefreshCcw className="h-4 w-4" />
                Replay board
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.missed_questions.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Perfect run"
              description="No missed or skipped questions this session. Outstanding."
              className="py-6"
            />
          ) : (
            results.missed_questions.map((question) => (
              <div
                key={question.id}
                className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="topic">{question.topic}</Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {question.category} · ${question.points}
                  </span>
                </div>
                <p className="font-medium text-foreground">{question.clue}</p>
                <p>
                  <span className="font-semibold text-success">Answer: </span>
                  <span className="text-foreground">{question.answer}</span>
                </p>
                <p className="text-muted-foreground">{question.explanation}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
