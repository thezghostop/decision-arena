"""Report generation and sharing endpoints."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.config import get_settings
from app.database import DatabaseService
from app.models.verdict import (
    PublicReportResponse,
    ReportResponse,
    ShareLinkResponse,
    VerdictResponse,
)
from app.services.report_generator import generate_pdf_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
settings = get_settings()


@router.post("/{debate_id}", response_model=ReportResponse)
async def generate_report(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> ReportResponse:
    """Generate a PDF report for a completed debate."""
    db = DatabaseService()
    debate, messages, scores, verdict = await _get_full_debate(db, debate_id, user)

    download_url = await generate_pdf_report(
        debate=debate,
        messages=messages,
        scores=scores,
        verdict=verdict,
    )
    return ReportResponse(download_url=download_url)


@router.post("/{debate_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> ShareLinkResponse:
    """Create a public share link for a debate report."""
    db = DatabaseService()
    debate = await _get_and_authorize_debate(db, debate_id, user)

    if debate["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only share completed debates.")

    # Check for existing share link
    existing = db.db.table("shared_reports").select("*").eq("debate_id", debate_id).execute()
    if existing.data:
        slug = existing.data[0]["slug"]
    else:
        slug = _generate_slug()
        await db.create_share_link(debate_id, slug)

    base_url = settings.allowed_origins_list[0].rstrip("/")
    url = f"{base_url}/report/{slug}"
    return ShareLinkResponse(slug=slug, url=url)


@router.get("/share/{slug}", response_model=PublicReportResponse)
async def get_public_report(slug: str) -> PublicReportResponse:
    """Get a public shared report by slug. No auth required."""
    db = DatabaseService()
    share = await db.get_by_slug(slug)
    if not share:
        raise HTTPException(status_code=404, detail="Report not found.")

    debate_id = share["debate_id"]
    debate = share.get("debates") or await db.get_debate(debate_id)
    messages = await db.get_messages(debate_id)
    scores = await db.get_scores(debate_id)
    verdict = await db.get_verdict(debate_id)

    # Increment view count
    db.db.table("shared_reports").update({"view_count": share.get("view_count", 0) + 1}).eq("slug", slug).execute()

    return PublicReportResponse(
        debate=debate or {},
        messages=messages,
        scores=[_map_score_public(s) for s in scores],
        verdict=_map_verdict(verdict) if verdict else None,
    )


@router.get("/{debate_id}/verdict", response_model=VerdictResponse)
async def get_verdict(
    debate_id: str,
    user: dict = Depends(get_current_user),
) -> VerdictResponse:
    db = DatabaseService()
    await _get_and_authorize_debate(db, debate_id, user)
    verdict = await db.get_verdict(debate_id)
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict not available yet.")
    return _map_verdict(verdict)


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _get_and_authorize_debate(db: DatabaseService, debate_id: str, user: dict) -> dict:
    debate = await db.get_debate(debate_id)
    if not debate:
        raise HTTPException(status_code=404, detail="Debate not found.")
    clerk_id = user.get("sub", "")
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user or debate["user_id"] != db_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    return debate


async def _get_full_debate(db: DatabaseService, debate_id: str, user: dict):
    debate = await _get_and_authorize_debate(db, debate_id, user)
    messages = await db.get_messages(debate_id)
    scores = await db.get_scores(debate_id)
    verdict = await db.get_verdict(debate_id)
    return debate, messages, scores, verdict


def _generate_slug(length: int = 12) -> str:
    import random
    import string

    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def _map_verdict(v: dict) -> VerdictResponse:
    from datetime import datetime

    from app.models.verdict import HeatmapItem

    return VerdictResponse(
        id=v.get("id", str(uuid.uuid4())),
        debate_id=v["debate_id"],
        consensus_areas=v.get("consensus_areas", []),
        disagreements=v.get("disagreements", []),
        risks=v.get("risks", []),
        opportunities=v.get("opportunities", []),
        recommended_actions=v.get("recommended_actions", []),
        confidence_score=v.get("confidence_score", 0.5),
        heatmap_data=[HeatmapItem(**h) for h in v.get("heatmap_data", []) if isinstance(h, dict)],
        executive_summary=v.get("executive_summary", ""),
        created_at=v["created_at"]
        if isinstance(v["created_at"], datetime)
        else datetime.fromisoformat(v["created_at"]),
    )


def _map_score_public(s: dict):
    from app.models.verdict import AgentScoreResponse

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
