from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.material import Material
from app.services.pdf_extractor import extract_docx_text, extract_pdf_text
from app.services.topic_mapping import expected_subject_filenames, topic_from_filename


def storage_filename(owner_key: str, filename: str) -> str:
    return f"{owner_key}::{filename}"


def display_filename(stored_filename: str) -> str:
    if "::" in stored_filename:
        return stored_filename.split("::", 1)[1]
    return stored_filename


def upsert_material_from_bytes(
    db: Session,
    owner_key: str,
    filename: str,
    file_bytes: bytes,
) -> Material:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        extracted_text, page_count = extract_pdf_text(file_bytes)
    elif lower.endswith(".docx"):
        extracted_text, page_count = extract_docx_text(file_bytes)
    else:
        raise ValueError(f"Unsupported file format: {filename}")

    stored_name = storage_filename(owner_key, filename)
    topic = topic_from_filename(filename)
    existing = db.scalar(
        select(Material).where(
            Material.owner_key == owner_key,
            Material.filename == stored_name,
        )
    )
    if existing:
        existing.topic = topic
        existing.extracted_text = extracted_text
        existing.page_count = page_count
        db.add(existing)
        db.flush()
        return existing

    material = Material(
        owner_key=owner_key,
        filename=stored_name,
        topic=topic,
        extracted_text=extracted_text,
        page_count=page_count,
    )
    db.add(material)
    db.flush()
    return material


def process_default_material_set(
    db: Session,
    docs_dir: Path,
    owner_key: str,
) -> tuple[list[Material], list[str]]:
    processed: list[Material] = []
    missing: list[str] = []

    for filename in expected_subject_filenames():
        path = docs_dir / filename
        if not path.exists():
            missing.append(filename)
            continue

        content = path.read_bytes()
        processed.append(upsert_material_from_bytes(db, owner_key, filename, content))

    db.commit()
    for material in processed:
        db.refresh(material)

    return processed, missing
