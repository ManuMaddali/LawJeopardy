import uuid
from datetime import datetime

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    board_type: Mapped[str] = mapped_column(String(20), nullable=False)
    primary_topic: Mapped[str | None] = mapped_column(String(120), nullable=True)
    topics: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    categories: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    questions: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
