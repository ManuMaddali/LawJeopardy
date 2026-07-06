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

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/60 px-5 py-8 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-border">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <p className="font-display text-base font-bold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
