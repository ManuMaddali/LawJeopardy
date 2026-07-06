from datetime import datetime

from pydantic import BaseModel

from app.schemas.board import Question
from app.schemas.common import SelectedResult


class SessionStartRequest(BaseModel):
    board_id: str


class SessionAnswerRequest(BaseModel):
    question_id: str
    selected_result: SelectedResult


class SessionAnswerRecord(BaseModel):
    question_id: str
    selected_result: SelectedResult
    points_delta: int
    topic: str
    category: str


class SessionRead(BaseModel):
    id: str
    board_id: str
    score: int
    total_questions: int
    correct_count: int
    incorrect_count: int
    skipped_count: int
    answers: list[SessionAnswerRecord]
    started_at: datetime
    finished_at: datetime | None = None

    model_config = {"from_attributes": True}


class SessionResults(BaseModel):
    session: SessionRead
    board_title: str
    missed_questions: list[Question]
    weakest_topics: list[dict[str, int]]
    rule_summaries: list[str]


class SessionRecent(BaseModel):
    id: str
    board_id: str
    board_title: str
    score: int
    correct_count: int
    incorrect_count: int
    skipped_count: int
    finished_at: datetime | None
