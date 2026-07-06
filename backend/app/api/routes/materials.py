from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_owner_key
from app.core.config import get_settings
from app.db.session import get_db
from app.models.material import Material
from app.schemas.material import MaterialProcessResponse, MaterialRead
from app.services.materials_service import (
    display_filename,
    process_default_material_set,
    upsert_material_from_bytes,
)
from app.services.topic_mapping import expected_subject_filenames


router = APIRouter()


def _to_material_read(material: Material) -> MaterialRead:
    return MaterialRead.model_validate(
        material,
    ).model_copy(update={"filename": display_filename(material.filename)})


@router.post("/upload", response_model=MaterialProcessResponse)
async def upload_materials(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> MaterialProcessResponse:
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    processed: list[Material] = []
    for upload in files:
        content = await upload.read()
        try:
            material = upsert_material_from_bytes(
                db=db,
                owner_key=owner_key,
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
        processed=[_to_material_read(material) for material in processed],
        missing_files=[],
    )


@router.post("/process-default-set", response_model=MaterialProcessResponse)
def process_default_set(
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> MaterialProcessResponse:
    settings = get_settings()
    docs_dir = settings.resolved_docs_dir
    if not docs_dir.exists():
        existing_materials = db.scalars(
            select(Material)
            .where(Material.owner_key == owner_key)
            .order_by(Material.created_at.desc())
        ).all()
        if existing_materials:
            return MaterialProcessResponse(
                processed=[_to_material_read(material) for material in existing_materials],
                missing_files=[],
            )
        raise HTTPException(
            status_code=404,
            detail=(
                f"Docs directory not found at {docs_dir}. "
                "Upload PDFs first, then retry."
            ),
        )

    processed, missing = process_default_material_set(db=db, docs_dir=docs_dir, owner_key=owner_key)
    if not processed:
        existing_materials = db.scalars(
            select(Material)
            .where(Material.owner_key == owner_key)
            .order_by(Material.created_at.desc())
        ).all()
        if existing_materials:
            return MaterialProcessResponse(
                processed=[_to_material_read(material) for material in existing_materials],
                missing_files=[],
            )
        missing = expected_subject_filenames()

    return MaterialProcessResponse(
        processed=[_to_material_read(material) for material in processed],
        missing_files=missing,
    )


@router.get("", response_model=list[MaterialRead])
def list_materials(
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> list[MaterialRead]:
    materials = db.scalars(
        select(Material)
        .where(Material.owner_key == owner_key)
        .order_by(Material.created_at.desc())
    ).all()
    return [_to_material_read(material) for material in materials]
