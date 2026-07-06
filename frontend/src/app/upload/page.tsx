"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, UploadCloud } from "lucide-react";

import {
  getBoards,
  generateMixedBoards,
  generateTopicBoards,
  processDefaultMaterials,
  uploadMaterials,
} from "@/lib/api";
import type { BoardSummary } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const expectedSubjects: Record<string, string> = {
  "Torts.pdf": "Torts",
  "Real-Property.pdf": "Real Property",
  "Evidence.pdf": "Evidence",
  "Criminal-Law-and-Procedure.pdf": "Criminal Law & Procedure",
  "Contracts-and-Sales.pdf": "Contracts & Sales",
  "Constitutional-Law.pdf": "Constitutional Law",
  "Civil-Procedure.pdf": "Civil Procedure",
};

const stepLabels = [
  "Uploading",
  "Extracting PDF text",
  "Creating topic boards",
  "Creating mixed boards",
  "Done",
];

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognized = useMemo(
    () =>
      files
        .map((file) => ({ file: file.name, subject: expectedSubjects[file.name] }))
        .filter((item) => Boolean(item.subject)),
    [files],
  );
  const currentStepLabel =
    step > 0 ? stepLabels[Math.min(step - 1, stepLabels.length - 1)] : null;

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

  function handleFileInput(nextFiles: FileList | null) {
    if (!nextFiles) return;
    const pickedFiles = Array.from(nextFiles);
    setFiles(pickedFiles);
    setError(null);
    setMessage(null);
    setPrepared(false);
    setCompleted(false);
    void prepareMaterials(pickedFiles);
  }

  async function handleGenerateFull() {
    if (running) return;

    setError(null);
    setMessage(null);
    setCompleted(false);

    try {
      if (!prepared) {
        const prepSucceeded = await prepareMaterials();
        if (!prepSucceeded) {
          return;
        }
      }

      setRunning(true);

      setStep(3);
      setMessage("Creating topic boards...");
      try {
        await generateTopicBoards();
      } catch (topicError) {
        const boards = await getBoards();
        const counts = getBoardTypeCounts(boards);
        if (counts.topic < 7) {
          throw topicError;
        }
        setMessage("Topic board generation finished server-side. Continuing...");
      }

      setStep(4);
      setMessage("Creating mixed boards...");
      try {
        await generateMixedBoards();
      } catch (mixedError) {
        const boards = await getBoards();
        const counts = getBoardTypeCounts(boards);
        if (counts.mixed < 4) {
          throw mixedError;
        }
        setMessage("Mixed board generation finished server-side.");
      }

      setStep(5);
      setCompleted(true);
      setMessage("Study set generated successfully. Ready to play.");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generation failed. Please retry.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-100 via-cyan-50 to-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <UploadCloud className="h-8 w-8 text-cyan-700" />
            Build Your Study Set
          </CardTitle>
          <CardDescription className="text-slate-700">
            Pick files once. Upload and processing start automatically, then generate boards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300 bg-white/90 p-8 text-center">
            <input
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(event) => handleFileInput(event.target.files)}
            />
            <p className="font-semibold text-cyan-800">Click to select files</p>
            <p className="text-sm text-slate-600">
              PDFs recommended (DOCX optional). Upload and processing run automatically after selection.
            </p>
          </label>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white/90 p-4">
            <p className="text-sm font-semibold text-slate-700">Recognized subjects:</p>
            {recognized.length === 0 ? (
              <EmptyState
                title="No files selected yet"
                description="Choose your 7 PDFs to auto-upload and process."
                className="py-4"
              />
            ) : (
              recognized.map((item) => (
                <p key={item.file} className="text-sm text-slate-700">
                  {item.file}
                  {" -> "}
                  {item.subject}
                </p>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={running} variant="outline" onClick={() => void prepareMaterials()}>
              {running && step <= 2 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Re-run Upload + Process
            </Button>
            <Button disabled={running} onClick={handleGenerateFull}>
              <Sparkles className="mr-2 h-4 w-4" />
              {running && step >= 3 ? "Generating..." : "Generate Full Study Set"}
            </Button>
            <Button variant="outline" disabled={!completed} onClick={() => router.push("/boards")}>
              View Boards
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Upload | process | generate | save</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(step / stepLabels.length) * 100} />
          {running && currentStepLabel ? (
            <p className="text-sm font-semibold text-cyan-700">Working on: {currentStepLabel}</p>
          ) : null}
          <div className="grid gap-1">
            {stepLabels.map((label, index) => (
              <p
                key={label}
                className={index < step ? "text-sm text-cyan-700" : "text-sm text-slate-500"}
              >
                {index + 1}. {label}
              </p>
            ))}
          </div>
          {completed ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Generation complete. You can play now.
            </div>
          ) : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? (
            <p className="text-sm text-rose-700">
              {error} If this keeps happening, refresh and retry from this page.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
