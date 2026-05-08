"""
PATHS Backend — Assessment Agent API endpoints.

Routes under ``/api/v1/assessments``:

  POST   /assessments                    — create a new assessment
  GET    /assessments/{id}               — get one assessment
  GET    /assessments?application_id=    — list assessments for an application
  PATCH  /assessments/{id}               — update score/status/review
  DELETE /assessments/{id}               — delete an assessment
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    OrgContext,
    get_current_hiring_org_context,
    require_active_org_status,
)
from app.db.models.assessment import Assessment

router = APIRouter(prefix="/assessments", tags=["Assessment Agent"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────


class AssessmentCreate(BaseModel):
    application_id: str
    candidate_id: str
    job_id: str
    title: str = "Skills Assessment"
    assessment_type: str = "coding"
    instructions: str | None = None
    max_score: float | None = None


class AssessmentUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    score: float | None = None
    max_score: float | None = None
    reviewer_notes: str | None = None
    criteria_breakdown: dict[str, Any] | None = None
    submission_text: str | None = None
    submission_uri: str | None = None


class AssessmentOut(BaseModel):
    id: str
    organization_id: str
    application_id: str
    candidate_id: str
    job_id: str
    title: str
    assessment_type: str
    status: str
    score: float | None
    max_score: float | None
    score_percent: float | None
    instructions: str | None
    submission_text: str | None
    submission_uri: str | None
    reviewer_notes: str | None
    criteria_breakdown: dict[str, Any] | None
    assigned_at: str | None
    submitted_at: str | None
    reviewed_at: str | None
    created_at: str | None

    model_config = {"from_attributes": True}


def _to_out(a: Assessment) -> AssessmentOut:
    return AssessmentOut(
        id=str(a.id),
        organization_id=str(a.organization_id),
        application_id=str(a.application_id),
        candidate_id=str(a.candidate_id),
        job_id=str(a.job_id),
        title=a.title,
        assessment_type=a.assessment_type,
        status=a.status,
        score=a.score,
        max_score=a.max_score,
        score_percent=a.score_percent,
        instructions=a.instructions,
        submission_text=a.submission_text,
        submission_uri=a.submission_uri,
        reviewer_notes=a.reviewer_notes,
        criteria_breakdown=a.criteria_breakdown,
        assigned_at=a.assigned_at.isoformat() if a.assigned_at else None,
        submitted_at=a.submitted_at.isoformat() if a.submitted_at else None,
        reviewed_at=a.reviewed_at.isoformat() if a.reviewed_at else None,
        created_at=a.created_at.isoformat() if a.created_at else None,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("", response_model=AssessmentOut, status_code=status.HTTP_201_CREATED)
def create_assessment(
    body: AssessmentCreate,
    ctx: OrgContext = Depends(require_active_org_status),
    db: Session = Depends(get_db),
):
    """Create a new assessment for a candidate on a job."""
    assessment = Assessment(
        id=uuid.uuid4(),
        organization_id=ctx.organization_id,
        application_id=uuid.UUID(body.application_id),
        candidate_id=uuid.UUID(body.candidate_id),
        job_id=uuid.UUID(body.job_id),
        title=body.title,
        assessment_type=body.assessment_type,
        status="pending",
        instructions=body.instructions,
        max_score=body.max_score,
        assigned_at=datetime.now(timezone.utc),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _to_out(assessment)


@router.get("", response_model=list[AssessmentOut])
def list_assessments(
    application_id: str | None = Query(None),
    candidate_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """List assessments scoped to the current organisation."""
    q = select(Assessment).where(Assessment.organization_id == ctx.organization_id)
    if application_id:
        q = q.where(Assessment.application_id == uuid.UUID(application_id))
    if candidate_id:
        q = q.where(Assessment.candidate_id == uuid.UUID(candidate_id))
    if status_filter:
        q = q.where(Assessment.status == status_filter)
    q = q.order_by(Assessment.created_at.desc()).limit(limit)
    rows = db.execute(q).scalars().all()
    return [_to_out(r) for r in rows]


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: uuid.UUID,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """Get a single assessment by ID."""
    a = db.get(Assessment, assessment_id)
    if a is None or a.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return _to_out(a)


@router.patch("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: uuid.UUID,
    body: AssessmentUpdate,
    ctx: OrgContext = Depends(require_active_org_status),
    db: Session = Depends(get_db),
):
    """Update assessment score, status, or reviewer notes."""
    a = db.get(Assessment, assessment_id)
    if a is None or a.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if body.title is not None:
        a.title = body.title
    if body.status is not None:
        before = a.status
        a.status = body.status
        if body.status == "submitted" and before != "submitted":
            a.submitted_at = datetime.now(timezone.utc)
        if body.status == "reviewed" and before != "reviewed":
            a.reviewed_at = datetime.now(timezone.utc)
    if body.score is not None:
        a.score = body.score
    if body.max_score is not None:
        a.max_score = body.max_score
    if body.score is not None and a.max_score and a.max_score > 0:
        a.score_percent = (body.score / a.max_score) * 100
    if body.reviewer_notes is not None:
        a.reviewer_notes = body.reviewer_notes
    if body.criteria_breakdown is not None:
        a.criteria_breakdown = body.criteria_breakdown
    if body.submission_text is not None:
        a.submission_text = body.submission_text
    if body.submission_uri is not None:
        a.submission_uri = body.submission_uri

    db.commit()
    db.refresh(a)
    return _to_out(a)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    assessment_id: uuid.UUID,
    ctx: OrgContext = Depends(require_active_org_status),
    db: Session = Depends(get_db),
):
    """Delete an assessment."""
    a = db.get(Assessment, assessment_id)
    if a is None or a.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(a)
    db.commit()
