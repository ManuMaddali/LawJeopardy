"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type JeopardyTileProps = {
  points: number;
  used?: boolean;
  missing?: boolean;
  onSelect?: () => void;
};

export function JeopardyTile({ points, used = false, missing = false, onSelect }: JeopardyTileProps) {
  const disabled = used || missing;

  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { scale: 1.04 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      disabled={disabled}
      onClick={onSelect}
      aria-label={used ? `$${points} answered` : `Open $${points} clue`}
      className={cn(
        "relative flex h-20 w-full items-center justify-center rounded-xl font-display text-2xl font-extrabold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-3xl",
        used
          ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
          : missing
            ? "cursor-not-allowed border border-dashed border-border bg-card/60 text-muted-foreground opacity-50"
            : "tile-face border border-primary/20 text-primary-foreground shadow-md hover:shadow-lg",
      )}
    >
      {used ? (
        <span className="inline-flex items-center gap-1.5 text-base font-bold">
          <Check className="h-4 w-4" />
          Done
        </span>
      ) : (
        `$${points}`
      )}
    </motion.button>
  );
}
