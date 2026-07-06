import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

type ErrorBannerProps = {
  message: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorBanner({ message, hint, action, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-4 text-danger-soft-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{message}</p>
          {hint ? <p className="mt-0.5 text-sm opacity-80">{hint}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
