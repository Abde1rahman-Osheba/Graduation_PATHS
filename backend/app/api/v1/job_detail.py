"""
PATHS Backend — Job Detail Hub endpoints (Phase 1).

GET  /jobs/{job_id}/detail          — full job with stats + fairness rubric
GET  /jobs/{job_id}/pipeline-stages — per-stage counts + 5-candidate preview
GET  /jobs/{job_id}/candidates      — paged candidates table with filtering
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import OrgContext, get_current_hiring_org_context
from app.db.models.application import Application
from app.db.models.candidate import Candidate
from app.db.models.fairness_rubric import FairnessRubric
from app.db.models.job import Job
from app.db.models.scoring import CandidateJobScore

router = APIRouter(prefix="/jobs", tags=["Job Detail"])

# ── Stage ordering ────────────────────────────────────────────────────────

PIPELINE_STAGES = [
    "define", "source", "screen", "shortlist",
    "reveal", "outreach", "interview", "evaluate", "decide",
]


# ── Schemas ───────────────────────────────────────────────────────────────

class FairnessRubricOut(BaseModel):
    protected_attrs: dict
    disparate_impact_threshold: float
    enabled: bool


class SkillWeight(BaseModel):
    name: str
    weight: int


class StageStats(BaseModel):
    define: int = 0
    source: int = 0
    screen: int = 0
    shortlist: int = 0
    reveal: int = 0
    outreach: int = 0
    interview: int = 0
    evaluate: int = 0
    decide: int = 0


class JobStats(BaseModel):
    total_candidates: int
    by_stage: StageStats


class JobDetailOut(BaseModel):
    id: UUID
    title: str
    department: str | None
    location: str | None
    employment_type: str | None
    salary_min: float | None
    salary_max: float | None
    description: str | None
    required_skills: list[SkillWeight]
    optional_skills: list[SkillWeight]
    status: str
    posted_at: str | None
    created_at: str | None
    updated_at: str | None
    stats: JobStats
    fairness_rubric: FairnessRubricOut | None

    model_config = {"from_attributes": True}


class StageCandidatePreview(BaseModel):
    id: UUID
    name: str
    score: float | None


class PipelineStageOut(BaseModel):
    key: str
    count: int
    preview: list[StageCandidatePreview]


class PipelineStagesOut(BaseModel):
    stages: list[PipelineStageOut]


class CandidateListItem(BaseModel):
    id: UUID
    application_id: UUID
    name: str
    headline: str | None
    overall_score: float | None
    pipeline_stage: str
    source_channel: str | None
    created_at: str | None


class CandidateListOut(BaseModel):
    items: list[CandidateListItem]
    total: int
    page: int
    page_size: int


# ── Helpers ───────────────────────────────────────────────────────────────

def _get_job_or_404(job_id: UUID, org_id: UUID, db: Session) -> Job:
    job = db.get(Job, job_id)
    if not job or job.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return job


def _stage_counts(job_id: UUID, db: Session) -> dict[str, int]:
    rows = (
        db.execute(
            select(Application.pipeline_stage, func.count().label("n"))
            .where(Application.job_id == job_id)
            .group_by(Application.pipeline_stage)
        )
        .all()
    )
    return {r.pipeline_stage: r.n for r in rows}


def _candidate_score(candidate_id: UUID, job_id: UUID, db: Session) -> float | None:
    score_row = db.execute(
        select(CandidateJobScore.final_score)
        .where(
            CandidateJobScore.candidate_id == candidate_id,
            CandidateJobScore.job_id == job_id,
        )
        .order_by(CandidateJobScore.scored_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return float(score_row) if score_row is not None else None


def _build_stats(job_id: UUID, db: Session) -> JobStats:
    counts = _stage_counts(job_id, db)
    total = sum(counts.values())
    return JobStats(
        total_candidates=total,
        by_stage=StageStats(**{s: counts.get(s, 0) for s in PIPELINE_STAGES}),
    )


def _build_rubric(job: Job) -> FairnessRubricOut | None:
    if job.fairness_rubric is None:
        return None
    r = job.fairness_rubric
    return FairnessRubricOut(
        protected_attrs=r.protected_attrs,
        disparate_impact_threshold=r.disparate_impact_threshold,
        enabled=r.enabled,
    )


def _parse_skills(raw: list | None) -> list[SkillWeight]:
    if not raw:
        return []
    result = []
    for item in raw:
        if isinstance(item, dict):
            result.append(SkillWeight(name=item.get("name", ""), weight=item.get("weight", 1)))
        elif isinstance(item, str):
            result.append(SkillWeight(name=item, weight=1))
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/{job_id}/detail", response_model=JobDetailOut)
def get_job_detail(
    job_id: UUID,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
) -> JobDetailOut:
    job = _get_job_or_404(job_id, ctx.organization_id, db)
    stats = _build_stats(job_id, db)

    req_skills = _parse_skills(getattr(job, "required_skills", None))
    opt_skills = _parse_skills(getattr(job, "optional_skills", None))

    return JobDetailOut(
        id=job.id,
        title=job.title,
        department=getattr(job, "department", None),
        location=job.location_text or job.location,
        employment_type=job.employment_type,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        description=job.description_html or job.description_text,
        required_skills=req_skills,
        optional_skills=opt_skills,
        status=job.status if hasattr(job, "status") else ("active" if job.is_active else "inactive"),
        posted_at=job.created_at.isoformat() if job.created_at else None,
        created_at=job.created_at.isoformat() if job.created_at else None,
        updated_at=job.updated_at.isoformat() if job.updated_at else None,
        stats=stats,
        fairness_rubric=_build_rubric(job),
    )


@router.get("/{job_id}/pipeline-stages", response_model=PipelineStagesOut)
def get_pipeline_stages(
    job_id: UUID,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
) -> PipelineStagesOut:
    _get_job_or_404(job_id, ctx.organization_id, db)
    counts = _stage_counts(job_id, db)

    stages = []
    for key in PIPELINE_STAGES:
        count = counts.get(key, 0)
        # Fetch up to 5 candidate previews for this stage
        apps = (
            db.execute(
                select(Application)
                .where(Application.job_id == job_id, Application.pipeline_stage == key)
                .limit(5)
            )
            .scalars()
            .all()
        )
        preview = []
        for app in apps:
            cand: Candidate | None = app.candidate
            if cand:
                preview.append(
                    StageCandidatePreview(
                        id=cand.id,
                        name=getattr(cand, "full_name", None) or getattr(cand, "name", "Unknown"),
                        score=_candidate_score(cand.id, job_id, db),
                    )
                )
        stages.append(PipelineStageOut(key=key, count=count, preview=preview))

    return PipelineStagesOut(stages=stages)


@router.get("/{job_id}/candidates", response_model=CandidateListOut)
def list_job_candidates(
    job_id: UUID,
    stage: str | None = Query(default=None),
    min_score: float | None = Query(default=None, ge=0, le=100),
    source: str | None = Query(default=None),
    q: str | None = Query(default=None),
    sort: str = Query(default="score_desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
) -> CandidateListOut:
    _get_job_or_404(job_id, ctx.organization_id, db)

    stmt = select(Application).where(Application.job_id == job_id)

    if stage:
        stmt = stmt.where(Application.pipeline_stage == stage)
    if source:
        stmt = stmt.where(Application.source_channel == source)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    apps = db.execute(stmt).scalars().all()

    items: list[CandidateListItem] = []
    for app in apps:
        cand: Candidate | None = app.candidate
        if not cand:
            continue
        name = getattr(cand, "full_name", None) or getattr(cand, "name", "Unknown")
        if q and q.lower() not in name.lower():
            continue
        score = _candidate_score(cand.id, job_id, db)
        if min_score is not None and (score is None or score < min_score):
            continue
        items.append(
            CandidateListItem(
                id=cand.id,
                application_id=app.id,
                name=name,
                headline=getattr(cand, "headline", None),
                overall_score=score,
                pipeline_stage=app.pipeline_stage,
                source_channel=app.source_channel,
                created_at=app.created_at.isoformat() if app.created_at else None,
            )
        )

    return CandidateListOut(items=items, total=total, page=page, page_size=page_size)
