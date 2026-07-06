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


@lru_cache
def get_settings() -> Settings:
    return Settings()
