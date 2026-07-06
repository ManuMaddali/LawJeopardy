"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  LayoutGrid,
  Shuffle,
  Sparkles,
  Trophy,
  UploadCloud,
} from "lucide-react";

import { getBoards, getRecentSessions } from "@/lib/api";
import type { BoardSummary, RecentSession } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { PageHero } from "@/components/page-hero";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getNextExamDate(now: Date = new Date()) {
  const thisYearExam = new Date(now.getFullYear(), 6, 28, 9, 0, 0, 0);
  if (now.getTime() <= thisYearExam.getTime()) return thisYearExam;
  return new Date(now.getFullYear() + 1, 6, 28, 9, 0, 0, 0);
}

function daysUntilExam(examDate: Date) {
  const diff = examDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const primaryActions = [
  { href: "/upload", label: "Upload PDFs", icon: UploadCloud, variant: "default" as const },
  { href: "/upload", label: "Generate Study Set", icon: Sparkles, variant: "secondary" as const },
  { href: "/boards?type=topic", label: "Play Topic Board", icon: LayoutGrid, variant: "outline" as const },
  { href: "/boards?type=mixed", label: "Play Mixed Board", icon: Shuffle, variant: "outline" as const },
];

export default function Home() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [recentResults, setRecentResults] = useState<RecentSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [boardData, resultData] = await Promise.all([getBoards(), getRecentSessions()]);
        setBoards(boardData);
        setRecentResults(resultData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      }
    }
    void load();
  }, []);

  const examDate = useMemo(() => getNextExamDate(), []);
  const countdown = useMemo(() => daysUntilExam(examDate), [examDate]);
  const recentBoards = boards.slice(0, 4);
  const topicCount = boards.filter((b) => b.board_type === "topic").length;
  const mixedCount = boards.filter((b) => b.board_type === "mixed").length;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={
          <Badge variant="accent">
            <Sparkles className="h-3.5 w-3.5" />
            Georgia Bar Study Mode
          </Badge>
        }
        title="Georgia Bar Jeopardy"
        description="Rule recall that doesn't feel like staring at another outline. Turn your subject outlines into fast, replayable game boards."
        actions={primaryActions.map(({ href, label, icon: Icon, variant }) => (
          <Button key={label} asChild size="lg" variant={variant}>
            <Link href={href}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </Button>
        ))}
        aside={
          <Card className="w-full min-w-[240px] border-border/70">
            <CardHeader className="mb-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Exam Countdown
              </span>
            </CardHeader>
            <CardContent>
              <p className="font-display text-5xl font-extrabold tabular-nums tracking-tight text-primary">
                {countdown}
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                days until{" "}
                {examDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
              </p>
            </CardContent>
          </Card>
        }
      />

      {error ? (
        <ErrorBanner
          message={error}
          hint="Make sure your backend is live, then refresh."
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Topic Boards" value={topicCount} icon={LayoutGrid} tone="primary" />
        <StatCard label="Mixed Boards" value={mixedCount} icon={Shuffle} tone="secondary" />
        <StatCard label="Sessions Played" value={recentResults.length} icon={Trophy} tone="accent" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Recent Boards
            </CardTitle>
            {recentBoards.length > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/boards">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentBoards.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title="No boards yet"
                description="Upload your outlines and generate your first study set to get playing."
                action={
                  <Button asChild size="sm">
                    <Link href="/upload">Go to Upload</Link>
                  </Button>
                }
              />
            ) : (
              recentBoards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{board.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{board.topics.join(" • ")}</p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/play/${board.id}`}>Play</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent-soft-foreground" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentResults.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No results yet"
                description="Play a board to start tracking scores and see your weak areas."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/boards">Browse Boards</Link>
                  </Button>
                }
              />
            ) : (
              recentResults.slice(0, 5).map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{result.board_title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-success">{result.correct_count} correct</span>
                      {" · "}
                      <span className="text-danger">{result.incorrect_count} wrong</span>
                      {" · "}
                      {result.skipped_count} skipped
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-extrabold tabular-nums text-primary">
                      {result.score}
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/results/${result.id}`}>
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
