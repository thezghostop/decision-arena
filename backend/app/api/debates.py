"""Debate CRUD and control endpoints."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.agents.panel_builder import PanelBuilderAgent
from app.auth import get_current_user
from app.database import DatabaseService
from app.models.debate import (
    ClassifyRequest,
    ClassifyResponse,
    CreateDebateRequest,
    CreateDebateResponse,
    DebateResponse,
    DebateStage,
    DebateStatus,
    InjectQuestionRequest,
    InjectQuestionResponse,
    StartDebateResponse,
)
from app.models.message import DebateMessageResponse
from app.models.verdict import AgentScoreResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/debates", tags=["debates"])

# Active orchestrators in memory (debate_id → orchestrator)
_active_debates: dict = {}


def get_active_debates() -> dict:
    return _active_debates


@router.post("/classify", response_model=ClassifyResponse)
async def classify_question(payload: ClassifyRequest) -> ClassifyResponse:
    """Classify question and suggest expert panel. No auth required."""
    panel_builder = PanelBuilderAgent()
    mode = payload.mode or "standard"

    from app.models.debate import DebateMode

    mode_enum = DebateMode(mode) if isinstance(mode, str) else mode

    category, confidence = await panel_builder.classify_question(payload.question)
    panel = await panel_builder.build_panel(payload.question, category, mode_enum)

    return ClassifyResponse(
        category=category,
        mode=mode_enum,
        suggested_panel=panel,
        confidence=confidence,
    )


@router.post("/", response_model=CreateDebateResponse, status_code=status.HTTP_201_CREATED)
async def create_debate(
    payload: CreateDebateRequest,
    user: dict = Depends(get_current_user),
) -> CreateDebateResponse:
    db = DatabaseService()
    clerk_id = user.get("sub", "")

    # Get or create user in DB
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user:
        email = user.get("email", f"{clerk_id}@unknown.com")
        db_user = await db.upsert_user(clerk_id=clerk_id, email=email)

    user_id = db_user["id"]

    debate_id = str(uuid.uuid4())
    debate_data = {
        "id": debate_id,
        "user_id": user_id,
        "question": payload.question,
        "category": payload.category.value,
        "mode": payload.mode.value,
        "status": DebateStatus.pending.value,
        "panel": [a.model_dump() for a in payload.panel],
        "current_stage": DebateStage.opening.value,
        "audience_questions": [],
        # Store user's LLM provider choice (user's own BYOK key stored per-row)
        "llm_config": payload.llm_config.model_dump() if payload.llm_config else None,
    }

    created = await db.create_debate(debate_data)
    debate_response = _map_debate(created)

    return CreateDebateResponse(debate_id=debate_id, debate=debate_response)


@router.post("/{debate_id}/start", response_model=StartDebateResponse)
async def start_debate(
    debate_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
) -> StartDebateResponse:
    db = DatabaseService()
    debate = await _get_and_authorize_debate(db, debate_id, user)

    if debate["status"] == DebateStatus.running.value:
        return StartDebateResponse(started=True, debate_id=debate_id)

    if debate["status"] == DebateStatus.completed.value:
        raise HTTPException(status_code=400, detail="Debate already completed.")

    await db.update_debate_status(debate_id, DebateStatus.running.value)

    # Debate runs in background, driven by WebSocket connection
    # The orchestrator is started when WS connects (see ws.py)
    return StartDebateResponse(started=True, debate_id=debate_id)


@router.post("/{debate_id}/inject", response_model=InjectQuestionResponse)
async def inject_question(
    debate_id: str,
    payload: InjectQuestionRequest,
    user: dict = Depends(get_current_user),
) -> InjectQuestionResponse:
    active = get_active_debates()
    orchestrator = active.get(debate_id)
    if orchestrator:
        orchestrator.inject_audience_question(payload.question)
    return InjectQuestionResponse(injected=True)


@router.get("/", response_model=list[DebateResponse])
async def list_debates(user: dict = Depends(get_current_user)) -> list[DebateResponse]:
    db = DatabaseService()
    clerk_id = user.get("sub", "")
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user:
        return []
    debates = await db.list_debates(db_user["id"])
    return [_map_debate(d) for d in debates]


@router.get("/{debate_id}", response_model=DebateResponse)
async def get_debate(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> DebateResponse:
    db = DatabaseService()
    debate = await _get_and_authorize_debate(db, debate_id, user)
    return _map_debate(debate)


@router.get("/{debate_id}/messages", response_model=list[DebateMessageResponse])
async def get_messages(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> list[DebateMessageResponse]:
    db = DatabaseService()
    await _get_and_authorize_debate(db, debate_id, user)
    messages = await db.get_messages(debate_id)
    return [_map_message(m) for m in messages]


@router.get("/{debate_id}/scores", response_model=list[AgentScoreResponse])
async def get_scores(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> list[AgentScoreResponse]:
    db = DatabaseService()
    await _get_and_authorize_debate(db, debate_id, user)
    scores = await db.get_scores(debate_id)
    return [_map_score(s) for s in scores]


# ── Private Helpers ───────────────────────────────────────────────────────────


async def _get_and_authorize_debate(db: DatabaseService, debate_id: str, user: dict) -> dict:
    debate = await db.get_debate(debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found.")
    clerk_id = user.get("sub", "")
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user or debate["user_id"] != db_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    return debate


async def _count_todays_debates(db: DatabaseService, user_id: str) -> int:
    from datetime import datetime

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    result = (
        db.db.table("debates")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", today_start)
        .execute()
    )
    return result.count or 0


def _map_debate(d: dict) -> DebateResponse:
    from datetime import datetime

    from app.models.debate import AgentConfig

    return DebateResponse(
        id=d["id"],
        user_id=d["user_id"],
        question=d["question"],
        category=d["category"],
        mode=d["mode"],
        status=d["status"],
        panel=[AgentConfig(**p) if isinstance(p, dict) else p for p in d.get("panel", [])],
        current_stage=d.get("current_stage", "opening"),
        audience_questions=d.get("audience_questions", []),
        created_at=d["created_at"]
        if isinstance(d["created_at"], datetime)
        else datetime.fromisoformat(d["created_at"]),
        completed_at=d.get("completed_at"),
    )


def _map_message(m: dict) -> DebateMessageResponse:
    from datetime import datetime

    return DebateMessageResponse(
        id=m["id"],
        debate_id=m["debate_id"],
        agent_id=m["agent_id"],
        agent_name=m["agent_name"],
        agent_role=m.get("agent_role"),
        stage=m["stage"],
        content=m["content"],
        message_type=m.get("message_type", "argument"),
        fallacies=m.get("fallacies", []),
        fact_tags=m.get("fact_tags", []),
        sequence_num=m.get("sequence_num", 0),
        created_at=m["created_at"]
        if isinstance(m["created_at"], datetime)
        else datetime.fromisoformat(m["created_at"]),
    )


def _map_score(s: dict) -> AgentScoreResponse:
    return AgentScoreResponse(
        agent_id=s["agent_id"],
        agent_name=s.get("agent_name", s["agent_id"]),
        agent_color=s.get("agent_color", "#7C3AED"),
        logic=s.get("logic_score", 0),
        evidence=s.get("evidence_score", 0),
        practicality=s.get("practicality_score", 0),
        risk_awareness=s.get("risk_awareness_score", 0),
        longterm_thinking=s.get("longterm_thinking_score", 0),
        persuasiveness=s.get("persuasiveness_score", 0),
        overall=s.get("overall_score", 0),
    )
