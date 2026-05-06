"""
PATHS Backend — Candidate profile schemas.
"""

from uuid import UUID

from pydantic import BaseModel, Field


class CandidateProfileOut(BaseModel):
    id: UUID
    full_name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    headline: str | None = None
    years_experience: int | None = None
    career_level: str | None = None
    skills: list[str] = Field(default_factory=list)
    open_to_job_types: list[str] = Field(default_factory=list)
    open_to_workplace_settings: list[str] = Field(default_factory=list)
    desired_job_titles: list[str] = Field(default_factory=list)
    desired_job_categories: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class CandidateProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    years_experience: int | None = Field(default=None, ge=0, le=80)
    career_level: str | None = Field(default=None, max_length=80)
    # Use None = "omit field" so partial PUTs do not clear existing lists.
    skills: list[str] | None = Field(default=None, max_length=100)
    open_to_job_types: list[str] | None = Field(default=None, max_length=10)
    open_to_workplace_settings: list[str] | None = Field(default=None, max_length=10)
    desired_job_titles: list[str] | None = Field(default=None, max_length=10)
    desired_job_categories: list[str] | None = Field(default=None, max_length=20)
