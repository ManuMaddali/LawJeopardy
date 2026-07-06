from functools import lru_cache
import os
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
        config_path = Path(__file__).resolve()
        backend_root = config_path.parents[2]

        candidate_roots = [
            Path.cwd(),
            backend_root,
            backend_root.parent,
            Path("/app"),
        ]

        for root in candidate_roots:
            for docs_name in (self.default_docs_dir, "Docs", "docs"):
                candidate = root / docs_name
                if candidate.exists():
                    return candidate

        return candidate_roots[0] / self.default_docs_dir

    @property
    def frontend_origins(self) -> list[str]:
        raw_origins = [origin.strip() for origin in self.frontend_origin.split(",")]
        cleaned = {origin.rstrip("/") for origin in raw_origins if origin}
        cleaned.update(
            {
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            }
        )
        return sorted(cleaned)

    @staticmethod
    def _clean_secret(value: str) -> str:
        cleaned = value.strip()
        if cleaned.startswith('"') and cleaned.endswith('"'):
            cleaned = cleaned[1:-1].strip()
        if cleaned.startswith("'") and cleaned.endswith("'"):
            cleaned = cleaned[1:-1].strip()
        return cleaned

    @property
    def resolved_openai_api_key(self) -> str:
        candidates = [
            self.openai_api_key,
            os.getenv("OPENAI_API_KEY", ""),
            os.getenv("OPENAI_KEY", ""),
            os.getenv("OPENAI_APIKEY", ""),
        ]
        for candidate in candidates:
            if candidate and candidate.strip():
                return self._clean_secret(candidate)
        return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
