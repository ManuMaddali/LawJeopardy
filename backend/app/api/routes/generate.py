from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.board import Board
from app.models.material import Material
from app.schemas.board import BoardRead, MixedBoardsResponse, TopicBoardsResponse
from app.schemas.material import MaterialRead
from app.services.generation_service import BoardGenerationError, BoardGenerationService
from app.services.materials_service import process_default_material_set


router = APIRouter()


def _store_board(
    db: Session,
    board_type: str,
    payload: dict,
    primary_topic: str | None,
) -> Board:
    board = Board(
        title=payload["title"],
        board_type=board_type,
        primary_topic=primary_topic,
        topics=payload["topics"],
        categories=payload["categories"],
        questions=payload["questions"],
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@router.post("/topic-board/{material_id}", response_model=BoardRead)
def generate_topic_board(material_id: str, db: Session = Depends(get_db)) -> BoardRead:
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found.")

    try:
        service = BoardGenerationService()
        payload = service.generate_topic_board(material)
    except BoardGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    board = _store_board(db=db, board_type="topic", payload=payload, primary_topic=material.topic)
    return BoardRead.model_validate(board)


@router.post("/all-topic-boards", response_model=TopicBoardsResponse)
def generate_all_topic_boards(db: Session = Depends(get_db)) -> TopicBoardsResponse:
    materials = db.scalars(select(Material).order_by(Material.topic.asc())).all()
    if not materials:
        raise HTTPException(status_code=400, detail="No materials available.")

    try:
        service = BoardGenerationService()
    except BoardGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    created: list[BoardRead] = []
    for material in materials:
        try:
            payload = service.generate_topic_board(material)
        except BoardGenerationError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed generating board for {material.topic}: {exc}",
            ) from exc
        board = _store_board(db=db, board_type="topic", payload=payload, primary_topic=material.topic)
        created.append(BoardRead.model_validate(board))

    return TopicBoardsResponse(created=created)


@router.post("/mixed-boards", response_model=MixedBoardsResponse)
def generate_mixed_boards(db: Session = Depends(get_db)) -> MixedBoardsResponse:
    materials = db.scalars(select(Material).order_by(Material.topic.asc())).all()
    if not materials:
        raise HTTPException(status_code=400, detail="No materials available.")

    try:
        service = BoardGenerationService()
    except BoardGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    created: list[BoardRead] = []
    for index in range(1, 5):
        try:
            payload = service.generate_mixed_board(materials=materials, board_number=index)
        except BoardGenerationError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed generating mixed board {index}: {exc}",
            ) from exc
        board = _store_board(db=db, board_type="mixed", payload=payload, primary_topic=None)
        created.append(BoardRead.model_validate(board))

    return MixedBoardsResponse(created=created)


@router.post("/full-study-set")
def generate_full_study_set(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    docs_dir = settings.resolved_docs_dir
    if docs_dir.exists():
        processed, missing_files = process_default_material_set(db=db, docs_dir=docs_dir)
    else:
        processed = db.scalars(select(Material)).all()
        missing_files = []

    materials = db.scalars(select(Material).order_by(Material.topic.asc())).all()
    if not materials:
        raise HTTPException(status_code=400, detail="No materials found to generate boards from.")

    try:
        service = BoardGenerationService()
    except BoardGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    topic_boards: list[BoardRead] = []
    for material in materials:
        try:
            topic_payload = service.generate_topic_board(material)
        except BoardGenerationError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Topic board generation failed for {material.topic}: {exc}",
            ) from exc
        topic_board = _store_board(
            db=db,
            board_type="topic",
            payload=topic_payload,
            primary_topic=material.topic,
        )
        topic_boards.append(BoardRead.model_validate(topic_board))

    mixed_boards: list[BoardRead] = []
    for index in range(1, 5):
        try:
            mixed_payload = service.generate_mixed_board(materials=materials, board_number=index)
        except BoardGenerationError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Mixed board generation failed for board {index}: {exc}",
            ) from exc
        mixed_board = _store_board(
            db=db,
            board_type="mixed",
            payload=mixed_payload,
            primary_topic=None,
        )
        mixed_boards.append(BoardRead.model_validate(mixed_board))

    return {
        "materials_processed": [MaterialRead.model_validate(material) for material in processed],
        "missing_files": missing_files,
        "topic_boards": topic_boards,
        "mixed_boards": mixed_boards,
    }
