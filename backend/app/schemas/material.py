from datetime import datetime

from pydantic import BaseModel


class MaterialRead(BaseModel):
    id: str
    filename: str
    topic: str
    page_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialProcessResponse(BaseModel):
    processed: list[MaterialRead]
    missing_files: list[str] = []
