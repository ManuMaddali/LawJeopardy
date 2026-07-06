from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_owner_key
from app.db.session import get_db
from app.models.board import Board
from app.models.session import StudySession
from app.schemas.board import BoardRead, BoardSummary


router = APIRouter()


@router.get("", response_model=list[BoardSummary])
def list_boards(
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> list[BoardSummary]:
    boards = db.scalars(
        select(Board)
        .where(Board.owner_key == owner_key)
        .order_by(Board.created_at.desc())
    ).all()

    played_counts_raw = db.execute(
        select(StudySession.board_id, func.count(StudySession.id))
        .where(StudySession.owner_key == owner_key)
        .group_by(StudySession.board_id)
        .order_by(func.count(StudySession.id).desc())
    ).all()
    played_counts = {board_id: count for board_id, count in played_counts_raw}

    return [
        BoardSummary(
            id=board.id,
            title=board.title,
            board_type=board.board_type,
            primary_topic=board.primary_topic,
            topics=board.topics,
            categories=board.categories,
            created_at=board.created_at,
            played_sessions_count=played_counts.get(board.id, 0),
        )
        for board in boards
    ]


@router.get("/{board_id}", response_model=BoardRead)
def get_board(
    board_id: str,
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> BoardRead:
    board = db.scalar(select(Board).where(Board.id == board_id, Board.owner_key == owner_key))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")
    return BoardRead.model_validate(board)


@router.get("/{board_id}/export-json")
def export_board_json(
    board_id: str,
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> JSONResponse:
    board = db.scalar(select(Board).where(Board.id == board_id, Board.owner_key == owner_key))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    payload = BoardRead.model_validate(board).model_dump()
    return JSONResponse(
        payload,
        headers={"Content-Disposition": f'attachment; filename="{board.title.replace(" ", "_")}.json"'},
    )


@router.post("/{board_id}/reset")
def reset_board_sessions(
    board_id: str,
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> dict[str, int | str]:
    board = db.scalar(select(Board).where(Board.id == board_id, Board.owner_key == owner_key))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    result = db.execute(
        delete(StudySession).where(
            StudySession.board_id == board_id,
            StudySession.owner_key == owner_key,
        )
    )
    db.commit()
    return {
        "board_id": board_id,
        "deleted_sessions": int(result.rowcount or 0),
    }


@router.post("/reset-by-type/{board_type}")
def reset_sessions_by_board_type(
    board_type: Literal["topic", "mixed"],
    db: Session = Depends(get_db),
    owner_key: str = Depends(get_owner_key),
) -> dict[str, int | str]:
    board_ids = db.scalars(
        select(Board.id).where(
            Board.board_type == board_type,
            Board.owner_key == owner_key,
        )
    ).all()
    if not board_ids:
        return {
            "board_type": board_type,
            "boards_affected": 0,
            "deleted_sessions": 0,
        }

    result = db.execute(
        delete(StudySession).where(
            StudySession.board_id.in_(board_ids),
            StudySession.owner_key == owner_key,
        )
    )
    db.commit()
    return {
        "board_type": board_type,
        "boards_affected": len(board_ids),
        "deleted_sessions": int(result.rowcount or 0),
    }
