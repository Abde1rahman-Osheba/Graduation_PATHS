from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models.contact_enrichment import EnrichedContact
from app.schemas.contact_enrichment import EnrichedContactOut, EnrichmentStatusOut

logger = logging.getLogger(__name__)


def _contact_to_out(c: EnrichedContact) -> EnrichedContactOut:
    return EnrichedContactOut(
        id=c.id,
        candidate_id=c.candidate_id,
        organization_id=c.organization_id,
        contact_type=c.contact_type,
        original_value=c.original_value,
        enriched_value=c.enriched_value,
        confidence=c.confidence,
        status=c.status,
        source=c.source,
        provenance=c.provenance,
        validated_at=c.validated_at,
        approved_by=c.approved_by,
        approved_at=c.approved_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def get_enrichment_status(db: Session, org_id: UUID) -> EnrichmentStatusOut:
    """Return summary stats (pending/approved/rejected by contact type)."""
    total = db.scalar(
        select(func.count(EnrichedContact.id)).where(EnrichedContact.organization_id == org_id)
    ) or 0
    pending = db.scalar(
        select(func.count(EnrichedContact.id)).where(
            EnrichedContact.organization_id == org_id,
            EnrichedContact.status == "pending",
        )
    ) or 0
    approved = db.scalar(
        select(func.count(EnrichedContact.id)).where(
            EnrichedContact.organization_id == org_id,
            EnrichedContact.status == "approved",
        )
    ) or 0
    rejected = db.scalar(
        select(func.count(EnrichedContact.id)).where(
            EnrichedContact.organization_id == org_id,
            EnrichedContact.status == "rejected",
        )
    ) or 0

    rows = db.execute(
        select(EnrichedContact.contact_type, func.count(EnrichedContact.id))
        .where(EnrichedContact.organization_id == org_id)
        .group_by(EnrichedContact.contact_type)
    ).all()
    by_type = {row[0]: row[1] for row in rows}

    status_rows = db.execute(
        select(EnrichedContact.status, func.count(EnrichedContact.id))
        .where(EnrichedContact.organization_id == org_id)
        .group_by(EnrichedContact.status)
    ).all()
    by_status = {row[0]: row[1] for row in status_rows}

    return EnrichmentStatusOut(
        total=total,
        pending=pending,
        approved=approved,
        rejected=rejected,
        by_type=by_type,
        by_status=by_status,
    )


def list_contacts(
    db: Session,
    org_id: UUID,
    status: str | None = None,
    contact_type: str | None = None,
) -> list[EnrichedContactOut]:
    """List enriched contacts with optional filters."""
    query = select(EnrichedContact).where(EnrichedContact.organization_id == org_id)
    if status:
        query = query.where(EnrichedContact.status == status)
    if contact_type:
        query = query.where(EnrichedContact.contact_type == contact_type)
    query = query.order_by(EnrichedContact.created_at.desc())
    contacts = db.scalars(query).all()
    return [_contact_to_out(c) for c in contacts]


def validate_email(email: str) -> dict:
    """Simple format validation + domain check.

    No external API calls — shows 'not configured' if no provider is set up.
    """
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    is_valid_format = bool(re.match(pattern, email))

    domain = email.split("@")[-1] if "@" in email else None

    result = {
        "email": email,
        "is_valid_format": is_valid_format,
        "domain": domain,
        "domain_has_mx": None,
        "is_disposable": None,
        "provider_configured": False,
        "provider_note": "External enrichment providers are not configured. "
        "Email validation and API-based enrichment require provider credentials.",
    }

    if is_valid_format and domain:
        try:
            import dns.resolver  # noqa: F811
            try:
                dns.resolver.resolve(domain, "MX", lifetime=5)
                result["domain_has_mx"] = True
            except Exception:  # noqa: BLE001
                result["domain_has_mx"] = False
        except ImportError:
            result["domain_has_mx"] = None

    return result


def _get_contact_or_404(db: Session, org_id: UUID, contact_id: UUID) -> EnrichedContact:
    contact = db.scalar(
        select(EnrichedContact).where(
            EnrichedContact.id == contact_id, EnrichedContact.organization_id == org_id,
        )
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )
    return contact


def approve_contact(db: Session, contact_id: UUID, org_id: UUID, reviewer: str | None = None) -> EnrichedContactOut:
    """Mark a contact as approved."""
    contact = _get_contact_or_404(db, org_id, contact_id)
    if contact.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contact is already {contact.status}",
        )
    contact.status = "approved"
    contact.approved_at = datetime.now(timezone.utc)
    contact.validated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(contact)
    return _contact_to_out(contact)


def reject_contact(db: Session, contact_id: UUID, org_id: UUID, reviewer: str | None = None) -> EnrichedContactOut:
    """Mark a contact as rejected."""
    contact = _get_contact_or_404(db, org_id, contact_id)
    if contact.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contact is already {contact.status}",
        )
    contact.status = "rejected"
    db.commit()
    db.refresh(contact)
    return _contact_to_out(contact)
