"""
Debate orchestrator — runs the LangGraph debate graph and streams
events over WebSocket connections.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from collections import defaultdict
from typing import AsyncIterator, Callable, Optional

from app.agents.expert import ExpertAgent
from app.agents.moderator import ModeratorAgent
from app.agents.fallacy_detector import FallacyDetectorAgent
from app.agents.fact_checker import FactCheckerAgent
from app.agents.scorer import ScorerAgent
from app.models.debate import AgentConfig, DebateStage, LLMProviderConfig
from app.models.message import MessageType
from app.database import DatabaseService
from app.services.llm import LLMService, LLMUserConfig, create_llm_service

logger = logging.getLogger(__name__)

STAGE_ORDER: list[DebateStage] = [
    DebateStage.opening,
    DebateStage.cross_examination,
    DebateStage.closing,
    DebateStage.verdict,
]

WSEvent = dict  # typed alias


class DebateOrchestrator:
    """
    Runs a full debate end-to-end, emitting WebSocket events for each token,
    message, stage change, score update, and verdict.
    """

    def __init__(
        self,
        debate_id: str,
        question: str,
        mode: str,
        panel: list[AgentConfig],
        on_event: Callable[[WSEvent], None],
        db_service: Optional[DatabaseService] = None,
        language: str = "en",
        llm_config: Optional[LLMProviderConfig] = None,
    ) -> None:
        self.debate_id = debate_id
        self.question = question
        self.mode = mode
        self.panel = panel
        self.on_event = on_event
        self.db = db_service
        self.language = language

        # Build a per-debate LLM service from the user's provider choice
        user_cfg = LLMUserConfig(
            provider=llm_config.provider,
            api_key=llm_config.api_key,
            ollama_base_url=llm_config.ollama_base_url,
            ollama_model=llm_config.ollama_model,
            groq_model=llm_config.groq_model,
        ) if llm_config else None
        llm_svc: LLMService = create_llm_service(user_cfg)

        self.experts = {cfg.id: ExpertAgent(cfg, language=language, llm_service=llm_svc) for cfg in panel}
        self.moderator = ModeratorAgent(language=language, llm_service=llm_svc)
        self.fallacy_detector = FallacyDetectorAgent()
        self.fact_checker = FactCheckerAgent()
        self.scorer = ScorerAgent()

        self.messages: list[dict] = []
        self.agent_contributions: dict[str, str] = defaultdict(str)
        self.audience_queue: asyncio.Queue[str] = asyncio.Queue()
        self.current_stage: DebateStage = DebateStage.opening
        self.sequence_counter = 0
        self._stopped = False

    def inject_audience_question(self, question: str) -> None:
        """Called from WebSocket handler when user injects a question."""
        self.audience_queue.put_nowait(question)

    def stop(self) -> None:
        self._stopped = True

    async def run(self) -> None:
        """Run the full debate pipeline."""
        try:
            for stage in STAGE_ORDER:
                if self._stopped:
                    break
                self.current_stage = stage

                # Announce stage change
                self._emit("stage_change", {
                    "stage": stage.value,
                    "title": self._stage_title(stage),
                    "description": "",
                })

                # Check for audience injection before rebuttals
                if stage == DebateStage.rebuttals and not self.audience_queue.empty():
                    audience_q = await self.audience_queue.get()
                    await self._run_audience_intervention(audience_q)

                await self._run_stage(stage)

            if not self._stopped:
                await self._run_scoring()
                await self._generate_verdict()

            self._emit("debate_complete", {})
            await self._persist_completion()

        except Exception as exc:
            logger.exception("Debate orchestrator error: %s", exc)
            self._emit("error", {"message": str(exc)})

    async def _run_stage(self, stage: DebateStage) -> None:
        """Run all expert contributions for a given stage."""
        # Expert contributions
        if stage == DebateStage.cross_examination:
            await self._run_cross_examination()
        else:
            for agent_cfg in self.panel:
                if self._stopped:
                    return
                expert = self.experts[agent_cfg.id]
                msg_id = str(uuid.uuid4())
                self._emit_message_start(msg_id, agent_cfg, stage, MessageType.argument)

                full_content = ""
                async for token in expert.speak(
                    stage=stage,
                    question=self.question,
                    context=self._build_context(max_chars=1200),
                ):
                    if self._stopped:
                        return
                    self._emit("token", {"messageId": msg_id, "content": token})
                    full_content += token

                await self._finalize_message(msg_id, agent_cfg, stage, full_content, MessageType.argument)

    async def _run_cross_examination(self) -> None:
        """Each expert asks ONE question to another (round-robin)."""
        for asker_cfg in self.panel:
            if self._stopped:
                return
            expert = self.experts[asker_cfg.id]
            msg_id = str(uuid.uuid4())

            self._emit_message_start(msg_id, asker_cfg, DebateStage.cross_examination, MessageType.question)
            full_content = ""
            async for token in expert.speak(
                stage=DebateStage.cross_examination,
                question=self.question,
                context=self._build_context(max_chars=800),
            ):
                if self._stopped:
                    return
                self._emit("token", {"messageId": msg_id, "content": token})
                full_content += token

            await self._finalize_message(
                msg_id, asker_cfg, DebateStage.cross_examination, full_content, MessageType.question
            )

    async def _run_audience_intervention(self, audience_question: str) -> None:
        """All experts respond to the injected audience question."""
        # Moderator announces it
        panel_names = [c.name for c in self.panel]
        mod_id = str(uuid.uuid4())
        self._emit_moderator_start(mod_id)
        full_mod = ""
        async for token in self.moderator.introduce_audience_question(
            self.question, audience_question, panel_names
        ):
            self._emit("token", {"messageId": mod_id, "content": token})
            full_mod += token
        self._finalize_moderator(mod_id, full_mod, DebateStage.audience_intervention)

        self._emit("audience_injected", {"question": audience_question})

        # Each expert addresses it
        for agent_cfg in self.panel:
            if self._stopped:
                return
            expert = self.experts[agent_cfg.id]
            msg_id = str(uuid.uuid4())
            self._emit_message_start(
                msg_id, agent_cfg, DebateStage.audience_intervention, MessageType.argument
            )
            full_content = ""
            async for token in expert.speak(
                stage=DebateStage.audience_intervention,
                question=self.question,
                context=self._build_context(max_chars=800),
                audience_question=audience_question,
            ):
                if self._stopped:
                    return
                self._emit("token", {"messageId": msg_id, "content": token})
                full_content += token
            await self._finalize_message(
                msg_id, agent_cfg, DebateStage.audience_intervention, full_content, MessageType.argument
            )

    async def _run_scoring(self) -> None:
        """Score all agents based on contributions so far."""
        try:
            scores = await self.scorer.score_agents(
                question=self.question,
                agent_contributions=dict(self.agent_contributions),
                agent_configs=[c.model_dump() for c in self.panel],
            )
            scores_dicts = [s.model_dump() for s in scores]
            self._emit("score_update", {"scores": scores_dicts})
            if self.db:
                await self.db.upsert_scores(self.debate_id, scores_dicts)
        except Exception as exc:
            logger.warning("Scoring failed: %s", exc)

    async def _generate_verdict(self) -> None:
        """Generate and emit the final verdict."""
        self._emit("stage_change", {
            "stage": "verdict",
            "title": "The Verdict",
            "description": "Synthesizing the debate outcome…",
        })

        debate_summary = "\n\n".join(
            f"[{mid['agent_name']} — {mid['stage']}]: {mid['content'][:400]}"
            for mid in self.messages
        )

        raw_verdict = await self.moderator.synthesize_verdict(self.question, debate_summary)

        try:
            start = raw_verdict.find("{")
            end = raw_verdict.rfind("}") + 1
            verdict_data = json.loads(raw_verdict[start:end])
        except Exception:
            verdict_data = {
                "executive_summary": "The panel completed deliberations. See the full debate for details.",
                "consensus_areas": [],
                "disagreements": [],
                "risks": [],
                "opportunities": [],
                "recommended_actions": [],
                "confidence_score": 0.6,
                "heatmap_data": [],
            }

        verdict_id = str(uuid.uuid4())
        verdict_payload = {
            "id": verdict_id,
            "debateId": self.debate_id,
            **verdict_data,
            "createdAt": self._now_iso(),
        }

        self._emit("verdict_ready", {"verdict": verdict_payload})

        if self.db:
            await self.db.save_verdict(self.debate_id, verdict_data)

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _finalize_message(
        self,
        msg_id: str,
        agent_cfg: AgentConfig,
        stage: DebateStage,
        content: str,
        message_type: MessageType,
    ) -> None:
        """Run support agents and emit message_complete."""
        # Skip fallacy/fact-check LLM calls to stay within free tier quota
        fallacies_dicts: list = []
        fact_tags_dicts: list = []

        self._emit("message_complete", {
            "messageId": msg_id,
            "fallacies": fallacies_dicts,
            "factTags": fact_tags_dicts,
        })

        # Store in memory
        msg = {
            "id": msg_id,
            "debate_id": self.debate_id,
            "agent_id": agent_cfg.id,
            "agent_name": agent_cfg.name,
            "agent_role": agent_cfg.role,
            "agent_icon": agent_cfg.icon,
            "agent_color": agent_cfg.color,
            "stage": stage.value,
            "content": content,
            "message_type": message_type.value,
            "fallacies": fallacies_dicts,
            "fact_tags": fact_tags_dicts,
            "sequence_num": self._next_seq(),
            "created_at": self._now_iso(),
        }
        self.messages.append(msg)
        self.agent_contributions[agent_cfg.id] += f"\n{content}"

        # Persist to DB
        if self.db:
            await self.db.save_message(msg)

    def _emit_message_start(
        self,
        msg_id: str,
        agent_cfg: AgentConfig,
        stage: DebateStage,
        message_type: MessageType,
    ) -> None:
        self._emit("message_start", {
            "messageId": msg_id,
            "agentId": agent_cfg.id,
            "agentName": agent_cfg.name,
            "agentRole": agent_cfg.role,
            "agentIcon": agent_cfg.icon,
            "agentColor": agent_cfg.color,
            "stage": stage.value,
            "messageType": message_type.value,
            "sequenceNum": self.sequence_counter + 1,
        })

    async def _stream_moderator(
        self,
        stage: DebateStage,
        generator: AsyncIterator[str],
    ) -> None:
        msg_id = str(uuid.uuid4())
        self._emit_moderator_start(msg_id)
        full_content = ""
        async for token in generator:
            if self._stopped:
                return
            self._emit("token", {"messageId": msg_id, "content": token})
            full_content += token
        self._finalize_moderator(msg_id, full_content, stage)

    def _emit_moderator_start(self, msg_id: str) -> None:
        self._emit("message_start", {
            "messageId": msg_id,
            "agentId": "moderator",
            "agentName": "Moderator",
            "agentRole": "Debate Moderator",
            "agentIcon": "⚖️",
            "agentColor": "#94A3B8",
            "stage": self.current_stage.value,
            "messageType": "moderation",
            "sequenceNum": self.sequence_counter + 1,
        })

    def _finalize_moderator(self, msg_id: str, content: str, stage: DebateStage) -> None:
        self._emit("message_complete", {"messageId": msg_id, "fallacies": [], "factTags": []})
        msg = {
            "id": msg_id,
            "debate_id": self.debate_id,
            "agent_id": "moderator",
            "agent_name": "Moderator",
            "agent_role": "Debate Moderator",
            "agent_icon": "⚖️",
            "agent_color": "#94A3B8",
            "stage": stage.value,
            "content": content,
            "message_type": "moderation",
            "fallacies": [],
            "fact_tags": [],
            "sequence_num": self._next_seq(),
            "created_at": self._now_iso(),
        }
        self.messages.append(msg)

    def _build_context(self, max_chars: int = 2000) -> str:
        """Build a truncated context string from recent messages."""
        recent = self.messages[-12:]  # Last 12 messages
        lines = [
            f"[{m['agent_name']} — {m['stage']}]: {m['content'][:200]}"
            for m in recent
        ]
        full = "\n".join(lines)
        return full[-max_chars:] if len(full) > max_chars else full

    def _next_seq(self) -> int:
        self.sequence_counter += 1
        return self.sequence_counter

    def _emit(self, event_type: str, data: dict) -> None:
        self.on_event({"type": event_type, **data})

    async def _persist_completion(self) -> None:
        if self.db:
            await self.db.mark_debate_complete(self.debate_id)

    @staticmethod
    def _stage_title(stage: DebateStage) -> str:
        titles = {
            "opening": "Opening Statements",
            "cross_examination": "Cross-Examination",
            "challenges": "The Challenge Round",
            "rebuttals": "Rebuttals",
            "closing": "Closing Statements",
            "verdict": "The Verdict",
        }
        return titles.get(stage.value, stage.value)

    @staticmethod
    def _now_iso() -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
