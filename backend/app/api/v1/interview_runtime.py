"""
PATHS Backend — Interview Intelligence runtime endpoints.

Companion to ``app/api/v1/interviews.py``. Adds the live runtime + report
flows requested in the Interview Agent brief without touching the
existing interview routes:

  POST /api/v1/interviews/sessions                  alias to create-draft
  GET  /api/v1/interviews/sessions/{id}             session detail
  POST /api/v1/interviews/sessions/{id}/answer      record one Q&A turn
  POST /api/v1/interviews/sessions/{id}/follow-up   generate one follow-up
  POST /api/v1/interviews/sessions/{id}/finish      mark completed
  POST /api/v1/interviews/sessions/{id}/evaluate    delegate to existing analyze
  GET  /api/v1/interviews/sessions/{id}/turns       live transcript
  GET  /api/v1/interviews/sessions/{id}/report      unified report JSON
  GET  /api/v1/interviews/sessions/{id}/report/pdf  PDF download

All endpoints reuse the existing 8 interview tables — no schema changes.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.db.models.application import Application
from app.db.models.candidate import Candidate
from app.db.models.interview import (
    Interview,
    InterviewDecisionPacket,
    InterviewEvaluation,
    InterviewParticipant,
    InterviewSummary,
)
from app.db.models.job import Job
from app.db.models.user import User
from app.schemas.interview_runtime import (
    AnswerTurnIn,
    AnswerTurnOut,
    CreateInterviewSessionIn,
    CreateInterviewSessionOut,
    FollowUpRequest,
    FollowUpResponse,
    FinishInterviewResponse,
    InterviewReportOut,
    InterviewSessionDetail,
    SessionTurnsOut,
)
from app.services.interview import runtime_service
from app.services.interview.interview_service import (
    assert_application_in_org,
    build_candidate_context,
    build_job_context,
    get_interview_for_org,
    get_latest_job_match_score,
    require_org_hr,
    run_full_analysis,
)
from app.services.interview.runtime_service import TurnInput
from app.utils.pdf_report import build_interview_report_pdf

logger = logging.getLogger(__name__)
settings = get_settings()


router = APIRouter(prefix="/interviews/sessions", tags=["Interview Runtime"])


# ── Helpers ──────────────────────────────────────────────────────────────


def _resolve_organization_id(user: User, body_org_id: UUID | None = None) -> UUID:
    if body_org_id is not None:
        return body_org_id
    org = next(
        (m for m in (user.memberships or []) if m.is_active),
        None,
    )
    if org is None:
        raise HTTPException(status_code=403, detail="No active organization membership.")
    return org.organization_id


def _ensure_application(
    db: Session,
    *,
    application_id: UUID | None,
    candidate_id: UUID | None,
    job_id: UUID | None,
    organization_id: UUID,
) -> Application:
    if application_id is not None:
        app = assert_application_in_org(db, application_id, organization_id)
        return app
    if candidate_id is None or job_id is None:
        raise HTTPException(
            status_code=400,
            detail="Provide application_id OR candidate_id+job_id.",
        )
    job = db.get(Job, job_id)
    if job is None or job.organization_id != organization_id:
        raise HTTPException(status_code=400, detail="Job/organization mismatch.")
    app = db.execute(
        select(Application)
        .where(
            Application.candidate_id == candidate_id,
            Application.job_id == job_id,
        )
        .limit(1)
    ).scalar_one_or_none()
    if app is None:
        # Create a minimal sourced application so the interview can be tracked.
        app = Application(
            candidate_id=candidate_id,
            job_id=job_id,
            application_type="ai_interview",
            source_channel="interview_intelligence",
            current_stage_code="hr_interview",
            overall_status="active",
        )
        db.add(app)
        db.flush()
    return app


def _serialize_interview(inv: Interview) -> dict[str, Any]:
    return {
        "id": str(inv.id),
        "application_id": str(inv.application_id),
        "candidate_id": str(inv.candidate_id),
        "job_id": str(inv.job_id),
        "organization_id": str(inv.organization_id),
        "interview_type": inv.interview_type,
        "status": inv.status,
        "scheduled_start_time": inv.scheduled_start_time.isoformat() if inv.scheduled_start_time else None,
        "scheduled_end_time": inv.scheduled_end_time.isoformat() if inv.scheduled_end_time else None,
        "timezone": inv.timezone,
        "meeting_provider": inv.meeting_provider,
        "meeting_url": inv.meeting_url,
        "created_by_user_id": str(inv.created_by_user_id) if inv.created_by_user_id else None,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


# ── Endpoints ────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=CreateInterviewSessionOut,
    status_code=201,
    summary="Create an Interview Intelligence session (alias of POST /interviews/).",
)
def create_session(
    body: CreateInterviewSessionIn,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    org_id = _resolve_organization_id(user, body.organization_id)
    require_org_hr(db, user, org_id)
    app = _ensure_application(
        db,
        application_id=body.application_id,
        candidate_id=body.candidate_id,
        job_id=body.job_id,
        organization_id=org_id,
    )
    interview = Interview(
        application_id=app.id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        organization_id=org_id,
        interview_type=(body.interview_type or "mixed"),
        status="in_progress",
        meeting_provider="ai",
        created_by_user_id=user.id,
    )
    db.add(interview)
    db.flush()
    db.add(
        InterviewParticipant(
            interview_id=interview.id,
            user_id=user.id,
            role="hr",
            attendance_status="invited",
        )
    )
    db.add(
        InterviewParticipant(
            interview_id=interview.id,
            user_id=None,
            role="candidate",
            attendance_status="invited",
        )
    )
    db.commit()
    return CreateInterviewSessionOut(
        session_id=interview.id,
        status=interview.status,
        candidate_id=interview.candidate_id,
        job_id=interview.job_id,
        application_id=interview.application_id,
    )


@router.get(
    "/{session_id}",
    response_model=InterviewSessionDetail,
)
def get_session(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    candidate = db.get(Candidate, inv.candidate_id) if inv.candidate_id else None
    job = db.get(Job, inv.job_id) if inv.job_id else None
    questions = runtime_service.get_questions_flat(db, interview_id=inv.id)
    turns, completed = runtime_service.list_turns(db, interview_id=inv.id)
    return InterviewSessionDetail(
        session=_serialize_interview(inv),
        candidate={
            "id": str(candidate.id) if candidate else None,
            "full_name": candidate.full_name if candidate else None,
            "current_title": candidate.current_title if candidate else None,
            "headline": candidate.headline if candidate else None,
            "skills": list(candidate.skills or []) if candidate else [],
            "summary": candidate.summary if candidate else None,
            "years_experience": candidate.years_experience if candidate else None,
        },
        job={
            "id": str(job.id) if job else None,
            "title": job.title if job else None,
            "summary": job.summary if job else None,
            "seniority_level": job.seniority_level if job else None,
            "requirements": job.requirements if job else None,
        },
        questions=questions,
        turns=[t.__dict__ for t in turns],
        completed=completed,
    )


@router.post(
    "/{session_id}/answer",
    response_model=AnswerTurnOut,
    summary="Record one Q&A turn (live runtime).",
)
def post_answer(
    session_id: UUID,
    body: AnswerTurnIn,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    try:
        turn = runtime_service.record_answer(
            db,
            interview_id=inv.id,
            turn=TurnInput(
                question=body.question,
                answer=body.answer,
                is_followup=bool(body.is_followup),
                parent_index=body.parent_index,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AnswerTurnOut(**turn.__dict__)


@router.post(
    "/{session_id}/follow-up",
    response_model=FollowUpResponse,
    summary="Generate a single follow-up question for a previous turn.",
)
def post_follow_up(
    session_id: UUID,
    body: FollowUpRequest,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    try:
        question = runtime_service.generate_followup(
            db, interview_id=inv.id, parent_index=int(body.parent_index),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return FollowUpResponse(question=question, parent_index=body.parent_index)


@router.post(
    "/{session_id}/finish",
    response_model=FinishInterviewResponse,
    summary="Mark the live interview completed.",
)
def post_finish(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    try:
        result = runtime_service.finalize_session(db, interview_id=inv.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(inv)
    return FinishInterviewResponse(
        ok=bool(result.get("ok")),
        status=inv.status,
        turn_count=int(result.get("turn_count") or 0),
        already_completed=bool(result.get("already_completed")),
    )


@router.post(
    "/{session_id}/evaluate",
    summary="Run the existing LangGraph analysis pipeline (eval + report + decision packet).",
)
async def post_evaluate(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)

    # Materialize the live JSON transcript into a plain-text transcript that
    # the existing analysis pipeline already understands.
    plain = runtime_service.render_plain_transcript(db, interview_id=inv.id)
    if not plain.strip():
        raise HTTPException(status_code=400, detail="no_turns_recorded")
    from app.db.models.interview import InterviewTranscript

    db.add(
        InterviewTranscript(
            interview_id=inv.id,
            transcript_source="ai_interview_render",
            transcript_text=plain,
            language="en",
            quality_hint="high",
        )
    )
    db.commit()

    try:
        result = await run_full_analysis(db, interview=inv)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[InterviewRuntime] run_full_analysis failed: %s", exc)
        raise HTTPException(status_code=500, detail="analysis_failed") from exc
    return result


@router.get(
    "/{session_id}/turns",
    response_model=SessionTurnsOut,
)
def get_turns(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    turns, completed = runtime_service.list_turns(db, interview_id=inv.id)
    return SessionTurnsOut(
        session_id=session_id,
        completed=completed,
        turns=[t.__dict__ for t in turns],
    )


def _load_report_payload(
    db: Session, interview: Interview,
) -> dict[str, Any]:
    summary_row = db.execute(
        select(InterviewSummary)
        .where(InterviewSummary.interview_id == interview.id)
        .order_by(InterviewSummary.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    eval_rows = list(
        db.execute(
            select(InterviewEvaluation)
            .where(InterviewEvaluation.interview_id == interview.id)
            .order_by(InterviewEvaluation.created_at.desc())
        ).scalars().all()
    )
    decision_row = db.execute(
        select(InterviewDecisionPacket)
        .where(InterviewDecisionPacket.interview_id == interview.id)
        .order_by(InterviewDecisionPacket.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    summary_json = summary_row.summary_json if summary_row else None
    decision_json = (
        decision_row.decision_packet_json if decision_row else None
    ) or {}
    if decision_row is not None:
        decision_json = {
            **(decision_json or {}),
            "recommendation": decision_row.recommendation,
            "final_score": decision_row.final_score,
            "confidence": decision_row.confidence,
            "human_review_required": decision_row.human_review_required,
        }

    flat_evals: list[dict[str, Any]] = []
    for ev in eval_rows:
        score_json = ev.score_json or {}
        # The eval pipeline stores per-question entries inside score_json.
        per_q = score_json.get("question_evaluations") if isinstance(score_json, dict) else None
        if isinstance(per_q, list) and per_q:
            for entry in per_q:
                if isinstance(entry, dict):
                    flat_evals.append({**entry, "evaluation_type": ev.evaluation_type})
        else:
            flat_evals.append(
                {
                    "evaluation_type": ev.evaluation_type,
                    "score": score_json.get("overall_score") if isinstance(score_json, dict) else None,
                    "reasoning": (score_json.get("summary") if isinstance(score_json, dict) else None),
                    "evidence": ev.evidence_json,
                    "strengths": ev.strengths_json,
                    "weaknesses": ev.weaknesses_json,
                    "skills_tested": (score_json.get("skills_tested") if isinstance(score_json, dict) else None),
                }
            )

    return {
        "summary": summary_json or {},
        "evaluations": flat_evals,
        "decision_packet": decision_json or None,
    }


@router.get(
    "/{session_id}/report",
    response_model=InterviewReportOut,
)
def get_report(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    payload = _load_report_payload(db, inv)
    turns, completed = runtime_service.list_turns(db, interview_id=inv.id)
    candidate = db.get(Candidate, inv.candidate_id) if inv.candidate_id else None
    job = db.get(Job, inv.job_id) if inv.job_id else None
    return InterviewReportOut(
        session_id=session_id,
        completed=completed,
        candidate={
            "id": str(candidate.id) if candidate else None,
            "full_name": candidate.full_name if candidate else None,
            "current_title": candidate.current_title if candidate else None,
            "skills": list(candidate.skills or []) if candidate else [],
            "summary": candidate.summary if candidate else None,
            "years_experience": candidate.years_experience if candidate else None,
        },
        job={
            "id": str(job.id) if job else None,
            "title": job.title if job else None,
            "summary": job.summary if job else None,
            "seniority_level": job.seniority_level if job else None,
        },
        summary=payload["summary"],
        evaluations=payload["evaluations"],
        decision_packet=payload["decision_packet"],
        turns=[t.__dict__ for t in turns],
    )


@router.get(
    "/{session_id}/report/pdf",
    summary="Download a PDF version of the interview report.",
)
def get_report_pdf(
    session_id: UUID,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inv = db.get(Interview, session_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="interview_not_found")
    require_org_hr(db, user, inv.organization_id)
    payload = _load_report_payload(db, inv)
    turns, _ = runtime_service.list_turns(db, interview_id=inv.id)
    candidate = db.get(Candidate, inv.candidate_id) if inv.candidate_id else None
    job = db.get(Job, inv.job_id) if inv.job_id else None
    pdf_bytes = build_interview_report_pdf(
        candidate={
            "full_name": candidate.full_name if candidate else None,
            "current_title": candidate.current_title if candidate else None,
            "headline": candidate.headline if candidate else None,
            "skills": list(candidate.skills or []) if candidate else [],
            "years_experience": candidate.years_experience if candidate else None,
        },
        job={
            "title": job.title if job else None,
            "seniority_level": job.seniority_level if job else None,
        },
        interview={
            "interview_type": inv.interview_type,
            "status": inv.status,
        },
        summary=payload["summary"] or {},
        evaluations=payload["evaluations"] or [],
        decision_packet=payload["decision_packet"] or {},
        transcript_turns=[t.__dict__ for t in turns],
    )
    filename = (
        f"PATHS-Interview-Report-{(candidate.full_name if candidate else 'candidate').replace(' ','_')}-"
        f"{str(inv.id)[:8]}.pdf"
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
