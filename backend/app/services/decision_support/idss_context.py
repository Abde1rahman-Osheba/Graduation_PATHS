"""
PATHS — IDSS evidence collector.

Builds the 9-stage rubric inputs from the existing tables (no schema
changes). Reads from:

  candidates / jobs                 → CV fit and job requirement match heuristics
  Qdrant                            → vector similarity (existing helper)
  Apache AGE / candidates_graph     → graph similarity (best-effort)
  organization_outreach_messages    → outreach engagement signals
  outreach_sessions / interview_*   → also surfaced for the prompt
  interview_evaluations             → tech / hr interview scores
  audit_logs                        → human feedback aggregation

Every section is best-effort — when data is missing the corresponding
``StageInputs`` field stays ``None`` and the rubric module decides how to
compensate.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.candidate import Candidate
from app.db.models.interview import (
    Interview,
    InterviewEvaluation,
    InterviewHumanDecision,
)
from app.db.models.job import Job
from app.db.models.organization_matching import OrganizationOutreachMessage
from app.db.models.scoring import CandidateJobScore
from app.db.models.sync import AuditLog
from app.services.decision_support.idss_rubric import (
    StageInputs,
    detect_bias_risk,
)
from app.services.scoring.vector_similarity_service import compute_similarity_score

logger = logging.getLogger(__name__)


def build_idss_inputs(
    db: Session, *, application_id: uuid.UUID,
) -> tuple[StageInputs, dict[str, Any]]:
    """Return (rubric_inputs, side_payload) for the IDSS pipeline.

    ``side_payload`` carries free-text context the agent prompt benefits
    from but that doesn't fit the numeric rubric — must-have-missing,
    bias notes, etc.
    """
    app = db.get(Application, application_id)
    if app is None:
        raise ValueError("application_not_found")
    cand = db.get(Candidate, app.candidate_id)
    job = db.get(Job, app.job_id)
    if cand is None or job is None:
        raise ValueError("candidate_or_job_missing")

    inputs = StageInputs(evidence={})
    side: dict[str, Any] = {
        "must_have_skills_missing": False,
        "technical_role": _is_technical_role(job),
        "bias_notes": [],
        "human_notes": [],
    }

    # ── Stage 1: CV / profile fit (heuristic from CandidateJobScore + skills) ─
    cjs = db.execute(
        select(CandidateJobScore).where(
            CandidateJobScore.candidate_id == app.candidate_id,
            CandidateJobScore.job_id == app.job_id,
        )
    ).scalar_one_or_none()
    if cjs is not None and cjs.criteria_breakdown:
        cb = cjs.criteria_breakdown if isinstance(cjs.criteria_breakdown, dict) else {}
        cv_fit = _coerce_score(
            cb.get("cv_profile_fit")
            or cb.get("profile_fit")
            or cb.get("experience_alignment"),
        )
        if cv_fit is None and cjs.final_score is not None:
            cv_fit = float(cjs.final_score) * 0.85
        inputs.cv_profile_fit = cv_fit
        inputs.evidence.setdefault("cv_profile_fit", []).append(
            f"CandidateJobScore criteria={list(cb.keys())[:6]}"
        )
    else:
        inputs.evidence.setdefault("cv_profile_fit", [])

    # ── Stage 2: Job requirement match (skill overlap %) ─────────────────────
    cand_skills = {s.lower().strip() for s in (cand.skills or []) if isinstance(s, str)}
    required = _required_skills_from_job(db, job)
    matched = required & cand_skills
    if required:
        coverage = (len(matched) / len(required)) * 100.0
        inputs.job_requirement_match = coverage
        if coverage < 30:
            side["must_have_skills_missing"] = True
        inputs.evidence.setdefault("job_requirement_match", []).append(
            f"Matched {len(matched)}/{len(required)} required skills: {sorted(list(matched))[:6]}"
        )
        if required - matched:
            inputs.evidence["job_requirement_match"].append(
                f"Missing: {sorted(list(required - matched))[:6]}"
            )

    # ── Stage 3: Vector similarity (Qdrant) ──────────────────────────────────
    try:
        sim = compute_similarity_score(app.candidate_id, app.job_id)
        if sim.candidate_vector_present and sim.job_vector_present:
            inputs.vector_similarity = float(sim.score)
            inputs.evidence.setdefault("vector_similarity", []).append(
                f"cosine={sim.cosine:.3f} → score={sim.score}"
            )
        else:
            inputs.evidence.setdefault("vector_similarity", []).append(
                "Vector missing for candidate or job"
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("[IDSS] vector_similarity failed: %s", exc)
        inputs.evidence.setdefault("vector_similarity", []).append(f"vector_error:{exc}")

    # ── Stage 4: Graph similarity (Apache AGE) ───────────────────────────────
    graph_score, graph_notes = _graph_similarity(db, candidate_id=app.candidate_id, job=job)
    inputs.graph_similarity = graph_score
    inputs.evidence.setdefault("graph_similarity", graph_notes)

    # ── Stage 5: Outreach engagement ────────────────────────────────────────
    outreach_score, outreach_notes = _outreach_engagement(
        db, candidate_id=app.candidate_id, job_id=app.job_id,
    )
    inputs.outreach_engagement = outreach_score
    inputs.evidence.setdefault("outreach_engagement", outreach_notes)

    # ── Stages 6 & 7: Tech / HR interview scores ────────────────────────────
    tech_score, tech_notes, hr_score, hr_notes = _interview_scores(
        db, application_id=application_id,
    )
    inputs.technical_interview = tech_score
    inputs.hr_interview = hr_score
    inputs.evidence.setdefault("technical_interview", tech_notes)
    inputs.evidence.setdefault("hr_interview", hr_notes)

    # ── Stage 8: Assessment (best-effort) ───────────────────────────────────
    assess = _assessment_score(db, candidate_id=app.candidate_id, job_id=app.job_id)
    if assess is not None:
        inputs.assessment = assess
        inputs.evidence.setdefault("assessment", [f"derived_score={assess}"])
    else:
        inputs.evidence.setdefault("assessment", [])

    # ── Stage 9: Human feedback (manager notes, interviewer comments, audit) ─
    human_score, human_notes_list, raw_notes = _human_feedback(
        db, application_id=application_id, organization_id=job.organization_id,
    )
    inputs.human_feedback = human_score
    inputs.evidence.setdefault("human_feedback", human_notes_list)
    side["human_notes"] = raw_notes
    bias_detected, bias_notes = detect_bias_risk(raw_notes)
    side["bias_notes"] = bias_notes
    side["bias_risk"] = bias_detected

    return inputs, side


# ── Stage helpers ────────────────────────────────────────────────────────


def _coerce_score(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, dict):
        for key in ("score", "value", "final_score"):
            if key in value:
                value = value[key]
                break
        else:
            return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v > 1 else v * 100.0


def _required_skills_from_job(db: Session, job: Job) -> set[str]:
    from app.db.models.job_ingestion import JobSkillRequirement

    rows = list(
        db.execute(
            select(JobSkillRequirement).where(
                JobSkillRequirement.job_id == job.id,
                JobSkillRequirement.is_required == True,  # noqa: E712
            )
        ).scalars().all()
    )
    return {
        (r.skill_name_normalized or r.skill_name_raw or "").lower().strip()
        for r in rows
        if (r.skill_name_normalized or r.skill_name_raw)
    }


def _is_technical_role(job: Job) -> bool:
    rf = (job.role_family or "").lower()
    if rf in {"engineering", "software", "backend", "frontend", "data", "ml", "ai", "devops"}:
        return True
    title = (job.title or "").lower()
    return any(
        kw in title
        for kw in (
            "engineer", "developer", "data", "ml ", "ai ", "devops",
            "platform", "sre", "scientist",
        )
    )


def _graph_similarity(
    db: Session, *, candidate_id: uuid.UUID, job: Job,
) -> tuple[float | None, list[str]]:
    """Best-effort graph similarity. Falls back gracefully when AGE
    is not reachable or when no projection exists yet."""

    notes: list[str] = []
    try:
        from app.utils.age_query import run_cypher  # type: ignore[import-untyped]
    except Exception:  # noqa: BLE001
        return None, ["graph_query_helper_unavailable"]

    try:
        # Count overlapping skills via the existing graph projection.
        rows = run_cypher(
            db,
            """
            MATCH (c:Candidate {id: $cid})-[:HAS_SKILL]->(s:Skill)
            <-[:REQUIRES_SKILL|HAS_SKILL]-(j:Job {id: $jid})
            RETURN count(distinct s) AS overlap
            """,
            params={"cid": str(candidate_id), "jid": str(job.id)},
        )
    except Exception as exc:  # noqa: BLE001
        return None, [f"graph_query_failed:{str(exc)[:120]}"]

    overlap = 0
    try:
        overlap = int((rows[0] or {}).get("overlap") or 0) if rows else 0
    except (TypeError, ValueError):
        overlap = 0

    if overlap <= 0:
        notes.append("no_graph_overlap_yet")
        return None, notes

    # Cap and normalise: 0..10 overlapping skills → 0..100.
    score = min(100.0, overlap * 10.0)
    notes.append(f"shared_skill_nodes={overlap}")
    return score, notes


def _outreach_engagement(
    db: Session, *, candidate_id: uuid.UUID, job_id: uuid.UUID,
) -> tuple[float | None, list[str]]:
    rows = list(
        db.execute(
            select(OrganizationOutreachMessage).where(
                OrganizationOutreachMessage.candidate_id == candidate_id,
                OrganizationOutreachMessage.job_id == job_id,
            )
            .order_by(OrganizationOutreachMessage.created_at.desc())
            .limit(10)
        ).scalars().all()
    )
    if not rows:
        return None, ["no_outreach_history"]
    notes: list[str] = []
    score = 0.0
    for r in rows:
        s = (r.status or "").lower()
        notes.append(f"{r.subject[:40] if r.subject else '(no subject)'}: {s}")
        if s in {"sent", "approved"}:
            score = max(score, 50.0)
        if s in {"replied", "engaged"}:
            score = max(score, 80.0)
        if s in {"booked", "scheduled"}:
            score = max(score, 90.0)
    if score == 0.0:
        # We have outreach but nothing positive — record as low engagement.
        score = 25.0
        notes.append("no_positive_engagement_signal")
    return score, notes


def _interview_scores(
    db: Session, *, application_id: uuid.UUID,
) -> tuple[float | None, list[str], float | None, list[str]]:
    interviews = list(
        db.execute(
            select(Interview).where(Interview.application_id == application_id),
        ).scalars().all()
    )
    if not interviews:
        return None, ["no_interviews_completed"], None, ["no_interviews_completed"]

    tech_scores: list[float] = []
    hr_scores: list[float] = []
    tech_notes: list[str] = []
    hr_notes: list[str] = []
    for inv in interviews:
        evals = list(
            db.execute(
                select(InterviewEvaluation).where(
                    InterviewEvaluation.interview_id == inv.id,
                )
            ).scalars().all()
        )
        for ev in evals:
            sj = ev.score_json if isinstance(ev.score_json, dict) else {}
            score = (
                sj.get("overall_score")
                or sj.get("overall_technical_score")
                or sj.get("overall_hr_score")
                or sj.get("score")
            )
            score_n = _coerce_score(score)
            if score_n is None:
                continue
            if (ev.evaluation_type or "").lower() == "technical":
                tech_scores.append(score_n)
                tech_notes.append(f"interview={inv.id} score={score_n:.0f}")
            elif (ev.evaluation_type or "").lower() == "hr":
                hr_scores.append(score_n)
                hr_notes.append(f"interview={inv.id} score={score_n:.0f}")
    tech = sum(tech_scores) / len(tech_scores) if tech_scores else None
    hr = sum(hr_scores) / len(hr_scores) if hr_scores else None
    if tech is None:
        tech_notes.append("no_technical_evaluation_yet")
    if hr is None:
        hr_notes.append("no_hr_evaluation_yet")
    return tech, tech_notes, hr, hr_notes


def _assessment_score(
    db: Session, *, candidate_id: uuid.UUID, job_id: uuid.UUID,
) -> float | None:
    """Return an assessment score if one is recorded anywhere.

    Today PATHS doesn't have a dedicated assessments table; we look in
    the existing scoring breakdown for an ``assessment`` sub-score.
    """
    cjs = db.execute(
        select(CandidateJobScore).where(
            CandidateJobScore.candidate_id == candidate_id,
            CandidateJobScore.job_id == job_id,
        )
    ).scalar_one_or_none()
    if cjs is None or not cjs.criteria_breakdown:
        return None
    cb = cjs.criteria_breakdown if isinstance(cjs.criteria_breakdown, dict) else {}
    return _coerce_score(cb.get("assessment") or cb.get("practical"))


def _human_feedback(
    db: Session, *, application_id: uuid.UUID, organization_id: uuid.UUID | None,
) -> tuple[float | None, list[str], list[str]]:
    notes: list[str] = []
    raw_notes: list[str] = []

    interviews = list(
        db.execute(
            select(Interview).where(Interview.application_id == application_id),
        ).scalars().all()
    )
    pos = neg = 0
    for inv in interviews:
        rows = list(
            db.execute(
                select(InterviewHumanDecision).where(
                    InterviewHumanDecision.interview_id == inv.id,
                )
            ).scalars().all()
        )
        for r in rows:
            decision = (r.final_decision or "").lower()
            note = (r.hr_notes or "").strip()
            if note:
                raw_notes.append(note)
                notes.append(f"interview={inv.id} decision={decision}: {note[:80]}")
            if decision == "accepted":
                pos += 1
            elif decision == "rejected":
                neg += 1

    audit_rows = list(
        db.execute(
            select(AuditLog)
            .where(
                AuditLog.entity_type == "application",
                AuditLog.entity_id == application_id,
                AuditLog.action.like("hr.%"),
            )
            .order_by(AuditLog.created_at.desc())
            .limit(10)
        ).scalars().all()
    )
    for row in audit_rows:
        meta = row.audit_metadata or {}
        if isinstance(meta, dict):
            blob = " ".join(
                str(v) for v in meta.values() if isinstance(v, (str, int, float))
            )[:300]
            if blob.strip():
                raw_notes.append(blob)
                notes.append(f"audit={row.action}: {blob[:80]}")

    if not interviews and not raw_notes:
        return None, ["no_human_feedback"], raw_notes

    if pos + neg == 0 and not raw_notes:
        return 50.0, notes, raw_notes

    if pos + neg == 0:
        return 60.0, notes, raw_notes

    score = (pos / max(1, pos + neg)) * 100.0
    return score, notes, raw_notes


__all__ = ["build_idss_inputs"]
