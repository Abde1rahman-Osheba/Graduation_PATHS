"""
PATHS Backend — Organization management endpoints.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from sqlalchemy import desc, select

from app.core.database import get_db
from app.core.dependencies import (
    OrgContext,
    get_current_active_user,
    get_current_hiring_org_context,
    require_org_role,
    require_organization_member,
)
from app.db.models.application import OrganizationMember
from app.db.models.job import Job
from app.db.models.organization import Organization
from app.db.models.user import User
from app.schemas.organization import CreateMemberRequest, CreateMemberResponse, JobListItem
from app.services import organization_service

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me")
def get_my_org(
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """Return the current user's organisation profile."""
    org = db.get(Organization, ctx.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "industry": org.industry,
        "contactEmail": org.contact_email,
        "isActive": org.is_active,
    }


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    role_code: str
    is_active: bool
    joined_at: datetime
    full_name: str | None = None
    email: str | None = None

    model_config = {"from_attributes": True}


@router.post(
    "/{organization_id}/members",
    response_model=CreateMemberResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_org_role("org_admin"))],
)
def create_organization_member(
    organization_id: UUID,
    data: CreateMemberRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new user assigned to the specified organization.
    Only users with 'org_admin' role in this organization can call this endpoint.
    """
    return organization_service.create_member(db, organization_id, data, current_user)


@router.get(
    "/{organization_id}/members",
    response_model=list[MemberOut],
    dependencies=[Depends(require_organization_member)],
)
def list_organization_members(
    organization_id: UUID,
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """List members of the specified organisation."""
    q = select(OrganizationMember).where(
        OrganizationMember.organization_id == organization_id
    )
    if active_only:
        q = q.where(OrganizationMember.is_active == True)  # noqa: E712
    q = q.order_by(OrganizationMember.joined_at.asc())
    rows = db.execute(q).scalars().all()

    result = []
    for m in rows:
        result.append(MemberOut(
            id=m.id,
            user_id=m.user_id,
            organization_id=m.organization_id,
            role_code=m.role_code,
            is_active=m.is_active,
            joined_at=m.joined_at,
            full_name=m.user.full_name if m.user else None,
            email=m.user.email if m.user else None,
        ))
    return result


# Convenience endpoint — list members for the JWT-scoped org (no path param)
@router.get("/me/members", response_model=list[MemberOut])
def list_my_org_members(
    ctx: OrgContext = Depends(get_current_hiring_org_context),
    db: Session = Depends(get_db),
):
    """List members for the current user's organisation (uses JWT org context)."""
    rows = db.execute(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == ctx.organization_id)
        .order_by(OrganizationMember.joined_at.asc())
    ).scalars().all()
    return [
        MemberOut(
            id=m.id,
            user_id=m.user_id,
            organization_id=m.organization_id,
            role_code=m.role_code,
            is_active=m.is_active,
            joined_at=m.joined_at,
            full_name=m.user.full_name if m.user else None,
            email=m.user.email if m.user else None,
        )
        for m in rows
    ]


@router.get(
    "/{organization_id}/jobs",
    response_model=list[JobListItem],
    dependencies=[Depends(require_organization_member)],
)
def list_organization_jobs(
    organization_id: UUID,
    db: Session = Depends(get_db),
    limit: int = 200,
    offset: int = 0,
):
    """
    List jobs owned by the organisation (for recruiter dashboards and matching UI).
    """
    if limit < 1 or limit > 500:
        limit = 200
    if offset < 0:
        offset = 0
    rows = (
        db.execute(
            select(Job)
            .where(Job.organization_id == organization_id)
            .order_by(desc(Job.created_at))
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return [JobListItem.model_validate(r) for r in rows]
