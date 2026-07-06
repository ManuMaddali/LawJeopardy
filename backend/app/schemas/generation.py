from pydantic import BaseModel, Field


class AIQuestion(BaseModel):
    category: str
    points: int
    topic: str | None = None
    is_random: bool = False
    clue: str
    answer: str
    explanation: str
    source_hint: str
    difficulty: str | None = None


class AIBoard(BaseModel):
    title: str
    categories: list[str] = Field(min_length=1)
    questions: list[AIQuestion] = Field(min_length=1)
