"""
PATHS Backend — Platform admin API surface.

Mounted under /api/v1/admin/* via app.main. Every route requires
account_type='platform_admin' (enforced at the router level).

Endpoints:
  GET  /admin/organization-requests            — list pending/approved/rejected requests
  GET  /admin/organization-requests/{id}       — request detail
  POST /admin/organization-requests/{id}/approve  — approve (status=active)
  POST /admin/organization-requests/{id}/reject   — reject (with reason)
  GET  /admin/organizations                    — list ALL organizations (any status)
  POST /admin/organizations/{id}/suspend       — operator-driven suspension
  POST /admin/organizations/{id}/unsuspend
  GET  /admin/users                            — list all users (paged, filtered)
  GET  /admin/audit                            — recent audit_logs
  GET  /admin/dashboard-stats                  — counts for the admin home page
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_platform_admin
from app.core.rbac import AccountType
from app.db.models.application import OrganizationMember
from app.db.models.organization import (
    Organization,
    OrganizationAccessRequest,
    OrganizationAccessRequestStatus,
    OrganizationStatus,
)
from app.db.models.sync import AuditLog
from app.db.models.user import User
from app.db.repositories.sync_status import write_audit_log


router = APIRouter(
    prefix="/admin",
    tags=["Platform admin"],
    dependencies=[Depends(require_platform_admin)],
)


# ── Schemas ───────────────────────────────────────────────────────────────


class OrgRequestRow(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    requester_user_id: UUID
    requester_name: str
    requester_email: str
    contact_role: str | None = None
    contact_phone: str | None = None
    status: str
    submitted_at: datetime
    reviewed_at: datetime | None = None
    rejection_reason: str | None = None


class OrgRequestDetail(OrgRequestRow):
    organization_industry: str | None = None
    organization_contact_email: str | None = None
    additional_info: str | None = None


class RejectRequestBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=2000)


class SuspendOrgBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=2000)


class OrgRow(BaseModel):
    id: UUID
    name: str
    slug: str
    status: str
    is_active: bool
    industry: str | None = None
    contact_email: str | None = None
    member_count: int
    created_at: datetime


class UserRow(BaseModel):
    id: UUID
    email: str
    full_name: str
    account_type: str
    is_active: bool
    created_at: datetime


class AuditRow(BaseModel):
    id: UUID
    action: str
    entity_type: str
    entity_id: UUID | None
    actor_user_id: UUID | None
    created_at: datetime


class DashboardStats(BaseModel):
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_organizations: int
    active_organizations: int
    suspended_organizations: int
    total_users: int
    candidates: int
    organization_members: int
    platform_admins: int


# ── Helpers ───────────────────────────────────────────────────────────────


def _row_to_request(req: OrganizationAccessRequest, org: Organization, user: User) -> OrgRequestRow:
    return OrgRequestRow(
        id=req.id,
        organization_id=req.organization_id,
        organization_name=org.name,
        organization_slug=org.slug,
        requester_user_id=req.requester_user_id,
        requester_name=user.full_name,
        requester_email=user.email,
        contact_role=req.contact_role,
        contact_phone=req.contact_phone,
        status=req.status,
        submitted_at=req.submitted_at,
        reviewed_at=req.reviewed_at,
        rejection_reason=req.rejection_reason,
    )


def _load_request(db: Session, request_id: UUID) -> tuple[OrganizationAccessRequest, Organization, User]:
    req = db.get(OrganizationAccessRequest, request_id)
    if req is None:
        raise HTTPException(404, detail="organization_access_request_not_found")
    org = db.get(Organization, req.organization_id)
    user = db.get(User, req.requester_user_id)
    if org is None or user is None:
        raise HTTPException(500, detail="orphaned_access_request")
    return req, org, user


# ── Org request endpoints ─────────────────────────────────────────────────


@router.get("/organization-requests", response_model=list[OrgRequestRow])
def list_organization_requests(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = Query(None, description="Match against org name/slug or requester email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[OrgRequestRow]:
    """List access requests, newest first, optionally filtered by status / search."""
    stmt = select(OrganizationAccessRequest, Organization, User).join(
        Organization, Organization.id == OrganizationAccessRequest.organization_id,
    ).join(
        User, User.id == OrganizationAccessRequest.requester_user_id,
    ).order_by(OrganizationAccessRequest.submitted_at.desc())

    if status_filter:
        stmt = stmt.where(OrganizationAccessRequest.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Organization.name).like(like),
                func.lower(Organization.slug).like(like),
                func.lower(User.email).like(like),
                func.lower(User.full_name).like(like),
            )
        )

    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [_row_to_request(req, org, user) for req, org, user in rows]


@router.get("/organization-requests/{request_id}", response_model=OrgRequestDetail)
def get_organization_request(
    request_id: UUID, db: Session = Depends(get_db),
) -> OrgRequestDetail:
    req, org, user = _load_request(db, request_id)
    base = _row_to_request(req, org, user)
    return OrgRequestDetail(
        **base.model_dump(),
        organization_industry=org.industry,
        organization_contact_email=org.contact_email,
        additional_info=req.additional_info,
    )


@router.post("/organization-requests/{request_id}/approve", response_model=OrgRequestDetail)
def approve_organization_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Flip the org to ACTIVE and reactivate the requester's membership."""
    req, org, user = _load_request(db, request_id)

    if req.status != OrganizationAccessRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"request is already {req.status}, cannot approve",
        )

    now = datetime.now(timezone.utc)
    old_org_status = org.status

    org.status = OrganizationStatus.ACTIVE.value
    org.is_active = True
    org.approved_by_admin_id = admin.id
    org.approved_at = now
    # If they were previously rejected/suspended, clear those fields.
    org.rejected_by_admin_id = None
    org.rejected_at = None
    org.rejection_reason = None

    # Reactivate the requester's membership(s) for this org.
    memberships = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
        )
    ).scalars().all()
    for m in memberships:
        m.is_active = True

    req.status = OrganizationAccessRequestStatus.APPROVED.value
    req.reviewed_by_admin_id = admin.id
    req.reviewed_at = now

    write_audit_log(
        db,
        action="org.access_request.approve",
        entity_type="organization",
        entity_id=org.id,
        actor_user_id=admin.id,
        old_value={"status": old_org_status},
        new_value={
            "status": org.status,
            "request_id": str(req.id),
            "requester_email": user.email,
        },
    )
    db.commit()

    db.refresh(req)
    db.refresh(org)
    db.refresh(user)
    base = _row_to_request(req, org, user)
    return OrgRequestDetail(
        **base.model_dump(),
        organization_industry=org.industry,
        organization_contact_email=org.contact_email,
        additional_info=req.additional_info,
    )


@router.post("/organization-requests/{request_id}/reject", response_model=OrgRequestDetail)
def reject_organization_request(
    request_id: UUID,
    body: RejectRequestBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    req, org, user = _load_request(db, request_id)

    if req.status != OrganizationAccessRequestStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"request is already {req.status}, cannot reject",
        )

    now = datetime.now(timezone.utc)
    old_org_status = org.status

    org.status = OrganizationStatus.REJECTED.value
    org.is_active = False
    org.rejected_by_admin_id = admin.id
    org.rejected_at = now
    org.rejection_reason = body.reason

    # Keep all memberships disabled — they were already inactive at signup.
    req.status = OrganizationAccessRequestStatus.REJECTED.value
    req.reviewed_by_admin_id = admin.id
    req.reviewed_at = now
    req.rejection_reason = body.reason

    write_audit_log(
        db,
        action="org.access_request.reject",
        entity_type="organization",
        entity_id=org.id,
        actor_user_id=admin.id,
        old_value={"status": old_org_status},
        new_value={
            "status": org.status,
            "reason": body.reason,
            "request_id": str(req.id),
            "requester_email": user.email,
        },
    )
    db.commit()

    db.refresh(req)
    db.refresh(org)
    db.refresh(user)
    base = _row_to_request(req, org, user)
    return OrgRequestDetail(
        **base.model_dump(),
        organization_industry=org.industry,
        organization_contact_email=org.contact_email,
        additional_info=req.additional_info,
    )


# ── Organizations (admin view) ────────────────────────────────────────────


@router.get("/organizations", response_model=list[OrgRow])
def list_all_organizations(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[OrgRow]:
    stmt = select(
        Organization,
        func.count(OrganizationMember.id).label("member_count"),
    ).outerjoin(
        OrganizationMember, OrganizationMember.organization_id == Organization.id,
    ).group_by(Organization.id).order_by(Organization.created_at.desc())

    if status_filter:
        stmt = stmt.where(Organization.status == status_filter)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Organization.name).like(like),
                func.lower(Organization.slug).like(like),
                func.lower(Organization.contact_email).like(like),
            )
        )

    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [
        OrgRow(
            id=org.id,
            name=org.name,
            slug=org.slug,
            status=org.status,
            is_active=org.is_active,
            industry=org.industry,
            contact_email=org.contact_email,
            member_count=int(member_count),
            created_at=org.created_at,
        )
        for org, member_count in rows
    ]


@router.post("/organizations/{org_id}/suspend", response_model=OrgRow)
def suspend_organization(
    org_id: UUID,
    body: SuspendOrgBody,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    org = db.get(Organization, org_id)
    if org is None:
        raise HTTPException(404, detail="organization_not_found")
    if org.status == OrganizationStatus.SUSPENDED.value:
        raise HTTPException(409, detail="organization_already_suspended")

    old_status = org.status
    org.status = OrganizationStatus.SUSPENDED.value
    org.is_active = False
    org.suspended_at = datetime.now(timezone.utc)
    org.suspended_reason = body.reason

    write_audit_log(
        db,
        action="org.suspend",
        entity_type="organization",
        entity_id=org.id,
        actor_user_id=admin.id,
        old_value={"status": old_status},
        new_value={"status": org.status, "reason": body.reason},
    )
    db.commit()
    db.refresh(org)
    return _org_row(db, org)


@router.post("/organizations/{org_id}/unsuspend", response_model=OrgRow)
def unsuspend_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    org = db.get(Organization, org_id)
    if org is None:
        raise HTTPException(404, detail="organization_not_found")
    if org.status != OrganizationStatus.SUSPENDED.value:
        raise HTTPException(409, detail=f"organization is {org.status}, not suspended")

    old_status = org.status
    org.status = OrganizationStatus.ACTIVE.value
    org.is_active = True
    org.suspended_at = None
    org.suspended_reason = None

    write_audit_log(
        db,
        action="org.unsuspend",
        entity_type="organization",
        entity_id=org.id,
        actor_user_id=admin.id,
        old_value={"status": old_status},
        new_value={"status": org.status},
    )
    db.commit()
    db.refresh(org)
    return _org_row(db, org)


def _org_row(db: Session, org: Organization) -> OrgRow:
    member_count = db.execute(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.organization_id == org.id,
        )
    ).scalar_one()
    return OrgRow(
        id=org.id,
        name=org.name,
        slug=org.slug,
        status=org.status,
        is_active=org.is_active,
        industry=org.industry,
        contact_email=org.contact_email,
        member_count=int(member_count),
        created_at=org.created_at,
    )


# ── Users (admin view) ────────────────────────────────────────────────────


@router.get("/users", response_model=list[UserRow])
def list_users(
    db: Session = Depends(get_db),
    account_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[UserRow]:
    stmt = select(User).order_by(User.created_at.desc())
    if account_type:
        stmt = stmt.where(User.account_type == account_type)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(func.lower(User.email).like(like), func.lower(User.full_name).like(like))
        )
    rows = db.execute(stmt.limit(limit).offset(offset)).scalars().all()
    return [
        UserRow(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            account_type=u.account_type,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in rows
    ]


# ── Audit feed ────────────────────────────────────────────────────────────


@router.get("/audit", response_model=list[AuditRow])
def list_audit(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action_prefix: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
) -> list[AuditRow]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action_prefix:
        stmt = stmt.where(AuditLog.action.like(f"{action_prefix}%"))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    rows = db.execute(stmt.limit(limit).offset(offset)).scalars().all()
    return [
        AuditRow(
            id=r.id,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            actor_user_id=r.actor_user_id,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ── Dashboard stats ───────────────────────────────────────────────────────


@router.get("/dashboard-stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)) -> DashboardStats:
    def _count_req(s: str) -> int:
        return int(db.execute(
            select(func.count(OrganizationAccessRequest.id))
            .where(OrganizationAccessRequest.status == s)
        ).scalar_one())

    def _count_org(s: str) -> int:
        return int(db.execute(
            select(func.count(Organization.id))
            .where(Organization.status == s)
        ).scalar_one())

    def _count_user(t: str) -> int:
        return int(db.execute(
            select(func.count(User.id)).where(User.account_type == t)
        ).scalar_one())

    return DashboardStats(
        pending_requests=_count_req(OrganizationAccessRequestStatus.PENDING.value),
        approved_requests=_count_req(OrganizationAccessRequestStatus.APPROVED.value),
        rejected_requests=_count_req(OrganizationAccessRequestStatus.REJECTED.value),
        total_organizations=int(db.execute(select(func.count(Organization.id))).scalar_one()),
        active_organizations=_count_org(OrganizationStatus.ACTIVE.value),
        suspended_organizations=_count_org(OrganizationStatus.SUSPENDED.value),
        total_users=int(db.execute(select(func.count(User.id))).scalar_one()),
        candidates=_count_user(AccountType.CANDIDATE.value),
        organization_members=_count_user(AccountType.ORGANIZATION_MEMBER.value),
        platform_admins=_count_user(AccountType.PLATFORM_ADMIN.value),
    )
