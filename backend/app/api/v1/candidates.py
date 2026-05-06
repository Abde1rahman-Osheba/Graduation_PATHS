import uuid
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.db.models.application import Application
from app.db.models.candidate import Candidate
from app.db.models.cv_entities import CandidateSkill, CandidateExperience, CandidateEducation, CandidateCertification
from app.db.models.job import Job as JobModel
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
