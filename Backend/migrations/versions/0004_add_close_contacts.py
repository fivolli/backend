"""add close contacts tables

Revision ID: 0004_add_close_contacts
Revises: 0003_add_user_medical_notes
Create Date: 2026-04-10
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_add_close_contacts"
down_revision = "0003_add_user_medical_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "close_contact_requests",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("receiver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_close_contact_requests_id", "close_contact_requests", ["id"], unique=False)
    op.create_index("ix_close_contact_requests_sender_id", "close_contact_requests", ["sender_id"], unique=False)
    op.create_index("ix_close_contact_requests_receiver_id", "close_contact_requests", ["receiver_id"], unique=False)
    op.create_index("ix_close_contact_requests_status", "close_contact_requests", ["status"], unique=False)
    op.create_index("ix_close_contact_requests_created_at", "close_contact_requests", ["created_at"], unique=False)

    op.create_table(
        "close_contacts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("contact_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint("user_id", "contact_user_id", name="uq_close_contacts_user_contact"),
    )
    op.create_index("ix_close_contacts_id", "close_contacts", ["id"], unique=False)
    op.create_index("ix_close_contacts_user_id", "close_contacts", ["user_id"], unique=False)
    op.create_index("ix_close_contacts_contact_user_id", "close_contacts", ["contact_user_id"], unique=False)
    op.create_index("ix_close_contacts_created_at", "close_contacts", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_close_contacts_created_at", table_name="close_contacts")
    op.drop_index("ix_close_contacts_contact_user_id", table_name="close_contacts")
    op.drop_index("ix_close_contacts_user_id", table_name="close_contacts")
    op.drop_index("ix_close_contacts_id", table_name="close_contacts")
    op.drop_table("close_contacts")

    op.drop_index("ix_close_contact_requests_created_at", table_name="close_contact_requests")
    op.drop_index("ix_close_contact_requests_status", table_name="close_contact_requests")
    op.drop_index("ix_close_contact_requests_receiver_id", table_name="close_contact_requests")
    op.drop_index("ix_close_contact_requests_sender_id", table_name="close_contact_requests")
    op.drop_index("ix_close_contact_requests_id", table_name="close_contact_requests")
    op.drop_table("close_contact_requests")
