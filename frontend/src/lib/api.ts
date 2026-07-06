import type {
  Board,
  BoardSummary,
  BoardType,
  ProcessMaterialsResponse,
  RecentSession,
  SelectedResult,
  SessionResults,
  StudySession,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type RequestOptions = {
  timeoutMs?: number;
};

async function request<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = "Request failed.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // keep fallback
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export async function getBoards() {
  return request<BoardSummary[]>("/api/boards");
}

export async function getBoard(boardId: string) {
  return request<Board>(`/api/boards/${boardId}`);
}

export async function getRecentSessions() {
  return request<RecentSession[]>("/api/sessions");
}

export async function uploadMaterials(files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  return request<ProcessMaterialsResponse>(
    "/api/materials/upload",
    {
      method: "POST",
      body: form,
    },
    { timeoutMs: 180_000 },
  );
}

export async function processDefaultMaterials() {
  return request<ProcessMaterialsResponse>(
    "/api/materials/process-default-set",
    {
      method: "POST",
    },
    { timeoutMs: 180_000 },
  );
}

export async function generateTopicBoards() {
  return request<{ created: Board[] }>(
    "/api/generate/all-topic-boards",
    {
      method: "POST",
    },
    { timeoutMs: 300_000 },
  );
}

export async function generateMixedBoards() {
  return request<{ created: Board[] }>(
    "/api/generate/mixed-boards",
    {
      method: "POST",
    },
    { timeoutMs: 300_000 },
  );
}

export async function generateFullStudySet() {
  return request<{
    topic_boards: Board[];
    mixed_boards: Board[];
    missing_files: string[];
  }>(
    "/api/generate/full-study-set",
    {
      method: "POST",
    },
    { timeoutMs: 420_000 },
  );
}

export async function startSession(boardId: string) {
  return request<StudySession>("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ board_id: boardId }),
  });
}

export async function answerSessionQuestion(
  sessionId: string,
  questionId: string,
  selectedResult: SelectedResult,
) {
  return request<StudySession>(`/api/sessions/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify({
      question_id: questionId,
      selected_result: selectedResult,
    }),
  });
}

export async function finishSession(sessionId: string) {
  return request<StudySession>(`/api/sessions/${sessionId}/finish`, {
    method: "POST",
  });
}

export async function getSessionResults(sessionId: string) {
  return request<SessionResults>(`/api/sessions/${sessionId}/results`);
}

export function boardExportUrl(boardId: string) {
  return `${API_BASE}/api/boards/${boardId}/export-json`;
}

export function missedCsvUrl(sessionId: string) {
  return `${API_BASE}/api/sessions/${sessionId}/missed-csv`;
}

export async function resetBoard(boardId: string) {
  return request<{ board_id: string; deleted_sessions: number }>(`/api/boards/${boardId}/reset`, {
    method: "POST",
  });
}

export async function resetBoardsByType(boardType: Extract<BoardType, "topic" | "mixed">) {
  return request<{ board_type: string; boards_affected: number; deleted_sessions: number }>(
    `/api/boards/reset-by-type/${boardType}`,
    {
      method: "POST",
    },
  );
}
