"""
PATHS Backend — Mock candidate sourcing provider.

Returns deterministic, fully fake open-to-work profiles. Used by:

  * local development (no external network calls)
  * CI / unit tests
  * the default value of CANDIDATE_SOURCING_PROVIDER

Each call returns a small slice of an in-memory roster, rotating through
``offset`` so successive runs surface different candidates.
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.sourcing.providers.base_candidate_provider import (
    BaseCandidateProvider,
    RawSourcedCandidate,
    SourcingRunResult,
)

logger = logging.getLogger(__name__)


_MOCK_ROSTER: list[dict[str, Any]] = [
    {
        "external_id": "mock-001",
        "full_name": "Alex Hammond",
        "headline": "Senior Backend Engineer · open to remote roles",
        "about": (
            "9+ years building distributed systems with Python and Go. "
            "Strong PostgreSQL, FastAPI, Kafka, AWS background. Currently "
            "looking for senior IC roles, ideally at a fully remote shop."
        ),
        "location_text": "Berlin, Germany",
        "current_title": "Senior Backend Engineer",
        "current_company": "FlowOps",
        "years_experience": 9,
        "skills": ["python", "fastapi", "postgresql", "kafka", "aws", "docker"],
        "desired_titles": ["Senior Backend Engineer", "Staff Backend Engineer"],
        "desired_job_types": ["full_time"],
        "desired_workplace": ["remote", "hybrid"],
        "experiences": [
            {
                "title": "Senior Backend Engineer",
                "company_name": "FlowOps",
                "start_date": "2022-03",
                "end_date": None,
                "description": "Led migration to event-driven architecture on Kafka.",
            },
            {
                "title": "Backend Engineer",
                "company_name": "Acme Data",
                "start_date": "2018-09",
                "end_date": "2022-02",
                "description": "Owned the analytics ingestion pipeline.",
            },
        ],
        "education": [
            {"institution": "TU Berlin", "degree": "MSc", "field_of_study": "Computer Science"},
        ],
        "links": [
            {"link_type": "linkedin", "url": "https://www.linkedin.com/in/alex-hammond-mock"},
        ],
    },
    {
        "external_id": "mock-002",
        "full_name": "Priya Nair",
        "headline": "Full-stack engineer · #OpenToWork",
        "about": (
            "Full-stack engineer with 5 years of React + Node and growing "
            "FastAPI experience. Passionate about clean DX, accessibility "
            "and design systems."
        ),
        "location_text": "Bengaluru, India",
        "current_title": "Full-stack Engineer",
        "current_company": "ZeroPoint",
        "years_experience": 5,
        "skills": ["react", "typescript", "node.js", "fastapi", "tailwind", "postgresql"],
        "desired_titles": ["Senior Full-stack Engineer", "Frontend Engineer"],
        "desired_job_types": ["full_time", "contract"],
        "desired_workplace": ["remote"],
        "experiences": [
            {
                "title": "Full-stack Engineer",
                "company_name": "ZeroPoint",
                "start_date": "2020-07",
                "end_date": None,
                "description": "Built design system, owned dashboard refactor.",
            },
        ],
        "education": [
            {"institution": "BITS Pilani", "degree": "B.E.", "field_of_study": "Computer Science"},
        ],
    },
    {
        "external_id": "mock-003",
        "full_name": "Marc Dubois",
        "headline": "Data engineer · open to senior roles",
        "about": "Data engineer. dbt, Airflow, Snowflake, Python.",
        "location_text": "Paris, France",
        "current_title": "Data Engineer",
        "current_company": "BluePine",
        "years_experience": 7,
        "skills": ["python", "dbt", "airflow", "snowflake", "sql", "spark"],
        "desired_titles": ["Senior Data Engineer", "Analytics Engineer"],
        "desired_job_types": ["full_time"],
        "desired_workplace": ["hybrid", "onsite"],
    },
    {
        "external_id": "mock-004",
        "full_name": "Sara Khalil",
        "headline": "ML Engineer · open to remote",
        "about": "ML engineer focusing on RAG systems and LLM evaluation.",
        "location_text": "Cairo, Egypt",
        "current_title": "ML Engineer",
        "current_company": "OpenAtlas",
        "years_experience": 4,
        "skills": ["python", "pytorch", "langchain", "qdrant", "fastapi", "docker"],
        "desired_titles": ["ML Engineer", "AI Engineer"],
        "desired_job_types": ["full_time", "contract"],
        "desired_workplace": ["remote"],
    },
    {
        "external_id": "mock-005",
        "full_name": "Ben Carter",
        "headline": "Platform / DevOps · open to senior roles",
        "about": "Platform engineer with deep Kubernetes + GitOps experience.",
        "location_text": "London, UK",
        "current_title": "Platform Engineer",
        "current_company": "NorthRiver",
        "years_experience": 8,
        "skills": ["kubernetes", "terraform", "argocd", "aws", "go", "python"],
        "desired_titles": ["Senior Platform Engineer", "Staff DevOps Engineer"],
        "desired_job_types": ["full_time"],
        "desired_workplace": ["remote", "hybrid"],
    },
    {
        "external_id": "mock-006",
        "full_name": "Lina Park",
        "headline": "Mobile engineer · open to React Native roles",
        "about": "Mobile engineer with React Native + iOS background.",
        "location_text": "Seoul, South Korea",
        "current_title": "Senior Mobile Engineer",
        "current_company": "Lumio",
        "years_experience": 6,
        "skills": ["react native", "swift", "typescript", "graphql"],
        "desired_titles": ["Senior Mobile Engineer"],
        "desired_job_types": ["full_time"],
        "desired_workplace": ["hybrid"],
    },
    {
        "external_id": "mock-007",
        "full_name": "Tomas Holm",
        "headline": "Junior backend dev · #OpenToWork",
        "about": "Junior dev, 1 year of Django + Python experience.",
        "location_text": "Stockholm, Sweden",
        "current_title": "Backend Developer",
        "current_company": "Quaver",
        "years_experience": 1,
        "skills": ["python", "django", "postgresql"],
        "desired_titles": ["Junior Backend Developer", "Backend Developer"],
        "desired_job_types": ["full_time", "internship"],
        "desired_workplace": ["onsite", "hybrid"],
    },
]


def _entry_to_raw(entry: dict[str, Any]) -> RawSourcedCandidate:
    return RawSourcedCandidate(
        source_platform="mock",
        source_url=f"https://mock.local/in/{entry['external_id']}",
        source_external_id=entry["external_id"],
        full_name=entry.get("full_name"),
        headline=entry.get("headline"),
        about=entry.get("about"),
        location_text=entry.get("location_text"),
        current_title=entry.get("current_title"),
        current_company=entry.get("current_company"),
        years_experience=entry.get("years_experience"),
        open_to_work=True,
        skills=list(entry.get("skills") or []),
        desired_titles=list(entry.get("desired_titles") or []),
        desired_job_types=list(entry.get("desired_job_types") or []),
        desired_workplace=list(entry.get("desired_workplace") or []),
        experiences=list(entry.get("experiences") or []),
        education=list(entry.get("education") or []),
        projects=list(entry.get("projects") or []),
        certifications=list(entry.get("certifications") or []),
        links=list(entry.get("links") or []),
        raw=dict(entry),
    )


def _matches(entry: dict[str, Any], keywords: list[str], location: str | None) -> bool:
    if location:
        lt = (entry.get("location_text") or "").lower()
        if location.lower() not in lt:
            return False
    if not keywords:
        return True
    blob = " ".join(
        [
            (entry.get("full_name") or ""),
            (entry.get("headline") or ""),
            (entry.get("about") or ""),
            (entry.get("current_title") or ""),
            " ".join(entry.get("skills") or []),
            " ".join(entry.get("desired_titles") or []),
        ]
    ).lower()
    return any(k.lower() in blob for k in keywords if k)


class MockOpenToWorkProvider(BaseCandidateProvider):
    """In-memory provider — safe for development, demos, and tests."""

    source_platform = "mock"

    async def fetch_open_to_work_candidates(
        self,
        *,
        limit: int = 5,
        offset: int = 0,
        keywords: list[str] | None = None,
        location: str | None = None,
        timeout_seconds: int | None = None,
    ) -> SourcingRunResult:
        kws = [k for k in (keywords or []) if k]
        loc = (location or "").strip() or None
        filtered = [e for e in _MOCK_ROSTER if _matches(e, kws, loc)] or list(_MOCK_ROSTER)
        n = len(filtered)
        if n == 0:
            return self.empty_result(offset=offset)
        start = offset % n
        rotated = filtered[start:] + filtered[:start]
        slice_ = rotated[: max(1, int(limit))]
        result = SourcingRunResult(
            raw_candidates=[_entry_to_raw(e) for e in slice_],
            new_offset=(start + len(slice_)) % n,
            visited=len(slice_),
        )
        logger.info(
            "[CandidateSourcing][mock] returning %d/%d candidates (offset=%d -> %d)",
            len(result.raw_candidates), n, start, result.new_offset,
        )
        return result
