from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.board import Board
from app.models.session import StudySession
from app.schemas.board import BoardRead, BoardSummary


router = APIRouter()


@router.get("", response_model=list[BoardSummary])
def list_boards(db: Session = Depends(get_db)) -> list[BoardSummary]:
    boards = db.scalars(select(Board).order_by(Board.created_at.desc())).all()

    played_counts_raw = db.execute(
        select(StudySession.board_id, func.count(StudySession.id))
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
def get_board(board_id: str, db: Session = Depends(get_db)) -> BoardRead:
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")
    return BoardRead.model_validate(board)


@router.get("/{board_id}/export-json")
def export_board_json(board_id: str, db: Session = Depends(get_db)) -> JSONResponse:
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    payload = BoardRead.model_validate(board).model_dump()
    return JSONResponse(
        payload,
        headers={"Content-Disposition": f'attachment; filename="{board.title.replace(" ", "_")}.json"'},
    )
