"""Fallacy detection agent — post-processes each debate message."""

from __future__ import annotations

import json
import logging
from typing import Optional
from app.agents.base import BaseAgent
from app.models.message import Fallacy, FallacyType, FallacySeverity

logger = logging.getLogger(__name__)


class FallacyDetectorAgent(BaseAgent):
    """Detects logical fallacies in argument text."""

    def __init__(self) -> None:
        super().__init__(
            agent_id="fallacy_detector",
            name="Fallacy Detector",
            role="Logic Analyst",
        )

    @property
    def system_prompt(self) -> str:
        return (
            "You are a formal logic and argumentation expert specializing in detecting logical fallacies.\n"
            "You ONLY return valid JSON. No prose, no explanation outside the JSON.\n"
        )

    async def detect(self, text: str) -> list[Fallacy]:
        """Detect fallacies in the given text. Returns empty list if none found."""
        prompt = (
            f"Analyze this argument for logical fallacies:\n\n\"{text}\"\n\n"
            "Return ONLY valid JSON:\n"
            '{"fallacies": [\n'
            '  {\n'
            '    "type": "strawman|false_dilemma|circular_reasoning|ad_hominem'
            '|appeal_to_authority|hasty_generalization|slippery_slope|false_equivalence",\n'
            '    "excerpt": "exact short quote from the text",\n'
            '    "explanation": "1-2 sentence explanation of the fallacy",\n'
            '    "severity": "low|medium|high"\n'
            '  }\n'
            ']}\n\n'
            "Only include genuine, clear fallacies. Return {\"fallacies\": []} if none found."
        )

        try:
            raw = await self.generate(prompt, temperature=0.1)
            # Extract JSON from response
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start == -1 or end == 0:
                return []
            data = json.loads(raw[start:end])
            fallacies = []
            for f in data.get("fallacies", []):
                try:
                    fallacies.append(
                        Fallacy(
                            type=FallacyType(f["type"]),
                            excerpt=f["excerpt"][:200],
                            explanation=f["explanation"][:300],
                            severity=FallacySeverity(f.get("severity", "medium")),
                        )
                    )
                except (ValueError, KeyError):
                    continue
            return fallacies
        except Exception as exc:
            logger.warning("Fallacy detection failed: %s", exc)
            return []
