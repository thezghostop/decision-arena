"""Scoring agent — evaluates expert performance after each stage."""

from __future__ import annotations

import json
import logging

from app.agents.base import BaseAgent
from app.models.verdict import AgentScoreResponse

logger = logging.getLogger(__name__)


class ScorerAgent(BaseAgent):
    """Scores each expert on 6 metrics after each debate stage."""

    def __init__(self) -> None:
        super().__init__(
            agent_id="scorer",
            name="Scorer",
            role="Debate Judge",
        )

    @property
    def system_prompt(self) -> str:
        return (
            "You are an objective debate judge scoring participants on 6 metrics.\n"
            "You ONLY return valid JSON. Score on a 0–100 scale.\n"
        )

    async def score_agents(
        self,
        question: str,
        agent_contributions: dict[str, str],  # {agent_id: concatenated text}
        agent_configs: list[dict],
    ) -> list[AgentScoreResponse]:
        """Score all agents based on their debate contributions so far."""
        contributions_text = "\n\n".join(f"[{aid}]: {text[:600]}" for aid, text in agent_contributions.items())

        agent_list = ", ".join(a["id"] for a in agent_configs)

        prompt = (
            f"Decision debated: '{question}'\n\n"
            f"Expert contributions so far:\n{contributions_text}\n\n"
            f"Score each expert ({agent_list}) on these 6 metrics (0–100 each):\n"
            "- logic: quality of reasoning and logical structure\n"
            "- evidence: use of data, examples, and support\n"
            "- practicality: real-world applicability of arguments\n"
            "- risk_awareness: acknowledgment of risks and downsides\n"
            "- longterm_thinking: consideration of long-term implications\n"
            "- persuasiveness: overall persuasive impact\n\n"
            "Return ONLY valid JSON:\n"
            '{"scores": [\n'
            '  {"agent_id": "...", "logic": 72, "evidence": 68, "practicality": 80, '
            '"risk_awareness": 65, "longterm_thinking": 70, "persuasiveness": 75}\n'
            "]}"
        )

        try:
            raw = await self.generate(prompt, temperature=0.2, max_tokens=800)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start == -1 or end == 0:
                return []
            data = json.loads(raw[start:end])

            agent_map = {a["id"]: a for a in agent_configs}
            result = []
            for s in data.get("scores", []):
                agent_id = s.get("agent_id", "")
                cfg = agent_map.get(agent_id)
                if not cfg:
                    continue
                scores = {
                    k: max(0.0, min(100.0, float(s.get(k, 50))))
                    for k in [
                        "logic",
                        "evidence",
                        "practicality",
                        "risk_awareness",
                        "longterm_thinking",
                        "persuasiveness",
                    ]
                }
                overall = sum(scores.values()) / len(scores)
                result.append(
                    AgentScoreResponse(
                        agent_id=agent_id,
                        agent_name=cfg["name"],
                        agent_color=cfg["color"],
                        overall=overall,
                        **scores,
                    )
                )
            return result
        except Exception as exc:
            logger.warning("Scoring failed: %s", exc)
            return []
