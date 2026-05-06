"""
PATHS Backend — Jobs endpoints (recruiter-facing).

GET  /jobs             — list jobs for the current org (enhanced)
GET  /jobs/{id}        — job detail
POST /jobs             — create a manual job posting
PATCH /jobs/{id}       — update job fields
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import OrgContext, get_current_hiring_org_context
from app.db.models.application import Application
from app.db.models.job import Job
from app.db.repositories import job_scraper_repo as scraper_repo
from app.services.job_scraper.job_import_service import JobImportService

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Job.status values treated as publicly visible (existing DB strings only).
_PUBLIC_JOB_STATUSES = frozenset({"active", "open", "live", "published"})


# ── Schemas ────────────────────────────────────────────────────────────────

class JobOut(BaseModel):
    id: UUID
    title: str
    status: str
    company: str | None = None
    company_name: str | None = None
    source: str | None = None
    source_type: str | None = None
    source_platform: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None
    workplace_type: str | None = None
    location: str | None = None
    location_text: str | None = None
    location_mode: str | None = None
    role_family: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    min_years_experience: int | None = None
    max_years_experience: int | None = None
    is_active: bool
    applicant_count: int = 0
    summary: str | None = None
    description: str | None = None
    description_text: str | None = None
    requirements: str | None = None
    job_url: str | None = None
    source_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class JobDetailOut(JobOut):
    """Alias for full job payload (same shape as ``JobOut``)."""


class JobCreateRequest(BaseModel):
    title: str
    summary: str | None = None
    description_text: str | None = None
    requirements: str | None = None
    employment_type: str = "full_time"
    seniority_level: str | None = None
    workplace_type: str | None = None
    location_text: str | None = None
    role_family: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str = "USD"
    min_years_experience: int | None = None
    max_years_experience: int | None = None


class JobImportRunBody(BaseModel):
    """Manual job import (compliant RSS / configured scraper source)."""

    keyword: str | None = None
    location: str | None = None
    limit: int = Field(5, ge=1, le=50)
    source: str | None = Field(
        None,
        description="Override ``JOB_SCRAPER_SOURCE`` (e.g. remoteok_rss, weworkremotely_rss, linkedin).",
    )


class JobImportRunResponse(BaseModel):
    success: bool
    found: int
    inserted: int
    duplicates: int
    failed: int
    errors: list[str] = Field(default_factory=list)


class JobImportPipelineStatus(BaseModel):
    last_run_at: datetime | None = None
    last_success: bool | None = None
    last_inserted_count: int | None = None
    last_error: str | None = None


class JobUpdateRequest(BaseModel):
    title: str | None = None
    status: str | None = None
    summary: str | None = None
    description_text: str | None = None
    requirements: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None
    workplace_type: str | None = None
    location_text: str | None = None
    role_family: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    is_active: bool | None = None


# ── Helpers ────────────────────────────────────────────────────────────────

def _count_applicants(db: Session, job_id: UUID) -> int:
    return db.execute(
        select(func.count()).select_from(Application).where(Application.job_id == job_id)
    ).scalar_one()


def _job_out(job: Job, applicant_count: int = 0) -> JobOut:
    desc = job.description_text
    if desc and len(desc) > 16000:
        desc = desc[:16000] + "…"
    company = job.company_name
    src = job.source_platform or job.source_type or job.source_name
    return JobOut(
        id=job.id,
        title=job.title,
        status=job.status if hasattr(job, "status") else "published",
        company=company,
        company_name=company,
        source=src,
        source_type=job.source_type,
        source_platform=job.source_platform,
        employment_type=job.employment_type,
        seniority_level=job.seniority_level,
        workplace_type=job.workplace_type,
        location=job.location_text,
        location_text=job.location_text,
        location_mode=job.location_mode if hasattr(job, "location_mode") else None,
        role_family=job.role_family,
        salary_min=float(job.salary_min) if job.salary_min else None,
        salary_max=float(job.salary_max) if job.salary_max else None,
        salary_currency=job.salary_currency,
        min_years_experience=job.min_years_experience,
        max_years_experience=job.max_years_experience,
        is_active=job.is_active,
        applicant_count=applicant_count,
        summary=job.summary,
        description=desc,
        description_text=desc,
        requirements=job.requirements,
        job_url=job.source_url,
        source_url=job.source_url,
        created_at=job.created_at if hasattr(job, "created_at") else None,
        updated_at=job.updated_at if hasattr(job, "updated_at") else None,
    )


def _job_detail_out(job: Job, applicant_count: int = 0) -> JobDetailOut:
    return JobDetailOut(**_job_out(job, applicant_count).model_dump())


def _is_publicly_listable(job: Job) -> bool:
    if not job.is_active:
        return False
    st = (job.status or "").strip().lower()
    return st in _PUBLIC_JOB_STATUSES


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post(
    "/import/run",
    response_model=JobImportRunResponse,
    summary="Run one job import cycle (RSS or configured scraper).",
)
async def run_job_import(
    body: JobImportRunBody,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
):
    _ = ctx  # hiring role required
    service = JobImportService()
    try:
        result = await service.run_import(
            limit=body.limit,
            source=body.source,
            admin_override=True,
            keyword=body.keyword,
            location=body.location,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"job_import_failed: {exc}",
        ) from exc
    ok = result.status in ("success", "partial") and result.status != "locked"
    return JobImportRunResponse(
        success=ok,
        found=result.scraped_count,
        inserted=result.inserted_count,
        duplicates=result.skipped_count,
        failed=result.failed_count,
        errors=(result.errors or [])[:25],
    )


@router.get(
    "/import/status",
    response_model=JobImportPipelineStatus,
    summary="Last job import run summary (from job_import_runs).",
)
def job_import_status(
    db: Session = Depends(get_db),
    ctx: OrgContext = Depends(get_current_hiring_org_context),
):
    _ = ctx
    last = scraper_repo.get_latest_import_run(db)
    if last is None:
        return JobImportPipelineStatus()
    success = last.status in ("success", "partial") and not last.error_message
    return JobImportPipelineStatus(
        last_run_at=last.finished_at or last.started_at,
        last_success=success,
        last_inserted_count=last.inserted_count or 0,
        last_error=last.error_message,
    )


@router.get("", response_model=list[JobOut])
def list_jobs(
    active_only: bool = Query(False),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    keyword: str | None = Query(None, description="Search title, company, description"),
    location: str | None = None,
    source: str | None = None,
    company: str | None = None,
    status: str | None = Query(None, description="Exact job status"),
    remote: bool | None = Query(None),
    employment_type: str | None = None,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """List jobs for the current organisation plus platform-wide scraped rows.

    Scraped jobs are stored with ``organization_id IS NULL`` so they are
    visible to every org without duplicating rows.
    """
    q = select(Job).where(
        or_(
            Job.organization_id == ctx.organization_id,
            Job.organization_id.is_(None),
        ),
    )
    if active_only:
        q = q.where(Job.is_active == True)  # noqa: E712
    if keyword and keyword.strip():
        kw = f"%{keyword.strip()}%"
        q = q.where(
            or_(
                Job.title.ilike(kw),
                Job.company_name.ilike(kw),
                Job.description_text.ilike(kw),
                Job.summary.ilike(kw),
            ),
        )
    if location and location.strip():
        loc = f"%{location.strip()}%"
        q = q.where(
            or_(
                Job.location_text.ilike(loc),
                Job.location_normalized.ilike(loc),
            ),
        )
    if source and source.strip():
        s = f"%{source.strip()}%"
        q = q.where(
            or_(
                Job.source_platform.ilike(s),
                Job.source_type.ilike(s),
                Job.source_name.ilike(s),
            ),
        )
    if company and company.strip():
        q = q.where(Job.company_name.ilike(f"%{company.strip()}%"))
    if status and status.strip():
        q = q.where(Job.status == status.strip())
    if remote is True:
        q = q.where(
            or_(
                Job.workplace_type.ilike("remote"),
                Job.location_text.ilike("%remote%"),
                Job.location_mode.ilike("%remote%"),
            ),
        )
    if employment_type and employment_type.strip():
        q = q.where(Job.employment_type.ilike(f"%{employment_type.strip()}%"))

    q = q.order_by(desc(Job.created_at)).limit(limit).offset(offset)
    jobs = db.execute(q).scalars().all()

    # Batch applicant counts
    results = []
    for job in jobs:
        count = _count_applicants(db, job.id)
        results.append(_job_out(job, count))
    return results


@router.get("/public", response_model=list[JobOut])
def list_public_jobs(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Public job listings — no authentication required."""
    q = (
        select(Job)
        .where(
            Job.is_active == True,  # noqa: E712
            Job.status.in_(_PUBLIC_JOB_STATUSES),
        )
        .order_by(desc(Job.created_at))
        .limit(limit)
    )
    jobs = db.execute(q).scalars().all()
    results = []
    for job in jobs:
        count = _count_applicants(db, job.id)
        results.append(_job_out(job, count))
    return results


@router.get("/public/{job_id}", response_model=JobDetailOut)
def get_public_job(
    job_id: UUID,
    db: Session = Depends(get_db),
):
    """Public job detail for apply flows — only active, published-style statuses."""
    job = db.get(Job, job_id)
    if not job or not _is_publicly_listable(job):
        raise HTTPException(status_code=404, detail="Job not found")
    count = _count_applicants(db, job_id)
    return _job_detail_out(job, count)


@router.get("/{job_id}", response_model=JobDetailOut)
def get_job(
    job_id: UUID,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.organization_id is not None and job.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Job not found")
    count = _count_applicants(db, job_id)
    return _job_detail_out(job, count)


@router.post("", response_model=JobDetailOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreateRequest,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """Create a manual job posting for the current organisation."""
    job = Job(
        organization_id=ctx.organization_id,
        title=body.title,
        summary=body.summary,
        description_text=body.description_text,
        requirements=body.requirements,
        employment_type=body.employment_type or "full_time",
        seniority_level=body.seniority_level,
        workplace_type=body.workplace_type,
        location_text=body.location_text,
        role_family=body.role_family,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        salary_currency=body.salary_currency,
        min_years_experience=body.min_years_experience,
        max_years_experience=body.max_years_experience,
        source_type="manual",
        is_active=True,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_detail_out(job, 0)


@router.patch("/{job_id}", response_model=JobDetailOut)
def update_job(
    job_id: UUID,
    body: JobUpdateRequest,
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.organization_id is None:
        raise HTTPException(
            status_code=403,
            detail="Scraped platform jobs cannot be edited via org API",
        )
    if job.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Job not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    count = _count_applicants(db, job_id)
    return _job_detail_out(job, count)
