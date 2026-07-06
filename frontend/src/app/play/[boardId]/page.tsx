"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  Eye,
  Flag,
  Loader2,
  SkipForward,
  Sparkles,
} from "lucide-react";

import { answerSessionQuestion, finishSession, getBoard, startSession } from "@/lib/api";
import type { Board, Question, SelectedResult, StudySession } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JeopardyTile } from "@/components/jeopardy-tile";
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
    for (const category of board.categories) groups[category] = {};
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
        setTimeout(() => setShowCelebration(false), 1100);
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up your board...</p>
      </div>
    );
  }

  if (error || !board || !session) {
    return (
      <EmptyState
        title="Could not open this board"
        description={error ?? "This board is unavailable right now."}
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
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push("/boards")}>
        <ArrowLeft className="h-4 w-4" />
        Boards
      </Button>

      {/* Sticky score + progress bar */}
      <Card className="sticky top-20 z-30 hero-gradient border-border/70">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                {board.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {answeredCount} of {totalQuestions} clues answered
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</p>
                <p className="font-display text-3xl font-extrabold tabular-nums text-primary">
                  {session.score}
                </p>
              </div>
              <Button variant="outline" onClick={finishAndViewResults} disabled={isFinishing}>
                {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Finish
              </Button>
            </div>
          </div>
          <Progress value={progress} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            <span className="text-success">{session.correct_count} correct</span>
            <span className="text-danger">{session.incorrect_count} incorrect</span>
            <span className="text-muted-foreground">{session.skipped_count} skipped</span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[820px] gap-3"
          style={{ gridTemplateColumns: `repeat(${board.categories.length}, minmax(0, 1fr))` }}
        >
          {board.categories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex min-h-16 items-center justify-center rounded-xl bg-primary px-3 py-3 text-center font-display text-sm font-bold uppercase leading-tight tracking-wide text-primary-foreground shadow-sm">
                {category}
              </div>
              {pointValues.map((points) => {
                const question = groupedQuestions[category]?.[points];
                return (
                  <JeopardyTile
                    key={`${category}-${points}`}
                    points={points}
                    missing={!question}
                    used={Boolean(question && answeredIds.has(question.id))}
                    onSelect={() => {
                      if (question) {
                        setSelectedQuestion(question);
                        setAnswerVisible(false);
                      }
                    }}
                  />
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
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-soft-foreground">
                    {selectedQuestion.category}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold tabular-nums text-accent-soft-foreground">
                    ${selectedQuestion.points}
                  </span>
                </div>
                <DialogTitle className="sr-only">
                  {selectedQuestion.category} clue for ${selectedQuestion.points}
                </DialogTitle>
                <DialogDescription>Read the clue, make your call, then reveal the answer.</DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-primary/15 bg-primary-soft/60 p-5">
                <p className="text-lg font-semibold leading-relaxed text-foreground text-pretty">
                  {selectedQuestion.clue}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!answerVisible ? (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button className="w-full" onClick={() => setAnswerVisible(true)}>
                      <Eye className="h-4 w-4" />
                      Show Answer
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 rounded-2xl border border-success/25 bg-success-soft p-5 text-sm leading-relaxed"
                  >
                    <p className="text-base">
                      <span className="font-bold text-success-soft-foreground">Answer: </span>
                      <span className="text-foreground">{selectedQuestion.answer}</span>
                    </p>
                    <p className="text-foreground/90">
                      <span className="font-semibold text-success-soft-foreground">Why: </span>
                      {selectedQuestion.explanation}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {selectedQuestion.topic} · {selectedQuestion.source_hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button variant="success" onClick={() => void submitResult("correct")} disabled={!answerVisible}>
                  <CheckCircle2 className="h-4 w-4" />
                  Correct
                </Button>
                <Button variant="danger" onClick={() => void submitResult("incorrect")} disabled={!answerVisible}>
                  <CircleX className="h-4 w-4" />
                  Incorrect
                </Button>
                <Button variant="warning" onClick={() => void submitResult("skipped")} disabled={!answerVisible}>
                  <SkipForward className="h-4 w-4" />
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
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/25 bg-success-soft px-5 py-2.5 font-semibold text-success-soft-foreground shadow-xl"
          >
            <Sparkles className="h-4 w-4" />
            Nice hit!
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
