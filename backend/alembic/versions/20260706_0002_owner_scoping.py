"""add owner scoping columns

Revision ID: 20260706_0002
Revises: 20260705_0001
Create Date: 2026-07-06 23:58:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260706_0002"
down_revision: str | None = "20260705_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    for table_name in ("materials", "boards", "sessions"):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "owner_key" not in columns:
            op.add_column(
                table_name,
                sa.Column("owner_key", sa.String(length=64), nullable=False, server_default="anonymous"),
            )

    existing_indexes = {index["name"] for index in inspector.get_indexes("materials")}
    if "ix_materials_owner_key" not in existing_indexes:
        op.create_index("ix_materials_owner_key", "materials", ["owner_key"])

    existing_indexes = {index["name"] for index in inspector.get_indexes("boards")}
    if "ix_boards_owner_key" not in existing_indexes:
        op.create_index("ix_boards_owner_key", "boards", ["owner_key"])

    existing_indexes = {index["name"] for index in inspector.get_indexes("sessions")}
    if "ix_sessions_owner_key" not in existing_indexes:
        op.create_index("ix_sessions_owner_key", "sessions", ["owner_key"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    existing_indexes = {index["name"] for index in inspector.get_indexes("sessions")}
    if "ix_sessions_owner_key" in existing_indexes:
        op.drop_index("ix_sessions_owner_key", table_name="sessions")

    existing_indexes = {index["name"] for index in inspector.get_indexes("boards")}
    if "ix_boards_owner_key" in existing_indexes:
        op.drop_index("ix_boards_owner_key", table_name="boards")

    existing_indexes = {index["name"] for index in inspector.get_indexes("materials")}
    if "ix_materials_owner_key" in existing_indexes:
        op.drop_index("ix_materials_owner_key", table_name="materials")

    for table_name in ("sessions", "boards", "materials"):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "owner_key" in columns:
            op.drop_column(table_name, "owner_key")
