"""add user medical notes

Revision ID: 0003_add_user_medical_notes
Revises: 0002_add_ai_jobs
Create Date: 2026-04-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_add_user_medical_notes"
down_revision = "0002_add_ai_jobs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("allergies", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("chronic_conditions", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "chronic_conditions")
    op.drop_column("users", "allergies")
