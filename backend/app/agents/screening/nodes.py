"""
PATHS Backend — Screening Agent LangGraph node functions.

Each node receives and returns a `ScreeningState` dict. The pipeline:

    discover_candidates → score_candidates → rank_and_persist

Reuses the existing scoring infrastructure:
- `organization_candidate_search_service` for DB candidate discovery
- `llama_scoring_agent` + `vector_similarity_service` for scoring
- `scoring_prompt_builder` for anonymization
- `scoring_criteria` for classification
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.agents.screening.state import ScreeningState
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.db.models.screening import ScreeningResult, ScreeningRun
from app.services.scoring.llama_scoring_agent import (
    AgentScoreError,
    score_candidate_for_job,
)
from app.services.scoring.relevance_filter_service import (
    assess_relevance,
    candidate_role_family,
)
from app.services.scoring.scoring_criteria import (
    classify_final_score,
    recommendation_for,
)
from app.services.scoring.scoring_prompt_builder import (
    anonymize_candidate,
    anonymize_job,
)
from app.services.scoring.scoring_service import combine_scores
from app.services.scoring.vector_similarity_service import compute_similarity_score

logger = logging.getLogger(__name__)
settings = get_settings()

# Letters for blind labels: Candidate A, Candidate B, …, Candidate Z, Candidate AA, …
_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _blind_label(index: int) -> str:
    """Generate a blind label like 'Candidate A', 'Candidate B', ..., 'Candidate AA'."""
    if index < 26:
        return f"Candidate {_ALPHABET[index]}"
    first = _ALPHABET[(index // 26) - 1]
    second = _ALPHABET[index % 26]
    return f"Candidate {first}{second}"


# ── Node 1: Discover candidates ─────────────────────────────────────────


def discover_candidates(state: ScreeningState) -> dict[str, Any]:
    """Find relevant candidates for the job from the database or CSV import."""
    source = state.get("source", "database")
    job_id = UUID(state["job_id"])

    if source == "csv_upload":
        # CSV path — candidate IDs are already provided
        csv_ids = state.get("csv_candidate_ids") or []
        candidate_ids = csv_ids
        total_scanned = len(csv_ids)
        passed_filter = len(csv_ids)
        logger.info(
            "[ScreeningAgent] CSV source: %d candidates provided", len(csv_ids),
        )
    else:
        # Database path — use the existing Qdrant + PG discovery
        from app.services.organization_matching.organization_candidate_search_service import (
            discover_candidates_for_job,
        )

        db: Session = SessionLocal()
        try:
            cand_uuids, stats = discover_candidates_for_job(
                db, job_id, max_pool=settings.org_matching_max_candidates_per_run,
            )
            candidate_ids = [str(c) for c in cand_uuids]
            total_scanned = stats.get("pg_scanned", 0)
            passed_filter = stats.get("passed_filter", 0)
        finally:
            db.close()

        logger.info(
            "[ScreeningAgent] DB discovery: scanned=%d, passed=%d",
            total_scanned, passed_filter,
        )

    return {
        "discovered_candidate_ids": candidate_ids,
        "total_scanned": total_scanned,
        "passed_filter": passed_filter,
    }


# ── Node 2: Score candidates ────────────────────────────────────────────


async def score_candidates(state: ScreeningState) -> dict[str, Any]:
    """Score each discovered candidate against the job using LLM + vector."""
    job_id = UUID(state["job_id"])
    candidate_ids = state.get("discovered_candidate_ids") or []
    force = state.get("force_rescore", False)

    from app.db.repositories import scoring_repository as repo

    scored: list[dict[str, Any]] = []
    failed = 0

    # Load job profile once
    db: Session = SessionLocal()
    try:
        job_profile = repo.get_job_profile(db, job_id)
    finally:
        db.close()

    if job_profile is None:
        logger.error("[ScreeningAgent] job %s not found", job_id)
        return {
            "scored_candidates": [],
            "scored_count": 0,
            "failed_count": 0,
            "status": "failed",
            "error": f"Job {job_id} not found in database",
        }

    a_w = float(settings.scoring_agent_weight)
    v_w = float(settings.scoring_vector_weight)

    async with httpx.AsyncClient(
        timeout=settings.scoring_request_timeout_seconds,
    ) as client:
        for cand_id_str in candidate_ids:
            cand_id = UUID(cand_id_str)

            # Load candidate profile
            cs: Session = SessionLocal()
            try:
                cand_profile = repo.get_candidate_profile(cs, cand_id)
            finally:
                cs.close()

            if cand_profile is None:
                failed += 1
                logger.debug("[ScreeningAgent] candidate %s not found", cand_id)
                continue

            try:
                # Vector similarity
                sim = compute_similarity_score(cand_id, job_id)

                # Relevance check
                cand_family = candidate_role_family(cand_profile)
                decision = assess_relevance(
                    cand_profile,
                    job_profile,
                    candidate_family=cand_family,
                    vector_similarity_score=sim.score,
                )
                if not decision.is_relevant and not force:
                    continue

                # Anonymize and score
                anon_c = anonymize_candidate(cand_profile, candidate_id=cand_id_str)
                anon_j = anonymize_job(job_profile, job_id=str(job_id))

                outcome = await score_candidate_for_job(
                    anonymized_candidate=anon_c,
                    anonymized_job=anon_j,
                    client=client,
                )

                if isinstance(outcome, AgentScoreError):
                    failed += 1
                    logger.warning(
                        "[ScreeningAgent] agent error for %s: %s",
                        cand_id, outcome.error_message,
                    )
                    continue

                final = combine_scores(
                    outcome.agent_score, sim.score,
                    agent_weight=a_w, vector_weight=v_w,
                )

                scored.append({
                    "candidate_id": cand_id_str,
                    "agent_score": float(outcome.agent_score),
                    "vector_similarity_score": float(sim.score),
                    "final_score": float(final),
                    "relevance_score": float(decision.relevance_score),
                    "recommendation": outcome.recommendation
                    or recommendation_for(final),
                    "match_classification": classify_final_score(final),
                    "criteria_breakdown": outcome.criteria_breakdown,
                    "matched_skills": outcome.matched_skills,
                    "missing_required_skills": outcome.missing_required_skills,
                    "missing_preferred_skills": outcome.missing_preferred_skills,
                    "strengths": outcome.strengths,
                    "weaknesses": outcome.weaknesses,
                    "explanation": outcome.explanation,
                })

            except Exception as exc:  # noqa: BLE001
                failed += 1
                logger.exception(
                    "[ScreeningAgent] unexpected error scoring %s", cand_id,
                )

    logger.info(
        "[ScreeningAgent] scoring complete: scored=%d, failed=%d",
        len(scored), failed,
    )

    return {
        "scored_candidates": scored,
        "scored_count": len(scored),
        "failed_count": failed,
    }


# ── Node 3: Rank and persist ────────────────────────────────────────────


def rank_and_persist(state: ScreeningState) -> dict[str, Any]:
    """Sort by final_score, assign ranks, persist ScreeningRun + ScreeningResults."""
    scored = state.get("scored_candidates") or []
    top_k = state.get("top_k", 10)
    job_id = state["job_id"]
    org_id = state["organization_id"]
    source = state.get("source", "database")
    run_id = state.get("screening_run_id")

    # Sort descending by final_score
    scored.sort(key=lambda x: x["final_score"], reverse=True)

    db: Session = SessionLocal()
    try:
        # Update the screening run
        if run_id:
            run = db.get(ScreeningRun, UUID(run_id))
            if run:
                run.status = "completed"
                run.total_candidates_scanned = state.get("total_scanned", 0)
                run.candidates_passed_filter = state.get("passed_filter", 0)
                run.candidates_scored = state.get("scored_count", 0)
                run.candidates_failed = state.get("failed_count", 0)
                run.finished_at = datetime.now(timezone.utc)
                db.add(run)

        # Create screening results
        ranked_results: list[dict[str, Any]] = []
        for i, sc in enumerate(scored):
            rank = i + 1
            is_shortlisted = rank <= top_k
            label = _blind_label(i)

            result = ScreeningResult(
                screening_run_id=UUID(run_id) if run_id else None,
                candidate_id=UUID(sc["candidate_id"]),
                job_id=UUID(job_id),
                blind_label=label,
                rank_position=rank,
                agent_score=sc["agent_score"],
                vector_similarity_score=sc["vector_similarity_score"],
                final_score=sc["final_score"],
                relevance_score=sc.get("relevance_score"),
                recommendation=sc.get("recommendation"),
                match_classification=sc.get("match_classification"),
                criteria_breakdown=sc.get("criteria_breakdown"),
                matched_skills=sc.get("matched_skills"),
                missing_required_skills=sc.get("missing_required_skills"),
                missing_preferred_skills=sc.get("missing_preferred_skills"),
                strengths=sc.get("strengths"),
                weaknesses=sc.get("weaknesses"),
                explanation=sc.get("explanation"),
                status="shortlisted" if is_shortlisted else "ranked",
            )
            db.add(result)
            db.flush()

            ranked_results.append({
                "result_id": str(result.id),
                "blind_label": label,
                "rank_position": rank,
                "agent_score": sc["agent_score"],
                "vector_similarity_score": sc["vector_similarity_score"],
                "final_score": sc["final_score"],
                "relevance_score": sc.get("relevance_score"),
                "recommendation": sc.get("recommendation"),
                "match_classification": sc.get("match_classification"),
                "status": result.status,
            })

        db.commit()
        logger.info(
            "[ScreeningAgent] persisted %d results (top_k=%d shortlisted)",
            len(ranked_results), min(top_k, len(ranked_results)),
        )

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("[ScreeningAgent] failed to persist results")
        return {
            "ranked_results": [],
            "status": "failed",
            "error": str(exc),
        }
    finally:
        db.close()

    return {
        "ranked_results": ranked_results,
        "status": "completed",
        "error": None,
    }
