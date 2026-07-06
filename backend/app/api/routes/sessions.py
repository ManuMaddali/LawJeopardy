import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.board import Board
from app.models.session import StudySession
from app.schemas.board import Question
from app.schemas.common import SelectedResult
from app.schemas.session import (
    SessionAnswerRecord,
    SessionAnswerRequest,
    SessionRead,
    SessionRecent,
    SessionResults,
    SessionStartRequest,
)


router = APIRouter()


@router.get("", response_model=list[SessionRecent])
def list_recent_sessions(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[SessionRecent]:
    sessions = db.scalars(select(StudySession).order_by(StudySession.started_at.desc()).limit(limit)).all()
    if not sessions:
        return []

    board_ids = {session.board_id for session in sessions}
    boards = db.scalars(select(Board).where(Board.id.in_(board_ids))).all()
    board_by_id = {board.id: board for board in boards}

    return [
        SessionRecent(
            id=session.id,
            board_id=session.board_id,
            board_title=board_by_id.get(session.board_id).title
            if board_by_id.get(session.board_id)
            else "Unknown Board",
            score=session.score,
            correct_count=session.correct_count,
            incorrect_count=session.incorrect_count,
            skipped_count=session.skipped_count,
            finished_at=session.finished_at,
        )
        for session in sessions
    ]


@router.post("/start", response_model=SessionRead)
def start_session(payload: SessionStartRequest, db: Session = Depends(get_db)) -> SessionRead:
    board = db.get(Board, payload.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    session = StudySession(
        board_id=board.id,
        score=0,
        total_questions=len(board.questions),
        correct_count=0,
        incorrect_count=0,
        skipped_count=0,
        answers=[],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionRead.model_validate(session)


@router.post("/{session_id}/answer", response_model=SessionRead)
def submit_answer(
    session_id: str,
    payload: SessionAnswerRequest,
    db: Session = Depends(get_db),
) -> SessionRead:
    session = db.get(StudySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.finished_at is not None:
        raise HTTPException(status_code=400, detail="Session is already finished.")

    board = db.get(Board, session.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    existing_ids = {entry["question_id"] for entry in session.answers}
    if payload.question_id in existing_ids:
        return SessionRead.model_validate(session)

    question = next((q for q in board.questions if q["id"] == payload.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in board.")

    points = int(question["points"])
    if payload.selected_result == SelectedResult.correct:
        points_delta = points
        session.correct_count += 1
    elif payload.selected_result == SelectedResult.incorrect:
        points_delta = -points
        session.incorrect_count += 1
    else:
        points_delta = 0
        session.skipped_count += 1

    session.score += points_delta
    answer_record = SessionAnswerRecord(
        question_id=payload.question_id,
        selected_result=payload.selected_result,
        points_delta=points_delta,
        topic=question["topic"],
        category=question["category"],
    )
    session.answers = [*session.answers, answer_record.model_dump()]

    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionRead.model_validate(session)


@router.post("/{session_id}/finish", response_model=SessionRead)
def finish_session(session_id: str, db: Session = Depends(get_db)) -> SessionRead:
    session = db.get(StudySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.finished_at is None:
        session.finished_at = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)

    return SessionRead.model_validate(session)


@router.get("/{session_id}/results", response_model=SessionResults)
def get_results(session_id: str, db: Session = Depends(get_db)) -> SessionResults:
    session = db.get(StudySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    board = db.get(Board, session.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    question_by_id = {q["id"]: q for q in board.questions}
    missed_ids = [
        answer["question_id"]
        for answer in session.answers
        if answer["selected_result"] in {SelectedResult.incorrect.value, SelectedResult.skipped.value}
    ]

    missed_questions = [
        Question.model_validate(question_by_id[qid]) for qid in missed_ids if qid in question_by_id
    ]

    weakest_topic_counts: dict[str, int] = {}
    for question in missed_questions:
        weakest_topic_counts[question.topic] = weakest_topic_counts.get(question.topic, 0) + 1

    weakest_topics = [
        {"topic": topic, "missed": missed}
        for topic, missed in sorted(weakest_topic_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    seen_summaries: set[str] = set()
    rule_summaries: list[str] = []
    for question in missed_questions:
        if question.explanation not in seen_summaries:
            seen_summaries.add(question.explanation)
            rule_summaries.append(question.explanation)
        if len(rule_summaries) == 8:
            break

    return SessionResults(
        session=SessionRead.model_validate(session),
        board_title=board.title,
        missed_questions=missed_questions,
        weakest_topics=weakest_topics,
        rule_summaries=rule_summaries,
    )


@router.get("/{session_id}/missed-csv")
def export_missed_csv(session_id: str, db: Session = Depends(get_db)) -> StreamingResponse:
    session = db.get(StudySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    board = db.get(Board, session.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    question_by_id = {q["id"]: q for q in board.questions}
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["question_id", "topic", "category", "clue", "answer", "explanation"])

    for entry in session.answers:
        if entry["selected_result"] not in {SelectedResult.incorrect.value, SelectedResult.skipped.value}:
            continue
        question = question_by_id.get(entry["question_id"])
        if not question:
            continue
        writer.writerow(
            [
                question["id"],
                question["topic"],
                question["category"],
                question["clue"],
                question["answer"],
                question["explanation"],
            ]
        )

    output.seek(0)
    filename = f"missed_questions_{session_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
