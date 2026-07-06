"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";

import {
  generateFullStudySet,
  processDefaultMaterials,
  uploadMaterials,
} from "@/lib/api";
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
  "Saving games",
];

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognized = useMemo(
    () =>
      files
        .map((file) => ({ file: file.name, subject: expectedSubjects[file.name] }))
        .filter((item) => Boolean(item.subject)),
    [files],
  );

  function handleFileInput(nextFiles: FileList | null) {
    if (!nextFiles) return;
    setFiles(Array.from(nextFiles));
    setError(null);
    setMessage(null);
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Select your PDFs first.");
      return;
    }
    setRunning(true);
    setError(null);
    setMessage(null);
    setStep(1);
    try {
      await uploadMaterials(files);
      setMessage("Upload complete. You can now process and generate boards.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleProcessDefaults() {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      setStep(2);
      const response = await processDefaultMaterials();
      if (response.missing_files.length > 0) {
        setMessage(
          `Processed available files. Missing: ${response.missing_files.join(", ")}.`,
        );
      } else {
        setMessage(`Processed ${response.processed.length} subject files.`);
      }
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Process step failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleGenerateFull() {
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      setStep(2);
      try {
        await processDefaultMaterials();
      } catch (processError) {
        const detail =
          processError instanceof Error ? processError.message : "Process defaults unavailable.";
        // In cloud deploys, default Docs folder may not exist. Continue with uploaded materials.
        if (!detail.toLowerCase().includes("upload pdfs first")) {
          setMessage("Skipping default docs scan. Generating from uploaded materials.");
        }
      }
      setStep(3);
      await new Promise((resolve) => setTimeout(resolve, 250));
      setStep(4);
      await generateFullStudySet();
      setStep(5);
      setMessage("Full study set generated. Redirecting to boards...");
      setTimeout(() => router.push("/boards"), 550);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generation failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-indigo-900/70 via-slate-900 to-cyan-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl">
            <UploadCloud className="h-8 w-8 text-cyan-300" />
            Upload Study Materials
          </CardTitle>
          <CardDescription className="text-slate-200">
            Upload the 7 Georgia bar subject PDFs, process text, and generate topic + mixed boards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/40 bg-slate-900/60 p-8 text-center">
            <input
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(event) => handleFileInput(event.target.files)}
            />
            <p className="font-semibold text-cyan-100">Click to select files</p>
            <p className="text-sm text-slate-300">PDFs recommended (DOCX optional).</p>
          </label>

          <div className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-slate-200">Recognized subjects:</p>
            {recognized.length === 0 ? (
              <p className="text-sm text-slate-400">No expected filenames detected yet.</p>
            ) : (
              recognized.map((item) => (
                <p key={item.file} className="text-sm text-slate-200">
                  {item.file}
                  {" -> "}
                  {item.subject}
                </p>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={running} onClick={handleUpload}>
              {running && step === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload PDFs
            </Button>
            <Button disabled={running} variant="outline" onClick={handleProcessDefaults}>
              Process PDFs
            </Button>
            <Button disabled={running} variant="outline" onClick={handleGenerateFull}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Full Study Set
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
          <div className="grid gap-1">
            {stepLabels.map((label, index) => (
              <p
                key={label}
                className={index < step ? "text-sm text-cyan-200" : "text-sm text-slate-400"}
              >
                {index + 1}. {label}
              </p>
            ))}
          </div>
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
