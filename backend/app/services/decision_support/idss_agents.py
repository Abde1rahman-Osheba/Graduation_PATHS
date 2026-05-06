"""
PATHS — IDSS-specific Llama agents.

Two agents are exposed:

  * ``run_idss_decision_agent`` — Brief-shape decision JSON with 9-stage
    breakdown, bias_guardrail_notes, recommended_next_action.
  * ``run_development_plan_agent`` — Brief-shape dev plan with 30/60/90
    + 6m + 12m for accepted, monthly improvement tracks for rejected,
    plus a candidate-facing message separated from internal notes.

These agents extend the existing ``dss_agents.py`` (which still drives
the v1 packet path). Outputs are persisted into the existing JSONB
columns so no schema change is needed.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings
from app.services.llm.openrouter_client import (
    OpenRouterClientError,
    generate_json_response,
)

logger = logging.getLogger(__name__)
settings = get_settings()


_IDSS_SCHEMA = """
Return ONLY a JSON object with these keys (and no commentary):
{
  "candidate_id": "string",
  "job_id": "string",
  "final_score": 0,
  "recommendation": "Strong Accept | Accept | Hold / Needs Review | Reject",
  "confidence": "High | Medium | Low",
  "score_breakdown": {
    "cv_profile_fit":         {"score": 0, "weight": 15, "weighted_score": 0, "reasoning": "", "evidence": []},
    "job_requirement_match":  {"score": 0, "weight": 15, "weighted_score": 0, "reasoning": "", "evidence": []},
    "vector_similarity":      {"score": 0, "weight": 12, "weighted_score": 0, "reasoning": "", "evidence": []},
    "graph_similarity":       {"score": 0, "weight": 10, "weighted_score": 0, "reasoning": "", "evidence": []},
    "outreach_engagement":    {"score": 0, "weight": 5,  "weighted_score": 0, "reasoning": "", "evidence": []},
    "technical_interview":    {"score": 0, "weight": 18, "weighted_score": 0, "reasoning": "", "evidence": []},
    "hr_interview":           {"score": 0, "weight": 12, "weighted_score": 0, "reasoning": "", "evidence": []},
    "assessment":             {"score": 0, "weight": 8,  "weighted_score": 0, "reasoning": "", "evidence": []},
    "human_feedback":         {"score": 0, "weight": 5,  "weighted_score": 0, "reasoning": "", "evidence": []}
  },
  "strengths": [],
  "weaknesses": [],
  "risks": [],
  "missing_evidence": [],
  "bias_guardrail_notes": [],
  "summary_for_hiring_manager": "",
  "final_reasoning": "",
  "recommended_next_action": "Accept Candidate | Reject Candidate | Request More Interview | Request More Evidence"
}
"""


def run_idss_decision_agent(
    *,
    candidate_id: str,
    job_id: str,
    rubric_payload: dict[str, Any],
    journey_context: dict[str, Any],
    bias_notes: list[str] | None = None,
) -> dict[str, Any]:
    """Llama 3.2 IDSS decision agent (brief schema)."""
    system = (
        "You are the PATHS Intelligent Decision Support agent. You ONLY recommend; "
        "the Hiring Manager makes the final hiring decision. Use the 9-stage rubric "
        "and the precomputed scores. Never invent skills, scores, or interviews. "
        "If a section has no evidence, say 'Not enough evidence available' in its "
        "reasoning, set its score to null, and add the stage to missing_evidence. "
        "Never use protected attributes (gender, age, religion, ethnicity, marital "
        "status, disability, nationality, photo, name origin, address, university "
        "prestige alone). If you detect bias in human notes, populate "
        "bias_guardrail_notes with redacted excerpts and recommend 'Hold / Needs "
        "Review'. Output JSON ONLY."
        + _IDSS_SCHEMA
    )
    user = json.dumps(
        {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "rubric": rubric_payload,
            "journey_context": journey_context,
            "human_bias_signals": bias_notes or [],
        },
        default=str,
    )[:120000]
    return generate_json_response(
        system,
        user,
        model=settings.openrouter_dss_model,
        temperature=0.15,
        max_tokens=4500,
    )


_DEV_PLAN_SCHEMA_ACCEPTED = """
Return ONLY this JSON:
{
  "candidate_id": "",
  "job_id": "",
  "decision": "accepted",
  "plan_type": "internal_growth_plan",
  "executive_summary": "",
  "overall_readiness": "",
  "top_strengths": [],
  "critical_gaps": [],
  "first_30_days":  {"focus": [], "tasks": [], "learning_resources": [], "success_metrics": []},
  "first_60_days":  {"focus": [], "tasks": [], "learning_resources": [], "success_metrics": []},
  "first_90_days":  {"focus": [], "tasks": [], "learning_resources": [], "success_metrics": []},
  "six_month_plan": {"skills_to_develop": [], "projects_to_complete": [], "manager_checkpoints": [], "success_metrics": []},
  "twelve_month_plan": {"target_capability": "", "advanced_skills": [], "ownership_expectations": [], "promotion_readiness_indicators": []},
  "recommended_resources": [{"title": "", "type": "course", "url": "", "reason": ""}],
  "manager_guidance": "",
  "risk_mitigation": [],
  "candidate_facing_message": "",
  "internal_hr_notes": ""
}
"""

_DEV_PLAN_SCHEMA_REJECTED = """
Return ONLY this JSON:
{
  "candidate_id": "",
  "job_id": "",
  "decision": "rejected",
  "plan_type": "candidate_improvement_plan",
  "executive_summary": "",
  "main_rejection_reasons": [],
  "strengths_to_preserve": [],
  "critical_gaps": [],
  "technical_improvement_plan": {
    "month_1": {"focus": [], "tasks": [], "resources": [], "success_metrics": []},
    "month_2": {"focus": [], "tasks": [], "resources": [], "success_metrics": []},
    "month_3": {"focus": [], "tasks": [], "resources": [], "success_metrics": []}
  },
  "portfolio_projects": [{"project_name": "", "description": "", "skills_demonstrated": [], "expected_outcome": ""}],
  "soft_skill_recommendations": [],
  "estimated_time_to_reapply": "",
  "reapplication_checklist": [],
  "candidate_facing_feedback_message": "",
  "internal_hr_notes": ""
}
"""


def run_development_plan_agent(
    *,
    decision: str,                    # "accepted" | "rejected"
    candidate_id: str,
    job_id: str,
    candidate_profile: dict[str, Any],
    job_requirements: dict[str, Any],
    cv_analysis: dict[str, Any] | None,
    technical_interview: dict[str, Any] | None,
    hr_interview: dict[str, Any] | None,
    decision_support_summary: dict[str, Any] | None,
    human_feedback: dict[str, Any] | None,
    seniority_level: str | None,
) -> dict[str, Any]:
    """Llama 3.2 Development Plan agent (brief schema)."""
    accepted = (decision or "").lower().strip() == "accepted"
    schema = _DEV_PLAN_SCHEMA_ACCEPTED if accepted else _DEV_PLAN_SCHEMA_REJECTED

    system = (
        "You are the PATHS Development Plan agent. Produce a fair, evidence-based "
        "personalised plan using ONLY job-relevant information. Avoid generic advice. "
        "Tone: supportive, professional, growth-oriented."
        + (
            " The candidate was ACCEPTED — produce an internal onboarding/growth "
            "plan covering 30/60/90 days, 6 months, and 12 months."
            if accepted
            else " The candidate was REJECTED — produce a respectful improvement "
            "plan with month-1/2/3 tracks, portfolio projects, and a "
            "candidate_facing_feedback_message that is encouraging and free of "
            "harsh language. Never reference protected attributes."
        )
        + " If human_feedback contains biased phrasing, ignore the biased "
        "portion and substitute job-relevant evidence. "
        "Classify gaps internally as critical / important / minor; surface the "
        "critical ones in critical_gaps. Output JSON ONLY."
        + schema
    )
    payload = {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "seniority_level": seniority_level,
        "decision": decision,
        "candidate_profile": candidate_profile,
        "job_requirements": job_requirements,
        "cv_analysis": cv_analysis or {},
        "technical_interview": technical_interview or {},
        "hr_interview": hr_interview or {},
        "decision_support_summary": decision_support_summary or {},
        "human_feedback": human_feedback or {},
    }
    return generate_json_response(
        system,
        json.dumps(payload, default=str)[:90000],
        model=settings.openrouter_development_model,
        temperature=0.25,
        max_tokens=4500,
    )


__all__ = [
    "OpenRouterClientError",
    "run_development_plan_agent",
    "run_idss_decision_agent",
]
