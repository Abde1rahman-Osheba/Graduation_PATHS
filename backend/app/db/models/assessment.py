"""
PATHS Backend — Assessment Agent ORM models.

Tracks skill assessments (coding tests, assignments, practical tasks)
associated with a candidate's application.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.db.models.base import Base


class Assessment(Base):
    """One assessment attempt for a candidate on a job."""

    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_id = Column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Assessment metadata
    title = Column(String(200), nullable=False, default="Skills Assessment")
    assessment_type = Column(
        String(50), nullable=False, default="coding",
        comment="coding | assignment | practical | quiz | take_home",
    )
    status = Column(
        String(30), nullable=False, default="pending",
        comment="pending | in_progress | submitted | reviewed | expired",
    )

    # Scores
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    score_percent = Column(Float, nullable=True)

    # Content
    instructions = Column(Text, nullable=True)
    submission_text = Column(Text, nullable=True)
    submission_uri = Column(String(500), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    criteria_breakdown = Column(JSON, nullable=True)

    # Timestamps
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<Assessment id={self.id} type={self.assessment_type} "
            f"status={self.status} score={self.score}>"
        )
