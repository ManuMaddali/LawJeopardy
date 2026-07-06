from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import DifficultyLevel


class Question(BaseModel):
    id: str
    category: str
    points: int
    topic: str
    is_random: bool = False
    clue: str
    answer: str
    explanation: str
    source_hint: str
    difficulty: DifficultyLevel = DifficultyLevel.medium


class BoardRead(BaseModel):
    id: str
    title: str
    board_type: Literal["topic", "mixed", "missed"]
    primary_topic: str | None = None
    topics: list[str]
    categories: list[str]
    questions: list[Question]
    created_at: datetime

    model_config = {"from_attributes": True}


class BoardSummary(BaseModel):
    id: str
    title: str
    board_type: str
    primary_topic: str | None
    topics: list[str]
    categories: list[str]
    created_at: datetime
    played_sessions_count: int = 0


class MixedBoardsResponse(BaseModel):
    created: list[BoardRead]


class TopicBoardsResponse(BaseModel):
    created: list[BoardRead]


class BoardExport(BaseModel):
    board: BoardRead
