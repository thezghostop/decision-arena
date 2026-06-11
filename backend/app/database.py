"""Supabase database service."""

from __future__ import annotations

import logging
from typing import Optional
from supabase import create_client, Client
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
    return _supabase_client


class DatabaseService:
    """High-level database operations for Decision Arena."""

    def __init__(self) -> None:
        self.db = get_supabase()

    # ── Users ────────────────────────────────────────────────────────────────

    async def upsert_user(self, clerk_id: str, email: str, display_name: Optional[str] = None) -> dict:
        result = (
            self.db.table("users")
            .upsert(
                {"clerk_id": clerk_id, "email": email, "display_name": display_name},
                on_conflict="clerk_id",
            )
            .execute()
        )
        return result.data[0] if result.data else {}

    async def get_user_by_clerk_id(self, clerk_id: str) -> Optional[dict]:
        result = (
            self.db.table("users")
            .select("*")
            .eq("clerk_id", clerk_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ── Debates ───────────────────────────────────────────────────────────────

    async def create_debate(self, payload: dict) -> dict:
        result = self.db.table("debates").insert(payload).execute()
        return result.data[0]

    async def get_debate(self, debate_id: str) -> Optional[dict]:
        result = (
            self.db.table("debates")
            .select("*")
            .eq("id", debate_id)
            .single()
            .execute()
        )
        return result.data

    async def list_debates(self, user_id: str) -> list[dict]:
        result = (
            self.db.table("debates")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return result.data or []

    async def update_debate_status(self, debate_id: str, status: str, stage: str = None) -> None:
        payload: dict = {"status": status}
        if stage:
            payload["current_stage"] = stage
        self.db.table("debates").update(payload).eq("id", debate_id).execute()

    async def mark_debate_complete(self, debate_id: str) -> None:
        from datetime import datetime, timezone
        self.db.table("debates").update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", debate_id).execute()

    # ── Messages ──────────────────────────────────────────────────────────────

    async def save_message(self, msg: dict) -> None:
        self.db.table("debate_messages").insert({
            "id": msg["id"],
            "debate_id": msg["debate_id"],
            "agent_id": msg["agent_id"],
            "agent_name": msg["agent_name"],
            "agent_role": msg.get("agent_role"),
            "stage": msg["stage"],
            "content": msg["content"],
            "message_type": msg["message_type"],
            "fallacies": msg.get("fallacies", []),
            "fact_tags": msg.get("fact_tags", []),
            "sequence_num": msg["sequence_num"],
        }).execute()

    async def get_messages(self, debate_id: str) -> list[dict]:
        result = (
            self.db.table("debate_messages")
            .select("*")
            .eq("debate_id", debate_id)
            .order("sequence_num")
            .execute()
        )
        return result.data or []

    # ── Scores ────────────────────────────────────────────────────────────────

    async def upsert_scores(self, debate_id: str, scores: list[dict]) -> None:
        for score in scores:
            self.db.table("agent_scores").upsert({
                "debate_id": debate_id,
                "agent_id": score["agent_id"],
                "logic_score": score.get("logic"),
                "evidence_score": score.get("evidence"),
                "practicality_score": score.get("practicality"),
                "risk_awareness_score": score.get("risk_awareness"),
                "longterm_thinking_score": score.get("longterm_thinking"),
                "persuasiveness_score": score.get("persuasiveness"),
                "overall_score": score.get("overall"),
            }, on_conflict="debate_id,agent_id").execute()

    async def get_scores(self, debate_id: str) -> list[dict]:
        result = (
            self.db.table("agent_scores")
            .select("*")
            .eq("debate_id", debate_id)
            .execute()
        )
        return result.data or []

    # ── Verdicts ──────────────────────────────────────────────────────────────

    async def save_verdict(self, debate_id: str, verdict: dict) -> dict:
        result = self.db.table("verdicts").insert({
            "debate_id": debate_id,
            **verdict,
        }).execute()
        return result.data[0] if result.data else {}

    async def get_verdict(self, debate_id: str) -> Optional[dict]:
        result = (
            self.db.table("verdicts")
            .select("*")
            .eq("debate_id", debate_id)
            .order("created_at", desc=True)
            .limit(1)
            .single()
            .execute()
        )
        return result.data

    # ── Share Links ───────────────────────────────────────────────────────────

    async def create_share_link(self, debate_id: str, slug: str) -> dict:
        result = self.db.table("shared_reports").insert({
            "debate_id": debate_id,
            "slug": slug,
        }).execute()
        return result.data[0] if result.data else {}

    async def get_by_slug(self, slug: str) -> Optional[dict]:
        result = (
            self.db.table("shared_reports")
            .select("*, debates(*)")
            .eq("slug", slug)
            .single()
            .execute()
        )
        return result.data
