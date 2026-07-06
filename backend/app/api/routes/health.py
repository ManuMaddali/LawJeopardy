from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter()


@router.get("/health")
def health() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "openai_configured": bool(settings.resolved_openai_api_key),
    }
