"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import {
  getBoards,
  generateMixedBoards,
  generateTopicBoards,
  processDefaultMaterials,
  uploadMaterials,
} from "@/lib/api";
import type { BoardSummary } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { PageHero } from "@/components/page-hero";
import { ProgressTimeline, type TimelineStep } from "@/components/progress-timeline";
import { Toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const expectedSubjects: Record<string, string> = {
  "Torts.pdf": "Torts",
  "Real-Property.pdf": "Real Property",
  "Evidence.pdf": "Evidence",
  "Criminal-Law-and-Procedure.pdf": "Criminal Law & Procedure",
  "Contracts-and-Sales.pdf": "Contracts & Sales",
  "Constitutional-Law.pdf": "Constitutional Law",
  "Civil-Procedure.pdf": "Civil Procedure",
};

const timelineSteps: TimelineStep[] = [
  { label: "Uploading", description: "Sending your PDFs securely" },
  { label: "Extracting PDF text", description: "Reading and indexing each subject" },
  { label: "Creating topic boards", description: "One board per subject" },
  { label: "Creating mixed boards", description: "Cross-subject challenge sets" },
  { label: "Done", description: "Boards ready to play" },
];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const recognized = useMemo(
    () =>
      files
        .map((file) => ({ file: file.name, subject: expectedSubjects[file.name] }))
        .filter((item) => Boolean(item.subject)),
    [files],
  );

  function getBoardTypeCounts(boards: BoardSummary[]) {
    return boards.reduce(
      (acc, board) => {
        if (board.board_type === "topic") acc.topic += 1;
        if (board.board_type === "mixed") acc.mixed += 1;
        return acc;
      },
      { topic: 0, mixed: 0 },
    );
  }

  async function prepareMaterials(inputFiles?: File[]): Promise<boolean> {
    const selectedFiles = inputFiles ?? files;
    setRunning(true);
    setError(null);
    setMessage(null);
    setCompleted(false);

    try {
      if (selectedFiles.length > 0) {
        setStep(1);
        setMessage("Uploading selected PDFs...");
        await uploadMaterials(selectedFiles);
      }

      setStep(2);
      setMessage("Extracting and indexing materials...");
      const response = await processDefaultMaterials();
      setPrepared(true);

      if (response.missing_files.length > 0) {
        setMessage(
          `Materials ready from uploaded files. Missing default docs: ${response.missing_files.join(", ")}.`,
        );
      } else {
        setMessage(`Materials ready. Processed ${response.processed.length} subject files.`);
      }
      return true;
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "Preparation failed.");
      setPrepared(false);
      return false;
    } finally {
      setRunning(false);
    }
  }

  function handleFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) return;
    setFiles(nextFiles);
    setError(null);
    setMessage(null);
    setPrepared(false);
    setCompleted(false);
    void prepareMaterials(nextFiles);
  }

  async function handleGenerateFull() {
    if (running) return;
    setError(null);
    setMessage(null);
    setCompleted(false);

    try {
      if (!prepared) {
        const prepSucceeded = await prepareMaterials();
        if (!prepSucceeded) return;
      }

      setRunning(true);

      setStep(3);
      setMessage("Creating topic boards...");
      try {
        await generateTopicBoards();
      } catch (topicError) {
        const boards = await getBoards();
        if (getBoardTypeCounts(boards).topic < 7) throw topicError;
        setMessage("Topic board generation finished server-side. Continuing...");
      }

      setStep(4);
      setMessage("Creating mixed boards...");
      try {
        await generateMixedBoards();
      } catch (mixedError) {
        const boards = await getBoards();
        if (getBoardTypeCounts(boards).mixed < 4) throw mixedError;
        setMessage("Mixed board generation finished server-side.");
      }

      setStep(5);
      setCompleted(true);
      setMessage("Study set generated successfully. Ready to play.");
      setToastOpen(true);
      window.setTimeout(() => setToastOpen(false), 4000);
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : "Generation failed. Please retry.",
      );
    } finally {
      setRunning(false);
    }
  }

  const currentStep = completed ? timelineSteps.length : Math.max(0, step - 1);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={
          <Badge variant="accent">
            <UploadCloud className="h-3.5 w-3.5" />
            Step 1 · Build your set
          </Badge>
        }
        title="Build your study set"
        description="Pick your subject PDFs once. Upload and processing start automatically, then generate every board in a single click."
      />

      {error ? (
        <ErrorBanner
          message={error}
          hint="If this keeps happening, refresh and retry from this page."
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDFs</CardTitle>
              <CardDescription>Drag and drop your files, or browse to select them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(Array.from(e.dataTransfer.files));
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  dragging
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted",
                )}
              >
                <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <UploadCloud className="h-7 w-7" />
                </span>
                <p className="font-display text-base font-bold text-foreground">
                  Drop PDFs here or click to browse
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDFs recommended (DOCX optional). Upload and processing run automatically.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
                />
              </button>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Recognized subjects</p>
                {recognized.length === 0 ? (
                  <EmptyState
                    title="No files selected yet"
                    description="Choose your subject PDFs to auto-detect and process them."
                    className="py-5"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recognized.map((item) => (
                      <span
                        key={item.file}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-soft-foreground"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {item.subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={running} variant="outline" onClick={() => void prepareMaterials()}>
                  {running && step <= 2 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Re-run Upload + Process
                </Button>
                <Button disabled={running} onClick={handleGenerateFull}>
                  {running && step >= 3 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {running && step >= 3 ? "Generating..." : "Generate Full Study Set"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-24 lg:self-start">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Upload, process, generate, and save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressTimeline steps={timelineSteps} currentStep={currentStep} error={Boolean(error)} />

            {completed ? (
              <div className="space-y-3 rounded-2xl border border-success/25 bg-success-soft p-4">
                <div className="flex items-center gap-2 font-semibold text-success-soft-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  Generation complete
                </div>
                <p className="text-sm text-success-soft-foreground/90">
                  Your boards are ready. Jump in and start playing.
                </p>
                <Button className="w-full" onClick={() => router.push("/boards")}>
                  View Boards
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : message && !error ? (
              <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Toast open={toastOpen} message="Study set generated. Ready to play." onClose={() => setToastOpen(false)} />
    </div>
  );
}
