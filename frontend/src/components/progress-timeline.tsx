"use client";

import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimelineStatus = "complete" | "active" | "upcoming" | "error";

export type TimelineStep = {
  label: string;
  description?: string;
};

type ProgressTimelineProps = {
  steps: TimelineStep[];
  /** Number of fully completed steps. The step at this index is treated as active. */
  currentStep: number;
  error?: boolean;
  className?: string;
};

function statusFor(index: number, currentStep: number, error: boolean): TimelineStatus {
  if (index < currentStep) return "complete";
  if (index === currentStep) return error ? "error" : "active";
  return "upcoming";
}

export function ProgressTimeline({ steps, currentStep, error = false, className }: ProgressTimelineProps) {
  return (
    <ol className={cn("space-y-1", className)}>
      {steps.map((step, index) => {
        const status = statusFor(index, currentStep, error);
        const isLast = index === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  status === "complete" && "border-success bg-success text-success-foreground",
                  status === "active" && "border-primary bg-primary-soft text-primary-soft-foreground",
                  status === "error" && "border-danger bg-danger-soft text-danger-soft-foreground",
                  status === "upcoming" && "border-border bg-card text-muted-foreground",
                )}
              >
                {status === "complete" ? (
                  <Check className="h-4 w-4" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    "my-1 w-0.5 flex-1 rounded-full transition-colors",
                    index < currentStep ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  status === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </p>
              {step.description ? (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
