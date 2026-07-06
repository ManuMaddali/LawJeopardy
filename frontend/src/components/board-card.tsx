"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Download, Play, RotateCcw, Sparkles } from "lucide-react";

import { boardExportUrl } from "@/lib/api";
import type { BoardSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BoardCardProps = {
  board: BoardSummary;
  resetting?: boolean;
  onReset: (board: BoardSummary) => void;
};

export function BoardCard({ board, resetting = false, onReset }: BoardCardProps) {
  const isMixed = board.board_type === "mixed";
  const played = board.played_sessions_count > 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-[0_12px_34px_-24px_rgba(15,23,42,0.5)]"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span
            className={
              isMixed
                ? "inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-soft text-secondary-soft-foreground"
                : "inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground"
            }
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge variant={isMixed ? "mixed" : "topic"}>{isMixed ? "Mixed" : "Topic"}</Badge>
            {played ? <Badge variant="played">Played {board.played_sessions_count}x</Badge> : null}
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold leading-snug tracking-tight text-foreground text-balance">
            {board.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {board.topics.join(" • ")}
          </p>
        </div>

        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date(board.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <Button asChild className="w-full">
          <Link href={`/play/${board.id}`}>
            <Play className="h-4 w-4" />
            Play Board
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={boardExportUrl(board.id)} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Export
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={resetting}
            onClick={() => onReset(board)}
          >
            <RotateCcw className="h-4 w-4" />
            {resetting ? "Resetting" : "Reset"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
