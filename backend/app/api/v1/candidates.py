import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.candidate_access import org_can_view_candidate
from app.core.dependencies import (
    get_current_active_user,
    HIRING_STAFF_ROLE_CODES,
    oauth2_scheme,
)
from app.core.security import decode_access_token
from app.core.database import get_db
from app.db.models.application import Application, AuditEvent
from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateSkill, CandidateExperience, CandidateEducation, CandidateCertification
from app.db.models.job import Job as JobModel
from app.db.models.scoring import CandidateJobScore
from app.db.models.user import User
from app.schemas.candidate import CandidateProfileOut, CandidateProfileUpdateRequest

router = APIRouter(prefix="/candidates", tags=["Candidates"])

def _profile_out(cand: Candidate) -> CandidateProfileOut:
    return CandidateProfileOut(
        id=cand.id,
        full_name=cand.full_name,
        email=cand.email,
        phone=cand.phone,
        location=cand.location_text,
        headline=cand.headline,
        years_experience=cand.years_experience,
        career_level=cand.career_level,
        skills=list(cand.skills or []),
        open_to_job_types=list(cand.open_to_job_types or []),
        open_to_workplace_settings=list(cand.open_to_workplace_settings or []),
        desired_job_titles=list(cand.desired_job_titles or []),
        desired_job_categories=list(cand.desired_job_categories or []),
    )


@router.get("/me/profile", response_model=CandidateProfileOut)
async def get_my_candidate_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.account_type != "candidate":
        raise HTTPException(status_code=403, detail="Candidate account required")
    cand = current_user.candidate_profile
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return _profile_out(cand)


@router.put("/me/profile", response_model=CandidateProfileOut)
async def update_my_candidate_profile(
    body: CandidateProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.account_type != "candidate":
        raise HTTPException(status_code=403, detail="Candidate account required")
    cand = current_user.candidate_profile
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    if body.full_name is not None:
        cand.full_name = body.full_name.strip()
        current_user.full_name = body.full_name.strip()
    if body.phone is not None:
        cand.phone = body.phone.strip() or None
    if body.years_experience is not None:
        cand.years_experience = body.years_experience
    if body.career_level is not None:
        cand.career_level = body.career_level.strip() or None

    if body.skills is not None:
        cand.skills = [s.strip() for s in body.skills if s.strip()][:100]
    if body.open_to_job_types is not None:
        cand.open_to_job_types = [s.strip() for s in body.open_to_job_types if s.strip()][:10]
    if body.open_to_workplace_settings is not None:
        cand.open_to_workplace_settings = [
            s.strip() for s in body.open_to_workplace_settings if s.strip()
        ][:10]
    if body.desired_job_titles is not None:
        cand.desired_job_titles = [s.strip() for s in body.desired_job_titles if s.strip()][:10]
    if body.desired_job_categories is not None:
        cand.desired_job_categories = [
            s.strip() for s in body.desired_job_categories if s.strip()
        ][:20]

    db.commit()
    db.refresh(cand)
    return _profile_out(cand)


@router.get("/me/applications")
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return applications submitted by the current candidate user."""
    if current_user.account_type != "candidate":
        raise HTTPException(status_code=403, detail="Candidate account required")
    cand = current_user.candidate_profile
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    apps = db.execute(
        select(Application)
        .where(Application.candidate_id == cand.id)
        .order_by(desc(Application.created_at))
    ).scalars().all()

    result = []
    for app in apps:
        job = app.job
        result.append({
            "id": str(app.id),
            "job_id": str(app.job_id),
            "job_title": job.title if job else None,
            "company_name": job.company_name if job else None,
            "location_text": job.location_text if job else None,
            "workplace_type": job.workplace_type if job else None,
            "current_stage_code": app.current_stage_code,
            "overall_status": app.overall_status,
            "created_at": app.created_at.isoformat(),
        })
    return result


@router.post("/me/jobs/{job_id}/apply", status_code=201)
async def apply_to_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Candidate submits a direct application for a job.

    Returns 201 on success, 403 for wrong role, 404 for missing profile/job,
    409 when already applied.
    """
    if current_user.account_type != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidate accounts can apply for jobs",
        )

    cand = current_user.candidate_profile
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found. Please complete your profile first.",
        )

    # Verify the job exists and is accepting applications
    job = db.get(JobModel, job_id)
    if not job or not job.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or no longer accepting applications",
        )

    # External scraped jobs: redirect candidate to original posting
    app_mode = getattr(job, "application_mode", "internal_apply")
    if app_mode == "external_redirect":
        ext_url = job.external_apply_url or job.source_url
        if not ext_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This external job has no apply URL configured",
            )
        return {
            "external_apply_url": ext_url,
            "message": "This job is hosted externally. Redirecting to original posting.",
        }

    # Duplicate check — 409 Conflict
    existing = db.execute(
        select(Application).where(
            Application.candidate_id == cand.id,
            Application.job_id == job_id,
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied for this job",
        )

    new_app = Application(
        candidate_id=cand.id,
        job_id=job_id,
        application_type="direct",
        source_channel="candidate_portal",
        current_stage_code="applied",
        overall_status="active",
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "id": str(new_app.id),
        "job_id": str(job_id),
        "stage": "applied",
        "message": "Application submitted successfully",
    }


@router.get("/me/jobs/{job_id}/application-status")
async def get_job_application_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Check whether the current candidate has already applied to a job."""
    if current_user.account_type != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidate accounts can check application status",
        )

    cand = current_user.candidate_profile
    if not cand:
        return {"applied": False, "application_id": None, "stage": None}

    existing = db.execute(
        select(Application).where(
            Application.candidate_id == cand.id,
            Application.job_id == job_id,
        )
    ).scalar_one_or_none()

    if existing:
        return {
            "applied": True,
            "application_id": str(existing.id),
            "stage": existing.current_stage_code,
        }

    return {"applied": False, "application_id": None, "stage": None}


def _ensure_can_read_candidate(
    db: Session,
    current_user: User,
    bearer_token: str,
    cand_uuid: uuid.UUID,
) -> None:
    if current_user.account_type == "candidate":
        own = current_user.candidate_profile
        if not own or own.id != cand_uuid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view this candidate",
            )
        return
    if current_user.account_type != "organization_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this candidate",
        )
    payload = decode_access_token(bearer_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    role = payload.get("role_code") or ""
    if role not in HIRING_STAFF_ROLE_CODES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires a recruiter, HR, or hiring manager role",
        )
    org_id_raw = payload.get("organization_id")
    if not org_id_raw:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization in token")
    org_id = uuid.UUID(org_id_raw)
    if not org_can_view_candidate(db, org_id, cand_uuid):
        raise HTTPException(status_code=404, detail="Candidate not found")


@router.get("/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    bearer_token: str = Depends(oauth2_scheme),
):
    try:
        cand_uuid = uuid.UUID(candidate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id UUID")

    _ensure_can_read_candidate(db, current_user, bearer_token, cand_uuid)

    cand = db.get(Candidate, cand_uuid)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    skills = db.execute(select(CandidateSkill).where(CandidateSkill.candidate_id == cand_uuid)).scalars().all()
    experiences = db.execute(select(CandidateExperience).where(CandidateExperience.candidate_id == cand_uuid)).scalars().all()
    education = db.execute(select(CandidateEducation).where(CandidateEducation.candidate_id == cand_uuid)).scalars().all()
    certifications = db.execute(select(CandidateCertification).where(CandidateCertification.candidate_id == cand_uuid)).scalars().all()

    return {
        "candidate": {
            "id": str(cand.id),
            "full_name": cand.full_name,
            "email": cand.email,
            "phone": cand.phone,
            "location_text": cand.location_text,
            "current_title": cand.current_title,
            "headline": cand.headline,
            "summary": cand.summary,
            "years_experience": cand.years_experience,
            "career_level": cand.career_level,
            "skills": list(cand.skills or []),
            "open_to_job_types": list(cand.open_to_job_types or []),
            "open_to_workplace_settings": list(cand.open_to_workplace_settings or []),
            "desired_job_titles": list(cand.desired_job_titles or []),
            "desired_job_categories": list(cand.desired_job_categories or []),
        },
        "skills": [{"skill_id": str(s.skill_id), "score": s.proficiency_score} for s in skills],
        "experiences": [{"company": e.company_name, "title": e.title} for e in experiences],
        "education": [{"institution": e.institution, "degree": e.degree} for e in education],
        "certifications": [{"name": c.name, "issuer": c.issuer} for c in certifications]
    }


@router.get("/{candidate_id}/profile")
async def get_candidate_profile_detail(
    candidate_id: str,
    job_id: str | None = Query(default=None, description="Include scores for this job"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    bearer_token: str = Depends(oauth2_scheme),
):
    """Full candidate profile: CV + score breakdown + activity timeline."""
    try:
        cand_uuid = uuid.UUID(candidate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid candidate_id UUID")

    _ensure_can_read_candidate(db, current_user, bearer_token, cand_uuid)

    cand = db.get(Candidate, cand_uuid)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # CV layers
    experiences = db.execute(
        select(CandidateExperience)
        .where(CandidateExperience.candidate_id == cand_uuid)
        .order_by(desc(CandidateExperience.start_date))
    ).scalars().all()

    education = db.execute(
        select(CandidateEducation)
        .where(CandidateEducation.candidate_id == cand_uuid)
    ).scalars().all()

    skills = db.execute(
        select(CandidateSkill).where(CandidateSkill.candidate_id == cand_uuid)
    ).scalars().all()

    certifications = db.execute(
        select(CandidateCertification).where(CandidateCertification.candidate_id == cand_uuid)
    ).scalars().all()

    # Scores (for a specific job context if provided)
    scores = []
    overall_score = None
    pipeline_stage = None

    if job_id:
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid job_id UUID")

        score_row = db.execute(
            select(CandidateJobScore)
            .where(
                CandidateJobScore.candidate_id == cand_uuid,
                CandidateJobScore.job_id == job_uuid,
            )
            .order_by(desc(CandidateJobScore.scored_at))
            .limit(1)
        ).scalar_one_or_none()

        if score_row:
            overall_score = float(score_row.final_score)
            breakdown = score_row.criteria_breakdown or {}
            for criterion, detail in breakdown.items():
                if isinstance(detail, dict):
                    scores.append({
                        "criterion": criterion,
                        "score": detail.get("score"),
                        "weight": detail.get("weight"),
                        "reasoning": detail.get("reasoning"),
                    })

        app_row = db.execute(
            select(Application)
            .where(Application.candidate_id == cand_uuid, Application.job_id == job_uuid)
            .limit(1)
        ).scalar_one_or_none()
        if app_row:
            pipeline_stage = app_row.pipeline_stage

    # Activity timeline from audit_events
    activity_rows = db.execute(
        select(AuditEvent)
        .where(AuditEvent.entity_id == str(cand_uuid))
        .order_by(desc(AuditEvent.created_at))
        .limit(20)
    ).scalars().all()

    activity = [
        {
            "type": row.action,
            "at": row.created_at.isoformat(),
            "actor": row.actor_id,
            "payload": row.after_jsonb or {},
        }
        for row in activity_rows
    ]

    return {
        "id": str(cand.id),
        "name": cand.full_name,
        "headline": cand.headline,
        "location": cand.location_text,
        "email_masked": (cand.email[:3] + "***@***" + cand.email.split("@")[-1][-4:]) if cand.email else None,
        "phone_masked": ("***-***-" + cand.phone[-4:]) if cand.phone else None,
        "current_role": cand.current_title,
        "years_experience": cand.years_experience,
        "overall_score": overall_score,
        "pipeline_stage": pipeline_stage,
        "cv": {
            "experience": [
                {
                    "company": e.company_name,
                    "title": e.title,
                    "start_date": e.start_date.isoformat() if e.start_date else None,
                    "end_date": e.end_date.isoformat() if e.end_date else None,
                    "description": e.description,
                }
                for e in experiences
            ],
            "education": [
                {
                    "institution": e.institution,
                    "degree": e.degree,
                    "field": e.field_of_study,
                    "graduation_year": e.graduation_year,
                }
                for e in education
            ],
            "skills": [{"skill_id": str(s.skill_id), "proficiency": s.proficiency_score} for s in skills],
            "certifications": [{"name": c.name, "issuer": c.issuer} for c in certifications],
        },
        "scores": scores,
        "activity": activity,
    }
