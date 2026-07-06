"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, Clock3, Trophy } from "lucide-react";

import { getBoards, getRecentSessions } from "@/lib/api";
import type { BoardSummary, RecentSession } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getNextExamDate(now: Date = new Date()) {
  const thisYearExam = new Date(now.getFullYear(), 6, 28, 9, 0, 0, 0); // July is month index 6
  if (now.getTime() <= thisYearExam.getTime()) {
    return thisYearExam;
  }
  return new Date(now.getFullYear() + 1, 6, 28, 9, 0, 0, 0);
}

function daysUntilExam(examDate: Date) {
  const diff = examDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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

  const countdown = useMemo(() => daysUntilExam(getNextExamDate()), []);
  const recentBoards = boards.slice(0, 4);

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-100 via-cyan-50 to-amber-100">
        <CardHeader className="space-y-3">
          <Badge className="w-fit" variant="mixed">
            Georgia Bar Study Mode
          </Badge>
          <CardTitle className="text-4xl font-black md:text-5xl">Georgia Bar Jeopardy</CardTitle>
          <CardDescription className="max-w-2xl text-base text-slate-700">
            Rule recall that does not feel like staring at another outline.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Card className="border-blue-100 bg-white/90">
            <CardHeader>
              <CardDescription className="flex items-center gap-2 text-slate-600">
                <Clock3 className="h-4 w-4" />
                Countdown
              </CardDescription>
              <CardTitle className="text-3xl">{countdown} days</CardTitle>
            </CardHeader>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link href="/upload">Upload PDFs</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/upload">Generate Study Set</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/boards?type=topic">Play Topic Board</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/boards?type=mixed">Play Mixed Board</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-5 text-rose-700">
            {error} Make sure your backend is live, then refresh.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-300" />
              Recent Boards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBoards.length === 0 ? (
              <EmptyState
                icon={BrainCircuit}
                title="No boards yet"
                description="Upload materials and generate your first study set."
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
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{board.title}</p>
                    <p className="text-xs text-slate-500">{board.topics.join(" | ")}</p>
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
              <Trophy className="h-5 w-5 text-amber-300" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentResults.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No results yet"
                description="Play a board to start tracking scores and weak areas."
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
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{result.board_title}</p>
                    <p className="text-xs text-slate-500">
                      {result.correct_count}C / {result.incorrect_count}I / {result.skipped_count}S
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-700">{result.score}</span>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/results/${result.id}`}>
                        View <ArrowRight className="ml-1 h-3 w-3" />
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
