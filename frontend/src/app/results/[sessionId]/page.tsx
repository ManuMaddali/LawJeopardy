"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, RefreshCcw } from "lucide-react";

import { getSessionResults, missedCsvUrl } from "@/lib/api";
import type { SessionResults } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
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
        const payload = await getSessionResults(sessionId);
        setResults(payload);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" />
        <p className="text-sm text-slate-600">Crunching your results...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <EmptyState
        title="Could not load results"
        description={error ?? "Results unavailable."}
        action={
          <Button asChild variant="outline">
            <Link href="/boards">Go to Boards</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-100 via-cyan-50 to-blue-100">
        <CardHeader>
          <CardTitle className="text-3xl">{results.board_title} Results</CardTitle>
          <CardDescription className="text-slate-700">
            Final score: {results.session.score} | Accuracy: {accuracy}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Card className="border-emerald-200 bg-white">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-500">Correct</p>
              <p className="text-3xl font-black text-emerald-700">{results.session.correct_count}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-white">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-500">Incorrect</p>
              <p className="text-3xl font-black text-rose-700">{results.session.incorrect_count}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-white">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-500">Skipped</p>
              <p className="text-3xl font-black text-amber-700">{results.session.skipped_count}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-white">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-500">Total</p>
              <p className="text-3xl font-black text-blue-700">{results.session.total_questions}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weakest Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.weakest_topics.length === 0 ? (
              <EmptyState
                title="No weak spots this round"
                description="You did not miss anything here. Keep that momentum."
                className="py-4"
              />
            ) : (
              results.weakest_topics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p>{topic.topic}</p>
                  <p className="font-semibold text-amber-700">{topic.missed} missed</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rule Summaries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.rule_summaries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No missed rules to summarize. Your explanations list is clean.
              </p>
            ) : (
              results.rule_summaries.map((summary, idx) => (
                <p key={summary} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  {idx + 1}. {summary}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Missed Questions</CardTitle>
          <CardDescription>Review misses, replay, and export as CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.missed_questions.length === 0 ? (
            <EmptyState
              title="Perfect run"
              description="No missed or skipped questions this session."
              className="py-5"
            />
          ) : (
            results.missed_questions.map((question) => (
              <Card key={question.id} className="border-slate-200 bg-slate-50">
                <CardContent className="space-y-2 pt-4 text-sm">
                  <p className="font-semibold text-blue-700">
                    [{question.topic}] {question.category} | ${question.points}
                  </p>
                  <p className="text-slate-800">{question.clue}</p>
                  <p>
                    <span className="font-semibold text-emerald-700">Answer:</span> {question.answer}
                  </p>
                  <p className="text-slate-600">{question.explanation}</p>
                </CardContent>
              </Card>
            ))
          )}

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={missedCsvUrl(sessionId)} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Export Missed CSV
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/play/${results.session.board_id}`}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Replay Missed Questions
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
