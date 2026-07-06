import type {
  Board,
  BoardSummary,
  ProcessMaterialsResponse,
  RecentSession,
  SelectedResult,
  SessionResults,
  StudySession,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    cache: "no-store",
  });

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
  return request<ProcessMaterialsResponse>("/api/materials/upload", {
    method: "POST",
    body: form,
  });
}

export async function processDefaultMaterials() {
  return request<ProcessMaterialsResponse>("/api/materials/process-default-set", {
    method: "POST",
  });
}

export async function generateTopicBoards() {
  return request<{ created: Board[] }>("/api/generate/all-topic-boards", {
    method: "POST",
  });
}

export async function generateMixedBoards() {
  return request<{ created: Board[] }>("/api/generate/mixed-boards", {
    method: "POST",
  });
}

export async function generateFullStudySet() {
  return request<{
    topic_boards: Board[];
    mixed_boards: Board[];
    missing_files: string[];
  }>("/api/generate/full-study-set", {
    method: "POST",
  });
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
