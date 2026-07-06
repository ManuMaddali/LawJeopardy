"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Filter, Play } from "lucide-react";

import { boardExportUrl, getBoards } from "@/lib/api";
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "topic" || type === "mixed") {
      const timer = window.setTimeout(() => setTypeFilter(type), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setBoards(await getBoards());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load boards.");
      }
    }
    void load();
  }, []);

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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
