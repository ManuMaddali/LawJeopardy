from fastapi import APIRouter

from app.api.routes import boards, copilot, generate, health, materials, sessions


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(materials.router, prefix="/api/materials", tags=["materials"])
api_router.include_router(generate.router, prefix="/api/generate", tags=["generation"])
api_router.include_router(boards.router, prefix="/api/boards", tags=["boards"])
api_router.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
api_router.include_router(copilot.router, prefix="/api/copilot", tags=["copilot"])
