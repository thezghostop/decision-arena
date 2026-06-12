"""LangGraph state definition for the debate engine."""

from __future__ import annotations

from typing import Annotated, TypedDict

from app.models.debate import AgentConfig, DebateStage


class DebateState(TypedDict):
    # Core debate info
    debate_id: str
    question: str
    mode: str
    panel: list[AgentConfig]

    # Conversation state
    messages: Annotated[list[dict], "All debate messages so far"]
    current_stage: DebateStage
    completed_stages: list[str]

    # Per-agent accumulated text (for scoring)
    agent_contributions: dict[str, str]  # {agent_id: full text}

    # Audience
    audience_queue: list[str]
    audience_processed: list[str]

    # Control
    stage_message_count: dict[str, int]
    should_end: bool
    error: str | None

    # Output
    verdict_raw: str | None
    scores: list[dict]
