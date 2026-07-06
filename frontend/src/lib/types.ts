export type BoardType = "topic" | "mixed" | "missed";
export type SelectedResult = "correct" | "incorrect" | "skipped";
export type Difficulty = "easy" | "medium" | "hard";

export interface Material {
  id: string;
  filename: string;
  topic: string;
  page_count: number;
  created_at: string;
}

export interface Question {
  id: string;
  category: string;
  points: number;
  topic: string;
  is_random: boolean;
  clue: string;
  answer: string;
  explanation: string;
  source_hint: string;
  difficulty: Difficulty;
}

export interface Board {
  id: string;
  title: string;
  board_type: BoardType;
  primary_topic: string | null;
  topics: string[];
  categories: string[];
  questions: Question[];
  created_at: string;
}

export interface BoardSummary {
  id: string;
  title: string;
  board_type: BoardType;
  primary_topic: string | null;
  topics: string[];
  categories: string[];
  created_at: string;
  played_sessions_count: number;
}

export interface SessionAnswerRecord {
  question_id: string;
  selected_result: SelectedResult;
  points_delta: number;
  topic: string;
  category: string;
}

export interface StudySession {
  id: string;
  board_id: string;
  score: number;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  answers: SessionAnswerRecord[];
  started_at: string;
  finished_at: string | null;
}

export interface SessionResults {
  session: StudySession;
  board_title: string;
  missed_questions: Question[];
  weakest_topics: { topic: string; missed: number }[];
  rule_summaries: string[];
}

export interface RecentSession {
  id: string;
  board_id: string;
  board_title: string;
  score: number;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  finished_at: string | null;
}

export interface ProcessMaterialsResponse {
  processed: Material[];
  missing_files: string[];
}
