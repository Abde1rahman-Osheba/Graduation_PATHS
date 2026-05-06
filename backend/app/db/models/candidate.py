"""
PATHS Backend — Candidate model.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Candidate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "candidates"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, unique=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(500), nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    career_level: Mapped[str | None] = mapped_column(String(80), nullable=True)
    skills: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    open_to_job_types: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    open_to_workplace_settings: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    desired_job_titles: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    desired_job_categories: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    # Relationships
    user = relationship("User", back_populates="candidate_profile", lazy="selectin")
    applications = relationship("Application", back_populates="candidate", lazy="selectin")
    evidence_items = relationship("EvidenceItem", back_populates="candidate", lazy="dynamic",
                                  cascade="all, delete-orphan")
    candidate_sources = relationship("CandidateSource", back_populates="candidate", lazy="dynamic",
                                     cascade="all, delete-orphan")
