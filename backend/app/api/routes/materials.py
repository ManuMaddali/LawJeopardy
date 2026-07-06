from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.material import Material
from app.schemas.material import MaterialProcessResponse, MaterialRead
from app.services.materials_service import process_default_material_set, upsert_material_from_bytes


router = APIRouter()


@router.post("/upload", response_model=MaterialProcessResponse)
async def upload_materials(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> MaterialProcessResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    processed: list[Material] = []
    for upload in files:
        content = await upload.read()
        try:
            material = upsert_material_from_bytes(
                db=db,
                filename=upload.filename or "uploaded.pdf",
                file_bytes=content,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        processed.append(material)

    db.commit()
    for material in processed:
        db.refresh(material)

    return MaterialProcessResponse(
        processed=[MaterialRead.model_validate(material) for material in processed],
        missing_files=[],
    )


@router.post("/process-default-set", response_model=MaterialProcessResponse)
def process_default_set(db: Session = Depends(get_db)) -> MaterialProcessResponse:
    settings = get_settings()
    docs_dir = settings.resolved_docs_dir
    if not docs_dir.exists():
        raise HTTPException(status_code=404, detail=f"Docs directory not found at {docs_dir}")

    processed, missing = process_default_material_set(db=db, docs_dir=docs_dir)
    return MaterialProcessResponse(
        processed=[MaterialRead.model_validate(material) for material in processed],
        missing_files=missing,
    )


@router.get("", response_model=list[MaterialRead])
def list_materials(db: Session = Depends(get_db)) -> list[MaterialRead]:
    materials = db.scalars(select(Material).order_by(Material.created_at.desc())).all()
    return [MaterialRead.model_validate(material) for material in materials]
