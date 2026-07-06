import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  variant?: "brand" | "success";
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  variant = "brand",
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "animate-in-up relative overflow-hidden rounded-3xl border border-border p-6 md:p-8",
        variant === "success" ? "hero-gradient-success" : "hero-gradient",
        className,
      )}
    >
      {/* Decorative dotted texture, kept subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1.4px, transparent 1.4px)",
          backgroundSize: "14px 14px",
          color: "var(--foreground)",
        }}
      />
      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div className="space-y-4">
          {eyebrow ? <div>{eyebrow}</div> : null}
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance text-foreground md:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
        </div>
        {aside ? <div className="lg:justify-self-end">{aside}</div> : null}
      </div>
    </section>
  );
}
