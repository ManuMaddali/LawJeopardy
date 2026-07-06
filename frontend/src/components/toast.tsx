"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastTone = "success" | "info";

type ToastProps = {
  open: boolean;
  message: string;
  tone?: ToastTone;
  onClose?: () => void;
};

export function Toast({ open, message, tone = "success", onClose }: ToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : Info;
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
            tone === "success"
              ? "border-success/25 bg-success-soft text-success-soft-foreground"
              : "border-primary/25 bg-primary-soft text-primary-soft-foreground",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{message}</p>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-lg p-1 opacity-70 outline-none transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
