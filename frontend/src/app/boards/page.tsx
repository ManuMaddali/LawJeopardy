"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Play, RotateCcw } from "lucide-react";

import { boardExportUrl, getBoards, resetBoard, resetBoardsByType } from "@/lib/api";
import type { BoardSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TypeFilter = "all" | "topic" | "mixed";
type PlayFilter = "all" | "played" | "not-played";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [playFilter, setPlayFilter] = useState<PlayFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resettingBoardId, setResettingBoardId] = useState<string | null>(null);
  const [resettingType, setResettingType] = useState<"topic" | "mixed" | null>(null);

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
      setError(loadError instanceof Error ? loadError.message : "Failed to load boards.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBoards();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBoards]);

  async function handleResetBoard(boardId: string, title: string) {
    const confirmed = window.confirm(`Reset play history for "${title}"?`);
    if (!confirmed) return;

    setError(null);
    setActionMessage(null);
    setResettingBoardId(boardId);
    try {
      const result = await resetBoard(boardId);
      setActionMessage(`Reset ${title}. Removed ${result.deleted_sessions} session(s).`);
      await loadBoards();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset board.");
    } finally {
      setResettingBoardId(null);
    }
  }

  async function handleResetByType(boardType: "topic" | "mixed") {
    const confirmed = window.confirm(
      `Reset play history for all ${boardType} boards?`,
    );
    if (!confirmed) return;

    setError(null);
    setActionMessage(null);
    setResettingType(boardType);
    try {
      const result = await resetBoardsByType(boardType);
      setActionMessage(
        `Reset ${result.boards_affected} ${boardType} board(s). Removed ${result.deleted_sessions} session(s).`,
      );
      await loadBoards();
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : `Failed to reset ${boardType} boards.`,
      );
    } finally {
      setResettingType(null);
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

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 via-indigo-950/70 to-cyan-950/70">
        <CardHeader>
          <CardTitle className="text-3xl">Study Boards</CardTitle>
          <CardDescription className="text-slate-200">
            Filter topic vs mixed boards, then jump straight into play mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Board Type</p>
            <Select
              value={typeFilter}
              onValueChange={(value: string) => setTypeFilter(value as TypeFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="topic">Topic</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Played Status</p>
            <Select
              value={playFilter}
              onValueChange={(value: string) => setPlayFilter(value as PlayFilter)}
            >
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
          <div className="flex items-end">
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              {filteredBoards.length} boards visible
            </Button>
          </div>
        </CardContent>
      </Card>

      {actionMessage ? (
        <Card className="border-emerald-300/30 bg-emerald-900/20">
          <CardContent className="pt-5 text-emerald-200">{actionMessage}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-rose-300/30 bg-rose-900/20">
          <CardContent className="pt-5 text-rose-200">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredBoards.map((board) => (
          <Card key={board.id} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{board.title}</CardTitle>
                <Badge variant={board.board_type === "mixed" ? "mixed" : "default"}>
                  {board.board_type}
                </Badge>
              </div>
              <CardDescription>{board.topics.join(" | ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Played: {board.played_sessions_count} | Created{" "}
                {new Date(board.created_at).toLocaleDateString()}
              </p>
              <div className="grid gap-2">
                <Button asChild className="w-full">
                  <Link href={`/play/${board.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    Play Board
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={boardExportUrl(board.id)} target="_blank" rel="noreferrer">
                    Export JSON
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={resettingBoardId === board.id}
                  onClick={() => void handleResetBoard(board.id, board.title)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {resettingBoardId === board.id ? "Resetting..." : "Reset Board"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Reset</CardTitle>
          <CardDescription className="text-slate-300">
            Clear play history for all boards in one set.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Button
            variant="outline"
            disabled={resettingType !== null}
            onClick={() => void handleResetByType("topic")}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {resettingType === "topic" ? "Resetting Topics..." : "Reset All Topic Boards"}
          </Button>
          <Button
            variant="outline"
            disabled={resettingType !== null}
            onClick={() => void handleResetByType("mixed")}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {resettingType === "mixed" ? "Resetting Mixed..." : "Reset All Mixed Boards"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
