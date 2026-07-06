"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, RefreshCcw } from "lucide-react";

import { getSessionResults, missedCsvUrl } from "@/lib/api";
import type { SessionResults } from "@/lib/types";
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <Card className="border-rose-300/30 bg-rose-900/20">
        <CardContent className="pt-5 text-rose-200">{error ?? "Results unavailable."}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-900/50 via-slate-900 to-indigo-900/60">
        <CardHeader>
          <CardTitle className="text-3xl">{results.board_title} Results</CardTitle>
          <CardDescription className="text-slate-200">
            Final score: {results.session.score} | Accuracy: {accuracy}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Card className="border-white/10 bg-white/10">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-300">Correct</p>
              <p className="text-3xl font-black text-emerald-200">{results.session.correct_count}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/10">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-300">Incorrect</p>
              <p className="text-3xl font-black text-rose-200">{results.session.incorrect_count}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/10">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-300">Skipped</p>
              <p className="text-3xl font-black text-amber-200">{results.session.skipped_count}</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/10">
            <CardContent className="pt-4 text-center">
              <p className="text-xs uppercase text-slate-300">Total</p>
              <p className="text-3xl font-black text-cyan-200">{results.session.total_questions}</p>
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
              <p className="text-sm text-slate-300">No misses this round. Nice work.</p>
            ) : (
              results.weakest_topics.map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2"
                >
                  <p>{topic.topic}</p>
                  <p className="font-semibold text-amber-200">{topic.missed} missed</p>
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
              <p className="text-sm text-slate-300">No missed rules to summarize.</p>
            ) : (
              results.rule_summaries.map((summary, idx) => (
                <p key={summary} className="rounded-lg border border-white/10 bg-slate-800/70 p-3 text-sm">
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
            <p className="text-sm text-slate-300">No missed or skipped questions.</p>
          ) : (
            results.missed_questions.map((question) => (
              <Card key={question.id} className="border-white/10 bg-slate-800/70">
                <CardContent className="space-y-2 pt-4 text-sm">
                  <p className="font-semibold text-cyan-100">
                    [{question.topic}] {question.category} | ${question.points}
                  </p>
                  <p className="text-slate-100">{question.clue}</p>
                  <p>
                    <span className="font-semibold text-emerald-200">Answer:</span> {question.answer}
                  </p>
                  <p className="text-slate-300">{question.explanation}</p>
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
