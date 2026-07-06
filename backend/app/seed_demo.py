from sqlalchemy import select

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.board import Board
from app.models.material import Material
from app.services.generation_service import BoardGenerationService
from app.services.materials_service import process_default_material_set


def run_seed() -> None:
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    owner_key = "seed-demo"

    with SessionLocal() as db:
        processed, missing = process_default_material_set(
            db=db,
            docs_dir=settings.resolved_docs_dir,
            owner_key=owner_key,
        )
        print(f"Processed {len(processed)} material files.")
        if missing:
            print(f"Missing files: {', '.join(missing)}")

        materials = db.scalars(
            select(Material)
            .where(Material.owner_key == owner_key)
            .order_by(Material.topic.asc())
        ).all()
        if not materials:
            print("No materials found, aborting.")
            return

        service = BoardGenerationService()
        for material in materials:
            payload = service.generate_topic_board(material)
            board = Board(
                owner_key=owner_key,
                title=payload["title"],
                board_type="topic",
                primary_topic=material.topic,
                topics=payload["topics"],
                categories=payload["categories"],
                questions=payload["questions"],
            )
            db.add(board)
            db.commit()
            print(f"Generated topic board: {board.title}")

        for idx in range(1, 5):
            payload = service.generate_mixed_board(materials=materials, board_number=idx)
            board = Board(
                owner_key=owner_key,
                title=payload["title"],
                board_type="mixed",
                primary_topic=None,
                topics=payload["topics"],
                categories=payload["categories"],
                questions=payload["questions"],
            )
            db.add(board)
            db.commit()
            print(f"Generated mixed board: {board.title}")

    print("Demo seed complete.")


if __name__ == "__main__":
    run_seed()
