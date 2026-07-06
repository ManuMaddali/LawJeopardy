import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatTone = "primary" | "secondary" | "accent" | "success" | "danger" | "neutral";

const toneStyles: Record<StatTone, { chip: string; value: string }> = {
  primary: { chip: "bg-primary-soft text-primary-soft-foreground", value: "text-primary" },
  secondary: {
    chip: "bg-secondary-soft text-secondary-soft-foreground",
    value: "text-secondary",
  },
  accent: { chip: "bg-accent-soft text-accent-soft-foreground", value: "text-accent-soft-foreground" },
  success: { chip: "bg-success-soft text-success-soft-foreground", value: "text-success" },
  danger: { chip: "bg-danger-soft text-danger-soft-foreground", value: "text-danger" },
  neutral: { chip: "bg-muted text-muted-foreground", value: "text-foreground" },
};

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
};

export function StatCard({ label, value, hint, icon: Icon, tone = "primary", className }: StatCardProps) {
  const styles = toneStyles[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.4)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", styles.chip)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 font-display text-3xl font-extrabold tabular-nums tracking-tight md:text-4xl", styles.value)}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
