from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_owner_key
from app.db.session import get_db
from app.models.material import Material
from app.schemas.copilot import CopilotAskRequest, CopilotAskResponse, CopilotSuggestionsResponse
from app.services.copilot_service import CopilotError, CopilotService


router = APIRouter()


@router.get("/suggestions", response_model=CopilotSuggestionsResponse)
def get_copilot_suggestions(
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> CopilotSuggestionsResponse:
    materials = db.scalars(
        select(Material)
        .where(Material.owner_key == owner_key)
        .order_by(Material.topic.asc())
    ).all()
    suggestions = CopilotService.default_suggestions(materials)
    return CopilotSuggestionsResponse(suggestions=suggestions)


@router.post("/ask", response_model=CopilotAskResponse)
def ask_copilot(
    payload: CopilotAskRequest,
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> CopilotAskResponse:
    materials = db.scalars(
        select(Material)
        .where(Material.owner_key == owner_key)
        .order_by(Material.topic.asc())
    ).all()
    if not materials:
        raise HTTPException(
            status_code=400,
            detail="No processed materials found. Upload/process PDFs first.",
        )

    service = CopilotService()
    contexts = service.retrieve_context(question=payload.question, materials=materials)
    try:
        answer, sources, suggested, used_context = service.ask(
            question=payload.question,
            history=payload.history,
            contexts=contexts,
        )
    except CopilotError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not suggested:
        suggested = CopilotService.default_suggestions(materials)[:4]

    return CopilotAskResponse(
        answer=answer,
        sources=sources,
        suggested_questions=suggested,
        used_context=used_context,
    )
