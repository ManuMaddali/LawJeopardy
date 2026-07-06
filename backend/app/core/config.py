from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./local.db"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    frontend_origin: str = "http://localhost:3000"
    default_docs_dir: str = "Docs"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def resolved_docs_dir(self) -> Path:
        base = Path(__file__).resolve().parents[3]
        first_choice = base / self.default_docs_dir
        if first_choice.exists():
            return first_choice

        second_choice = base / "docs"
        if second_choice.exists():
            return second_choice

        return first_choice


@lru_cache
def get_settings() -> Settings:
    return Settings()
