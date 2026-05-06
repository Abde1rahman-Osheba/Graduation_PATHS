"""
Candidate data visibility for mixed candidate vs organisation users.

No schema changes — uses existing Application, Job, and Interview rows.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.interview import Interview
from app.db.models.job import Job


def org_can_view_candidate(db: Session, org_id: uuid.UUID, candidate_id: uuid.UUID) -> bool:
    """True if the organisation has a hiring touchpoint with this candidate."""
    app_row = db.execute(
        select(Application.id)
        .join(Job, Job.id == Application.job_id)
        .where(
            Application.candidate_id == candidate_id,
            Job.organization_id == org_id,
        )
        .limit(1),
    ).scalar_one_or_none()
    if app_row is not None:
        return True
    inv_row = db.execute(
        select(Interview.id)
        .where(
            Interview.candidate_id == candidate_id,
            Interview.organization_id == org_id,
        )
        .limit(1),
    ).scalar_one_or_none()
    return inv_row is not None
