"""add ai_jobs table

Revision ID: 0002_add_ai_jobs
Revises: 0001_init
Create Date: 2026-02-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_add_ai_jobs"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("lang", sa.String(), nullable=False, server_default=sa.text("'ru'")),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("history_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_jobs_id", "ai_jobs", ["id"], unique=False)
    op.create_index("ix_ai_jobs_user_id", "ai_jobs", ["user_id"], unique=False)
    op.create_index("ix_ai_jobs_status", "ai_jobs", ["status"], unique=False)
    op.create_index("ix_ai_jobs_created_at", "ai_jobs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_jobs_created_at", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_status", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_user_id", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_id", table_name="ai_jobs")
    op.drop_table("ai_jobs")

