"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleX, Eye, Flag, Loader2, Sparkles } from "lucide-react";

import {
  answerSessionQuestion,
  finishSession,
  getBoard,
  startSession,
} from "@/lib/api";
import type { Board, Question, SelectedResult, StudySession } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const pointValues = [100, 200, 300, 400, 500];

export default function PlayBoardPage() {
  const params = useParams<{ boardId: string }>();
  const router = useRouter();
  const boardId = params.boardId;

  const [board, setBoard] = useState<Board | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    async function load() {
      try {
        const boardData = await getBoard(boardId);
        const sessionData = await startSession(boardId);
        setBoard(boardData);
        setSession(sessionData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to start board.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [boardId]);

  const totalQuestions = board?.questions.length ?? 0;
  const answeredCount = answeredIds.size;
  const progress = totalQuestions === 0 ? 0 : (answeredCount / totalQuestions) * 100;

  const groupedQuestions = useMemo(() => {
    if (!board) return {};
    const groups: Record<string, Record<number, Question>> = {};
    for (const category of board.categories) {
      groups[category] = {};
    }
    for (const question of board.questions) {
      if (!groups[question.category]) groups[question.category] = {};
      groups[question.category][question.points] = question;
    }
    return groups;
  }, [board]);

  async function submitResult(result: SelectedResult) {
    if (!selectedQuestion || !session) return;
    try {
      const nextSession = await answerSessionQuestion(session.id, selectedQuestion.id, result);
      const nextAnsweredCount = answeredIds.size + 1;
      setSession(nextSession);
      setAnsweredIds((prev) => new Set([...prev, selectedQuestion.id]));
      if (result === "correct") {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 900);
      }
      setSelectedQuestion(null);
      setAnswerVisible(false);
      if (totalQuestions > 0 && nextAnsweredCount >= totalQuestions) {
        await finishAndViewResults();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit answer.");
    }
  }

  async function finishAndViewResults() {
    if (!session || isFinishing) return;
    setIsFinishing(true);
    try {
      const doneSession = await finishSession(session.id);
      router.push(`/results/${doneSession.id}`);
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Could not finish session.");
      setIsFinishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" />
        <p className="text-sm text-slate-600">Setting up your board...</p>
      </div>
    );
  }

  if (error || !board || !session) {
    return (
      <EmptyState
        title="Could not open this board"
        description={error ?? "Board unavailable."}
        action={
          <Button variant="outline" onClick={() => router.push("/boards")}>
            Back to Boards
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-100 via-cyan-50 to-amber-100">
        <CardHeader>
          <CardTitle className="text-3xl">{board.title}</CardTitle>
          <CardDescription className="text-slate-700">
            Score {session.score} | {answeredCount}/{totalQuestions} answered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={finishAndViewResults} disabled={isFinishing}>
              {isFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
              Finish Session
            </Button>
            <p className="text-sm text-slate-600">
              Correct {session.correct_count} | Incorrect {session.incorrect_count} | Skipped{" "}
              {session.skipped_count}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[880px] gap-3"
          style={{ gridTemplateColumns: `repeat(${board.categories.length}, minmax(0, 1fr))` }}
        >
          {board.categories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-4 text-center font-bold text-white">
                {category}
              </div>
              {pointValues.map((points) => {
                const question = groupedQuestions[category]?.[points];
                const disabled = !question || answeredIds.has(question.id);
                return (
                  <motion.button
                    key={`${category}-${points}`}
                    whileHover={!disabled ? { scale: 1.03 } : undefined}
                    whileTap={!disabled ? { scale: 0.98 } : undefined}
                    disabled={disabled}
                    onClick={() => {
                      if (question) {
                        setSelectedQuestion(question);
                        setAnswerVisible(false);
                      }
                    }}
                    className="flex h-20 w-full items-center justify-center rounded-xl border border-blue-200 bg-white text-2xl font-black text-blue-700 shadow-md transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ${points}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={Boolean(selectedQuestion)}
        onOpenChange={(open: boolean) => !open && setSelectedQuestion(null)}
      >
        <DialogContent>
          {selectedQuestion ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>
                  {selectedQuestion.category} | ${selectedQuestion.points}
                </DialogTitle>
                <DialogDescription>
                  Read the clue, make your call, then reveal the answer.
                </DialogDescription>
              </DialogHeader>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 text-base leading-relaxed text-slate-800">
                  {selectedQuestion.clue}
                </CardContent>
              </Card>

              {!answerVisible ? (
                <Button onClick={() => setAnswerVisible(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Show Answer
                </Button>
              ) : (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <p>
                      <span className="font-semibold text-emerald-700">Answer:</span>{" "}
                      {selectedQuestion.answer}
                    </p>
                    <p>
                      <span className="font-semibold text-emerald-700">Explanation:</span>{" "}
                      {selectedQuestion.explanation}
                    </p>
                    <p className="text-slate-600">
                      Topic: {selectedQuestion.topic} | {selectedQuestion.source_hint}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="success" onClick={() => void submitResult("correct")} disabled={!answerVisible}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Correct
                </Button>
                <Button variant="danger" onClick={() => void submitResult("incorrect")} disabled={!answerVisible}>
                  <CircleX className="mr-2 h-4 w-4" />
                  Incorrect
                </Button>
                <Button variant="warning" onClick={() => void submitResult("skipped")} disabled={!answerVisible}>
                  Skip
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showCelebration ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-4 py-2 text-emerald-800 shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            Nice hit.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
