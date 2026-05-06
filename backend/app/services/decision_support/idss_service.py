"""
PATHS — IDSS orchestration layer.

Augments the existing decision_support_service without replacing it. The
existing pipeline (v1) keeps running on every ``/generate`` call. The IDSS
augmentation:

  1. Builds the 9-stage rubric inputs (from idss_context).
  2. Runs the rubric module to compute final_score + per-stage breakdown.
  3. Calls the IDSS agent for narrative + bias guardrail notes.
  4. Stores everything inside the existing ``packet_json`` JSONB column
     under the ``idss_v2`` key — no schema change.

Manager-decision flows + Development Plan workflow live here too.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.candidate import Candidate
from app.db.models.decision_support import (
    DecisionEmail,
    DecisionSupportPacket,
    DevelopmentPlan,
    HrFinalDecision,
)
from app.db.models.job import Job
from app.services.decision_support.dss_audit import log_dss
from app.services.decision_support.idss_agents import (
    OpenRouterClientError,
    run_development_plan_agent,
    run_idss_decision_agent,
)
from app.services.decision_support.idss_context import build_idss_inputs
from app.services.decision_support.idss_rubric import (
    compute_idss_breakdown,
    detect_bias_risk,
    recommendation_from_score,
)

logger = logging.getLogger(__name__)


# ── Manager actions allowed by the brief ────────────────────────────────


VALID_MANAGER_ACTIONS: frozenset[str] = frozenset(
    {
        "accepted",
        "rejected",
        "request_more_interview",
        "request_more_evidence",
    }
)

# Dev-plan workflow statuses (stored inside plan_json so no schema change).
VALID_DEV_PLAN_STATUSES: frozenset[str] = frozenset(
    {
        "draft_generated",
        "pending_hr_review",
        "approved",
        "sent",
        "rejected_by_hr",
        "revised",
    }
)


# ── IDSS augmentation hook ──────────────────────────────────────────────


def augment_packet_with_idss(
    db: Session,
    *,
    packet: DecisionSupportPacket,
    application_id: uuid.UUID,
) -> dict[str, Any]:
    """Compute IDSS rubric + agent narrative; persist into packet_json."""
    inputs, side = build_idss_inputs(db, application_id=application_id)
    job = db.get(Job, packet.job_id)
    role_family = job.role_family if job else None

    breakdown = compute_idss_breakdown(
        inputs,
        role_family=role_family,
        must_have_skills_missing=bool(side.get("must_have_skills_missing")),
        bias_risk=bool(side.get("bias_risk")),
        technical_role=bool(side.get("technical_role")),
    )

    # Build agent prompt payload (rubric + side context).
    rubric_payload: dict[str, Any] = breakdown.to_dict()

    journey_context: dict[str, Any] = {
        "candidate_id": str(packet.candidate_id),
        "job_id": str(packet.job_id),
        "must_have_skills_missing": bool(side.get("must_have_skills_missing")),
        "technical_role": bool(side.get("technical_role")),
        "bias_notes": list(side.get("bias_notes") or []),
    }

    bias_notes = list(side.get("bias_notes") or [])
    bias_risk = bool(side.get("bias_risk"))

    rec = recommendation_from_score(
        breakdown.final_score,
        missing_required_evidence=bool(side.get("must_have_skills_missing")),
        bias_risk=bias_risk,
    )
    confidence = breakdown.confidence

    agent_output: dict[str, Any] | None = None
    agent_error: str | None = None
    try:
        agent_output = run_idss_decision_agent(
            candidate_id=str(packet.candidate_id),
            job_id=str(packet.job_id),
            rubric_payload=rubric_payload,
            journey_context=journey_context,
            bias_notes=bias_notes,
        )
    except OpenRouterClientError as exc:
        logger.warning("[IDSS] decision agent failed: %s", exc)
        agent_error = str(exc)[:500]
    except Exception as exc:  # noqa: BLE001
        logger.exception("[IDSS] decision agent unexpected failure: %s", exc)
        agent_error = str(exc)[:500]

    # Trust deterministic rubric for the score; let agent enrich narrative.
    idss_payload: dict[str, Any] = {
        "version": "v2",
        "final_score": breakdown.final_score,
        "recommendation": rec,
        "confidence": confidence,
        "score_breakdown": breakdown.stages,
        "weights": breakdown.weights,
        "missing_evidence": breakdown.missing_evidence,
        "overrides_applied": breakdown.overrides_applied,
        "bias_guardrail_notes": bias_notes,
        "bias_risk": bias_risk,
        "must_have_skills_missing": bool(side.get("must_have_skills_missing")),
        "technical_role": bool(side.get("technical_role")),
        "agent_error": agent_error,
        "summary_for_hiring_manager": "",
        "final_reasoning": "",
        "strengths": [],
        "weaknesses": [],
        "risks": [],
        "recommended_next_action": _default_next_action(rec),
    }
    if agent_output:
        # Trust agent only for narrative fields; never let it lower the
        # deterministic score / threshold mapping.
        for k in (
            "summary_for_hiring_manager",
            "final_reasoning",
            "recommended_next_action",
        ):
            v = agent_output.get(k)
            if isinstance(v, str) and v.strip():
                idss_payload[k] = v.strip()
        for k in ("strengths", "weaknesses", "risks", "missing_evidence"):
            v = agent_output.get(k)
            if isinstance(v, list):
                idss_payload[k] = [str(x) for x in v if x]
        agent_bias = agent_output.get("bias_guardrail_notes")
        if isinstance(agent_bias, list) and agent_bias:
            idss_payload["bias_guardrail_notes"] = list(
                {*idss_payload["bias_guardrail_notes"], *(str(x) for x in agent_bias)}
            )

    # Merge into existing packet_json.
    pj = dict(packet.packet_json or {})
    pj["idss_v2"] = idss_payload
    packet.packet_json = pj
    # Update top-level packet fields so existing UIs keep working.
    if breakdown.final_score is not None:
        packet.final_journey_score = float(breakdown.final_score)
    packet.recommendation = rec
    packet.confidence = _confidence_to_float(confidence)
    packet.human_review_required = bool(
        bias_risk or rec in {"Hold / Needs Review", "Reject"} or breakdown.missing_evidence
    )
    log_dss(
        db,
        actor_user_id=None,
        action="dss.idss_v2_augmented",
        entity_id=packet.id,
        new_value={
            "final_score": breakdown.final_score,
            "recommendation": rec,
            "confidence": confidence,
        },
    )
    db.flush()
    return idss_payload


def _confidence_to_float(label: str) -> float:
    return {"High": 0.85, "Medium": 0.6, "Low": 0.35}.get(label, 0.5)


def _default_next_action(recommendation: str) -> str:
    if recommendation == "Strong Accept":
        return "Accept Candidate"
    if recommendation == "Accept":
        return "Accept Candidate"
    if recommendation == "Reject":
        return "Reject Candidate"
    return "Request More Evidence"


# ── Manager decision (4 actions) ────────────────────────────────────────


def record_manager_decision(
    db: Session,
    *,
    packet: DecisionSupportPacket,
    user_id: uuid.UUID,
    action: str,
    manager_notes: str | None = None,
) -> HrFinalDecision:
    norm = (action or "").lower().strip().replace("-", "_")
    if norm not in VALID_MANAGER_ACTIONS:
        raise ValueError(f"invalid_manager_action:{action}")
    row = HrFinalDecision(
        id=uuid.uuid4(),
        decision_packet_id=packet.id,
        organization_id=packet.organization_id,
        job_id=packet.job_id,
        candidate_id=packet.candidate_id,
        application_id=packet.application_id,
        decided_by_user_id=user_id,
        ai_recommendation=packet.recommendation,
        final_hr_decision=norm,
        hr_notes=manager_notes,
    )
    db.add(row)
    db.flush()  # so subsequent generate_idss_development_plan can see it
    log_dss(
        db,
        actor_user_id=user_id,
        action="dss.manager_decision",
        entity_id=packet.id,
        new_value={"action": norm},
    )
    return row


# ── Development plan workflow ───────────────────────────────────────────


def generate_idss_development_plan(
    db: Session,
    *,
    packet: DecisionSupportPacket,
    actor_user_id: uuid.UUID | None,
) -> DevelopmentPlan:
    """Generate the brief-shape development plan after a manager decision.

    Stores the plan inside ``DevelopmentPlan.plan_json`` along with a
    workflow ``status`` entry so the existing schema can carry the
    approval lifecycle without a migration.
    """
    hr = db.execute(
        select(HrFinalDecision)
        .where(HrFinalDecision.decision_packet_id == packet.id)
        .order_by(HrFinalDecision.decided_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if hr is None:
        raise ValueError("manager_decision_required_before_plan")

    fd = (hr.final_hr_decision or "").lower()
    if fd not in {"accepted", "rejected"}:
        raise ValueError("plan_requires_accept_or_reject_decision")

    candidate = db.get(Candidate, packet.candidate_id)
    job = db.get(Job, packet.job_id)
    if candidate is None or job is None:
        raise ValueError("candidate_or_job_missing")

    candidate_profile = {
        "skills": list(candidate.skills or []),
        "experience_years": candidate.years_experience,
        "education": candidate.headline,
        "summary": candidate.summary,
    }
    job_requirements = {
        "title": job.title,
        "required_skills": _required_skills(db, job),
        "responsibilities": (job.requirements or "").splitlines()[:25],
        "experience_required": job.seniority_level,
        "tools_and_technologies": [],
    }

    idss_v2 = (packet.packet_json or {}).get("idss_v2") or {}
    decision_support_summary = {
        "recommendation": packet.recommendation,
        "advantages": idss_v2.get("strengths") or [],
        "disadvantages": idss_v2.get("weaknesses") or [],
        "risk_factors": idss_v2.get("risks") or [],
        "final_reasoning": idss_v2.get("final_reasoning") or "",
    }

    try:
        plan_json = run_development_plan_agent(
            decision=fd,
            candidate_id=str(packet.candidate_id),
            job_id=str(packet.job_id),
            candidate_profile=candidate_profile,
            job_requirements=job_requirements,
            cv_analysis=(packet.packet_json or {}).get("cv_analysis"),
            technical_interview=(packet.packet_json or {}).get("technical_interview"),
            hr_interview=(packet.packet_json or {}).get("hr_interview"),
            decision_support_summary=decision_support_summary,
            human_feedback={"manager_notes": hr.hr_notes or ""},
            seniority_level=job.seniority_level,
        )
    except OpenRouterClientError as exc:
        plan_json = _fallback_dev_plan(
            decision=fd,
            candidate_id=str(packet.candidate_id),
            job_id=str(packet.job_id),
            candidate=candidate_profile,
            job=job_requirements,
        )
        plan_json["agent_error"] = str(exc)[:500]
    except Exception as exc:  # noqa: BLE001
        logger.exception("[IDSS] dev plan agent failed: %s", exc)
        plan_json = _fallback_dev_plan(
            decision=fd,
            candidate_id=str(packet.candidate_id),
            job_id=str(packet.job_id),
            candidate=candidate_profile,
            job=job_requirements,
        )
        plan_json["agent_error"] = str(exc)[:500]

    # Workflow metadata (carried inside JSONB; no migration needed).
    plan_json["status"] = "draft_generated"
    plan_json["status_history"] = [
        {
            "status": "draft_generated",
            "at": datetime.now(timezone.utc).isoformat(),
            "by_user_id": str(actor_user_id) if actor_user_id else None,
        }
    ]
    candidate_facing = (
        plan_json.get("candidate_facing_feedback_message")
        or plan_json.get("candidate_facing_message")
        or _fallback_candidate_facing(decision=fd, plan=plan_json)
    )
    plan_json["candidate_facing_message"] = candidate_facing
    plan_json["internal_hr_notes"] = (
        plan_json.get("internal_hr_notes")
        or "Plan generated by PATHS Development Agent."
    )

    plan_type = (
        "accepted_internal_growth"
        if fd == "accepted"
        else "rejected_improvement_plan"
    )

    row = DevelopmentPlan(
        id=uuid.uuid4(),
        decision_packet_id=packet.id,
        organization_id=packet.organization_id,
        job_id=packet.job_id,
        candidate_id=packet.candidate_id,
        application_id=packet.application_id,
        plan_type=plan_type,
        generated_by_agent="development_plan_agent",
        model_provider="openrouter",
        model_name="meta-llama/llama-3.2-8b-instruct",
        plan_json=plan_json,
        summary=str(plan_json.get("executive_summary", ""))[:2000],
    )
    db.add(row)
    log_dss(
        db,
        actor_user_id=actor_user_id,
        action="development_plan_generated",
        entity_id=packet.id,
        new_value={"plan_type": plan_type},
    )
    return row


def update_development_plan_status(
    db: Session,
    *,
    plan: DevelopmentPlan,
    status: str,
    user_id: uuid.UUID | None,
    notes: str | None = None,
) -> DevelopmentPlan:
    norm = (status or "").lower().strip()
    if norm not in VALID_DEV_PLAN_STATUSES:
        raise ValueError(f"invalid_plan_status:{status}")
    body = dict(plan.plan_json or {})
    body["status"] = norm
    history = list(body.get("status_history") or [])
    history.append(
        {
            "status": norm,
            "at": datetime.now(timezone.utc).isoformat(),
            "by_user_id": str(user_id) if user_id else None,
            "notes": notes,
        }
    )
    body["status_history"] = history
    plan.plan_json = body
    db.flush()
    log_dss(
        db,
        actor_user_id=user_id,
        action=f"development_plan_{norm}",
        entity_id=plan.decision_packet_id,
        new_value={"plan_id": str(plan.id), "status": norm},
    )
    return plan


def update_candidate_facing_message(
    db: Session,
    *,
    plan: DevelopmentPlan,
    user_id: uuid.UUID | None,
    new_message: str,
) -> DevelopmentPlan:
    body = dict(plan.plan_json or {})
    body["candidate_facing_message"] = (new_message or "").strip()
    plan.plan_json = body
    db.flush()
    log_dss(
        db,
        actor_user_id=user_id,
        action="development_plan_candidate_message_updated",
        entity_id=plan.decision_packet_id,
        new_value={"plan_id": str(plan.id)},
    )
    return plan


# ── Helpers ─────────────────────────────────────────────────────────────


def _required_skills(db: Session, job: Job) -> list[str]:
    from app.db.models.job_ingestion import JobSkillRequirement

    rows = list(
        db.execute(
            select(JobSkillRequirement).where(
                JobSkillRequirement.job_id == job.id,
                JobSkillRequirement.is_required == True,  # noqa: E712
            )
        ).scalars().all()
    )
    return [
        (r.skill_name_normalized or r.skill_name_raw or "").strip()
        for r in rows
        if (r.skill_name_normalized or r.skill_name_raw)
    ]


def _fallback_dev_plan(
    *,
    decision: str,
    candidate_id: str,
    job_id: str,
    candidate: dict[str, Any],
    job: dict[str, Any],
) -> dict[str, Any]:
    skills = list(candidate.get("skills") or [])[:5]
    role = job.get("title") or "the role"
    if decision == "accepted":
        return {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "decision": "accepted",
            "plan_type": "internal_growth_plan",
            "executive_summary": (
                f"Welcome plan for {role}. Focus the first 90 days on "
                f"onboarding, codebase familiarity and shipping small wins. "
                f"Build on existing strengths in {', '.join(skills) or 'core domain skills'}."
            ),
            "overall_readiness": "Ready with focused onboarding.",
            "top_strengths": skills,
            "critical_gaps": [],
            "first_30_days": {
                "focus": ["Onboarding", "Architecture overview", "First small PR"],
                "tasks": ["Pair with mentor", "Read existing services", "Fix small bugs"],
                "learning_resources": ["Internal architecture docs"],
                "success_metrics": ["First merged PR", "Joins core meetings"],
            },
            "first_60_days": {
                "focus": ["Own a small feature", "Add tests"],
                "tasks": ["Implement small feature end-to-end"],
                "learning_resources": ["Team coding standards"],
                "success_metrics": ["Feature shipped to staging"],
            },
            "first_90_days": {
                "focus": ["Own a module"],
                "tasks": ["Lead small refactor"],
                "learning_resources": ["System design notes"],
                "success_metrics": ["Owns one module end-to-end"],
            },
            "six_month_plan": {
                "skills_to_develop": ["Production hardening", "Observability"],
                "projects_to_complete": ["Take a feature from concept to launch"],
                "manager_checkpoints": ["Monthly 1:1 review"],
                "success_metrics": ["Stable contribution velocity"],
            },
            "twelve_month_plan": {
                "target_capability": "Confident mid-level contributor",
                "advanced_skills": [],
                "ownership_expectations": ["Owns multiple modules"],
                "promotion_readiness_indicators": ["Mentors junior peers"],
            },
            "recommended_resources": [],
            "manager_guidance": "Schedule weekly 1:1s; track 30/60/90 milestones.",
            "risk_mitigation": [],
            "candidate_facing_message": (
                f"Welcome to the team! We've prepared a 12-month plan to help you "
                f"hit the ground running on {role}."
            ),
            "internal_hr_notes": "Generated via deterministic fallback (LLM unavailable).",
            "fallback": True,
        }
    return {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "decision": "rejected",
        "plan_type": "candidate_improvement_plan",
        "executive_summary": (
            f"The current evaluation indicates gaps relative to {role}. A "
            f"focused 3-month track can make a future application stronger."
        ),
        "main_rejection_reasons": ["Insufficient evidence for required skills"],
        "strengths_to_preserve": skills,
        "critical_gaps": [],
        "technical_improvement_plan": {
            "month_1": {
                "focus": ["Foundations of the role's required stack"],
                "tasks": ["Complete a beginner project end-to-end"],
                "resources": [],
                "success_metrics": ["One project published with tests"],
            },
            "month_2": {
                "focus": ["Intermediate skills"],
                "tasks": ["Add automated tests and CI"],
                "resources": [],
                "success_metrics": ["Test coverage > 50% on a project"],
            },
            "month_3": {
                "focus": ["Portfolio polish + mock interview prep"],
                "tasks": ["Mock interviews", "Documented portfolio"],
                "resources": [],
                "success_metrics": ["Portfolio README + 2 mock interviews"],
            },
        },
        "portfolio_projects": [],
        "soft_skill_recommendations": [],
        "estimated_time_to_reapply": "3-6 months",
        "reapplication_checklist": [
            "Show project demonstrating required skills",
            "Prepare 2 STAR stories per behavioural question",
        ],
        "candidate_facing_feedback_message": _fallback_candidate_facing(
            decision="rejected",
            plan={"executive_summary": "We appreciate your time."},
        ),
        "internal_hr_notes": "Generated via deterministic fallback (LLM unavailable).",
        "fallback": True,
    }


def _fallback_candidate_facing(*, decision: str, plan: dict[str, Any]) -> str:
    summary = (plan.get("executive_summary") or "").strip()
    if decision == "accepted":
        return (
            "Welcome to the team! We've prepared a personalised growth plan to "
            "help you ramp up. Your manager will walk you through the first "
            "30/60/90 days during onboarding. " + summary
        )
    return (
        "Thank you for your time during the recruitment process. We will not be "
        "moving forward at this stage, but we have prepared a personalised "
        "improvement plan focused on the gaps we observed. Many of these are "
        "common at this stage and absolutely improvable. We appreciate your "
        "interest and welcome a future application when you're ready. " + summary
    )


__all__ = [
    "VALID_DEV_PLAN_STATUSES",
    "VALID_MANAGER_ACTIONS",
    "augment_packet_with_idss",
    "generate_idss_development_plan",
    "record_manager_decision",
    "update_candidate_facing_message",
    "update_development_plan_status",
]
