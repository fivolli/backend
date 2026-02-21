"""initial schema

Revision ID: 0001_init
Revises: 
Create Date: 2026-02-19

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "role",
            sa.String(),
            server_default=sa.text("'user'"),
            nullable=False,
        ),
        sa.Column("volunteer_lat", sa.Float(), nullable=True),
        sa.Column("volunteer_lng", sa.Float(), nullable=True),
        sa.Column("volunteer_online_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
    )
    op.create_index("ix_users_phone", "users", ["phone"], unique=False)

    op.create_table(
        "help_requests",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("symptoms", sa.Text(), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(),
            server_default=sa.text("'new'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("severity", sa.String(), nullable=True),
        sa.Column("accepted_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("volunteer_lat", sa.Float(), nullable=True),
        sa.Column("volunteer_lng", sa.Float(), nullable=True),
        sa.Column("in_progress_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("review_text", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_help_requests_accepted_by", "help_requests", ["accepted_by"], unique=False)

    op.create_table(
        "push_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("platform", sa.String(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint("user_id", name="uq_push_tokens_user_id"),
    )

    op.create_table(
        "notification_prefs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sos", sa.Boolean(), nullable=False),
        sa.Column("volunteers", sa.Boolean(), nullable=False),
        sa.Column("updates", sa.Boolean(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint("user_id", name="uq_notification_prefs_user_id"),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("help_requests.id"), nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
    )
    op.create_index("ix_chat_messages_request_id", "chat_messages", ["request_id"], unique=False)
    op.create_index("ix_chat_messages_sender_id", "chat_messages", ["sender_id"], unique=False)
    op.create_index("ix_chat_messages_created_at", "chat_messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_chat_messages_created_at", table_name="chat_messages")
    op.drop_index("ix_chat_messages_sender_id", table_name="chat_messages")
    op.drop_index("ix_chat_messages_request_id", table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_table("notification_prefs")
    op.drop_table("push_tokens")

    op.drop_index("ix_help_requests_accepted_by", table_name="help_requests")
    op.drop_table("help_requests")

    op.drop_index("ix_users_phone", table_name="users")
    op.drop_table("users")
