import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
