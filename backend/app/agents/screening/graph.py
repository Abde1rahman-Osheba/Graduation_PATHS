"""
PATHS Backend — Screening Agent LangGraph workflow.

Pipeline: discover_candidates → score_candidates → rank_and_persist

This is the Screening Agent: given a job, it finds all relevant
candidates in the database, scores them with LLM + vector similarity,
ranks them, and persists the results as a screening run.
"""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agents.screening.nodes import (
    discover_candidates,
    rank_and_persist,
    score_candidates,
)
from app.agents.screening.state import ScreeningState


def build_screening_graph() -> StateGraph:
    """Build and compile the screening agent workflow."""
    workflow = StateGraph(ScreeningState)

    # Add nodes
    workflow.add_node("discover_candidates", discover_candidates)
    workflow.add_node("score_candidates", score_candidates)
    workflow.add_node("rank_and_persist", rank_and_persist)

    # Define edges (linear pipeline)
    workflow.set_entry_point("discover_candidates")
    workflow.add_edge("discover_candidates", "score_candidates")
    workflow.add_edge("score_candidates", "rank_and_persist")
    workflow.add_edge("rank_and_persist", END)

    return workflow.compile()


__all__ = ["build_screening_graph"]
