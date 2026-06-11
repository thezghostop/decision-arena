"""Fact-checking agent — tags claims in debate messages."""

from __future__ import annotations

import json
import logging

from app.agents.base import BaseAgent
from app.models.message import FactStatus, FactTag

logger = logging.getLogger(__name__)


class FactCheckerAgent(BaseAgent):
    """Tags factual claims in argument text."""

    def __init__(self) -> None:
        super().__init__(
            agent_id="fact_checker",
            name="Fact Checker",
            role="Research Analyst",
        )

    @property
    def system_prompt(self) -> str:
        return (
            "You are a rigorous research analyst who evaluates factual claims in arguments.\n"
            "You ONLY return valid JSON. No prose outside the JSON.\n"
        )

    async def check(self, text: str) -> list[FactTag]:
        """Identify and evaluate factual claims in the text."""
        prompt = (
            f'Identify and evaluate factual claims in this argument:\n\n"{text}"\n\n'
            "Return ONLY valid JSON:\n"
            '{"claims": [\n'
            "  {\n"
            '    "claim": "exact claim from the text",\n'
            '    "status": "supported|weak_evidence|needs_verification|contested",\n'
            '    "confidence": 0.85,\n'
            '    "note": "brief optional explanation"\n'
            "  }\n"
            "]}\n\n"
            "Only flag claims that are verifiable factual assertions (not opinions). "
            'Confidence is 0.0–1.0. Return {"claims": []} if no clear factual claims.'
        )

        try:
            raw = await self.generate(prompt, temperature=0.1)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start == -1 or end == 0:
                return []
            data = json.loads(raw[start:end])
            tags = []
            for c in data.get("claims", []):
                try:
                    tags.append(
                        FactTag(
                            claim=c["claim"][:300],
                            status=FactStatus(c["status"]),
                            confidence=max(0.0, min(1.0, float(c.get("confidence", 0.5)))),
                            note=c.get("note"),
                        )
                    )
                except (ValueError, KeyError):
                    continue
            return tags[:5]  # Cap at 5 per message
        except Exception as exc:
            logger.warning("Fact-checking failed: %s", exc)
            return []
