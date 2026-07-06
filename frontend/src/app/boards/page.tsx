"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, LayoutGrid, RotateCcw, Shuffle } from "lucide-react";

import { getBoards, resetBoard, resetBoardsByType } from "@/lib/api";
import type { BoardSummary } from "@/lib/types";
import { BoardCard } from "@/components/board-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { PageHero } from "@/components/page-hero";
import { Toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TypeFilter = "all" | "topic" | "mixed";
type PlayFilter = "all" | "played" | "not-played";

type PendingReset =
  | { kind: "board"; board: BoardSummary }
  | { kind: "type"; boardType: "topic" | "mixed" }
  | null;

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [playFilter, setPlayFilter] = useState<PlayFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<PendingReset>(null);
  const [resetting, setResetting] = useState(false);
  const [resettingBoardId, setResettingBoardId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "topic" || type === "mixed") {
      const timer = window.setTimeout(() => setTypeFilter(type), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      setBoards(await getBoards());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load boards right now.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBoards(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBoards]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  async function confirmReset() {
    if (!pendingReset) return;
    setError(null);
    setResetting(true);

    try {
      if (pendingReset.kind === "board") {
        const { board } = pendingReset;
        setResettingBoardId(board.id);
        const result = await resetBoard(board.id);
        showToast(`Reset "${board.title}". Removed ${result.deleted_sessions} session(s).`);
      } else {
        const { boardType } = pendingReset;
        const result = await resetBoardsByType(boardType);
        showToast(
          `Reset ${result.boards_affected} ${boardType} board(s). Removed ${result.deleted_sessions} session(s).`,
        );
      }
      await loadBoards();
      setPendingReset(null);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not complete the reset.");
    } finally {
      setResetting(false);
      setResettingBoardId(null);
    }
  }

  const filteredBoards = useMemo(() => {
    return boards.filter((board) => {
      if (typeFilter !== "all" && board.board_type !== typeFilter) return false;
      if (playFilter === "played" && board.played_sessions_count < 1) return false;
      if (playFilter === "not-played" && board.played_sessions_count > 0) return false;
      return true;
    });
  }, [boards, playFilter, typeFilter]);

  const confirmCopy = useMemo(() => {
    if (!pendingReset) return { title: "", description: "" };
    if (pendingReset.kind === "board") {
      return {
        title: "Reset this board?",
        description: `This clears all play history for "${pendingReset.board.title}". Your questions stay intact.`,
      };
    }
    return {
      title: `Reset all ${pendingReset.boardType} boards?`,
      description: `This clears play history for every ${pendingReset.boardType} board. This cannot be undone.`,
    };
  }, [pendingReset]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={
          <Badge variant="accent">
            <LayoutGrid className="h-3.5 w-3.5" />
            Your library
          </Badge>
        }
        title="Study boards"
        description="Filter topic and mixed boards, then jump straight into play mode."
      />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Board type
            </label>
            <Select value={typeFilter} onValueChange={(value: string) => setTypeFilter(value as TypeFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Played status
            </label>
            <Select value={playFilter} onValueChange={(value: string) => setPlayFilter(value as PlayFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="played">Played</SelectItem>
                <SelectItem value="not-played">Not played</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            {filteredBoards.length} visible
          </div>
        </CardContent>
      </Card>

      {error ? <ErrorBanner message={error} hint="Try again in a moment." /> : null}

      {filteredBoards.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No boards match these filters"
          description="Try changing the board type or played status to see more."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTypeFilter("all");
                setPlayFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              resetting={resettingBoardId === board.id}
              onReset={(b) => setPendingReset({ kind: "board", board: b })}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bulk reset</CardTitle>
          <CardDescription>Clear play history for a whole set at once.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Button
            variant="outline"
            disabled={resetting}
            onClick={() => setPendingReset({ kind: "type", boardType: "topic" })}
          >
            <RotateCcw className="h-4 w-4" />
            Reset all topic boards
          </Button>
          <Button
            variant="outline"
            disabled={resetting}
            onClick={() => setPendingReset({ kind: "type", boardType: "mixed" })}
          >
            <Shuffle className="h-4 w-4" />
            Reset all mixed boards
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingReset)}
        onOpenChange={(open) => (!open ? setPendingReset(null) : null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel="Reset"
        loading={resetting}
        onConfirm={() => void confirmReset()}
      />

      <Toast open={Boolean(toast)} message={toast ?? ""} onClose={() => setToast(null)} />
    </div>
  );
}
