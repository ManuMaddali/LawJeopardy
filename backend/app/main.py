from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.models import Board, Material, StudySession  # noqa: F401


settings = get_settings()

app = FastAPI(title="Georgia Bar Jeopardy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


def _ensure_owner_columns() -> None:
    inspector = inspect(engine)
    required = {
        "materials": "owner_key",
        "boards": "owner_key",
        "sessions": "owner_key",
    }

    with engine.begin() as connection:
        for table_name, column_name in required.items():
            existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            if column_name in existing_cols:
                continue
            connection.execute(
                text(
                    f"ALTER TABLE {table_name} "
                    "ADD COLUMN owner_key VARCHAR(64) NOT NULL DEFAULT 'anonymous'"
                )
            )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_owner_columns()
