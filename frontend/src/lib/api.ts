import type {
  Board,
  BoardSummary,
  BoardType,
  CopilotAskResponse,
  CopilotHistoryMessage,
  CopilotSuggestionsResponse,
  Material,
  ProcessMaterialsResponse,
  RecentSession,
  SelectedResult,
  SessionResults,
  StudySession,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const VISITOR_STORAGE_KEY = "gbj_visitor_id";

type RequestOptions = {
  timeoutMs?: number;
};

function getVisitorId() {
  if (typeof window === "undefined") return "anonymous";
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `anon_${Math.random().toString(36).slice(2)}${Date.now()}`;
  window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
  return created;
}

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
        "X-Visitor-Id": getVisitorId(),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("That request took too long. Please retry.");
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach the server. Check that NEXT_PUBLIC_API_URL points to your live backend.",
      );
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

export async function getMaterials() {
  return request<Material[]>("/api/materials");
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

export async function generateTopicBoard(materialId: string) {
  return request<Board>(
    `/api/generate/topic-board/${materialId}`,
    {
      method: "POST",
    },
    { timeoutMs: 150_000 },
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

export async function generateSingleMixedBoard(boardNumber: number) {
  return request<Board>(
    `/api/generate/mixed-board/${boardNumber}`,
    {
      method: "POST",
    },
    { timeoutMs: 180_000 },
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
  const visitor = encodeURIComponent(getVisitorId());
  return `${API_BASE}/api/boards/${boardId}/export-json?visitor_id=${visitor}`;
}

export function missedCsvUrl(sessionId: string) {
  const visitor = encodeURIComponent(getVisitorId());
  return `${API_BASE}/api/sessions/${sessionId}/missed-csv?visitor_id=${visitor}`;
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

export async function getCopilotSuggestions() {
  return request<CopilotSuggestionsResponse>("/api/copilot/suggestions");
}

export async function askCopilot(question: string, history: CopilotHistoryMessage[]) {
  return request<CopilotAskResponse>(
    "/api/copilot/ask",
    {
      method: "POST",
      body: JSON.stringify({
        question,
        history,
      }),
    },
    { timeoutMs: 120_000 },
  );
}
