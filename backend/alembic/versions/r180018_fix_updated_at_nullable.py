"""fix updated_at nullable in candidate sourcing tables

Revision ID: r180018fixupdatedat
Revises: q170017adminowner
Create Date: 2026-05-16
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "r180018fixupdatedat"
down_revision = "q170017adminowner"
branch_labels = None
depends_on = None

# Tables that were created in m130013 with updated_at NOT NULL but the ORM
# model (TimestampMixin) declares it as nullable=True.  Align the DB column
# with the ORM to avoid NotNullViolation on first INSERT.
_TABLES = [
    "organization_candidate_source_settings",
    "job_candidate_pool_configs",
    "candidate_pool_runs",
    "candidate_pool_members",
]


def upgrade() -> None:
    for table in _TABLES:
        op.alter_column(
            table,
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=True,
        )


def downgrade() -> None:
    for table in _TABLES:
        op.alter_column(
            table,
            "updated_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
