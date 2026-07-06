from pydantic import BaseModel, Field


class CopilotHistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class CopilotAskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    history: list[CopilotHistoryMessage] = []


class CopilotSource(BaseModel):
    context_id: str
    filename: str
    topic: str
    source_hint: str
    excerpt: str


class CopilotAskResponse(BaseModel):
    answer: str
    sources: list[CopilotSource]
    suggested_questions: list[str]
    used_context: bool = True


class CopilotSuggestionsResponse(BaseModel):
    suggestions: list[str]
