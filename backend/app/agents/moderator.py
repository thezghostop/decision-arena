"""Moderator agent — orchestrates debate structure."""

from __future__ import annotations

from typing import AsyncIterator
from app.agents.base import BaseAgent
from app.models.debate import DebateStage


STAGE_INTROS: dict[str, str] = {
    "opening": "Opening Statements",
    "cross_examination": "Cross-Examination",
    "challenges": "The Challenge Round",
    "audience_intervention": "Audience Intervention",
    "rebuttals": "Rebuttals",
    "closing": "Closing Statements",
    "verdict": "The Verdict",
}

LANGUAGE_INSTRUCTIONS: dict[str, str] = {
    "en": "",
    "hi": (
        "\n\nLANGUAGE REQUIREMENT: You MUST respond entirely in Hindi (हिन्दी) using Devanagari script. "
        "All narration, introductions, and summaries must be in Hindi. "
        "For the JSON verdict response, all text values must be in Hindi — only JSON keys remain in English."
    ),
    "kn": (
        "\n\nLANGUAGE REQUIREMENT: You MUST respond entirely in Kannada (ಕನ್ನಡ) using Kannada script. "
        "All narration, introductions, and summaries must be in Kannada. "
        "For the JSON verdict response, all text values must be in Kannada — only JSON keys remain in English."
    ),
}


class ModeratorAgent(BaseAgent):
    """Controls debate structure and synthesizes outcomes."""

    def __init__(self, language: str = "en", llm_service=None) -> None:
        super().__init__(
            agent_id="moderator",
            name="The Moderator",
            role="Debate Moderator",
            llm_service=llm_service,
        )
        self.language = language

    @property
    def system_prompt(self) -> str:
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(self.language, "")
        return (
            "You are the Moderator of Decision Arena — an elite AI-powered deliberation platform.\n\n"
            "Your responsibilities:\n"
            "- Introduce each debate stage with gravitas and clarity\n"
            "- Summarize transitions between stages concisely\n"
            "- Ensure the debate remains focused on the core question\n"
            "- When an audience question arrives, frame it for the panel\n"
            "- Synthesize the final verdict with intellectual rigor\n\n"
            "STYLE: Authoritative, concise, neutral. Never take sides. "
            "Keep introductions to 2–3 sentences. Write in natural prose.\n"
            f"{lang_instruction}"
        )

    async def introduce_stage(
        self,
        stage: DebateStage,
        question: str,
        context_summary: str = "",
    ) -> AsyncIterator[str]:
        stage_title = STAGE_INTROS.get(stage.value, stage.value)
        prompt = (
            f"Decision under debate: '{question}'\n\n"
            f"You are transitioning the debate into: {stage_title}\n"
            f"Previous discussion summary: {context_summary or 'This is the beginning of the debate.'}\n\n"
            f"Write a 2–3 sentence introduction for the {stage_title} phase. "
            "Be authoritative and set clear expectations for this stage."
        )
        async for token in self.stream(prompt):
            yield token

    async def introduce_audience_question(
        self,
        question: str,
        audience_injection: str,
        panel_names: list[str],
    ) -> AsyncIterator[str]:
        prompt = (
            f"Debate question: '{question}'\n"
            f"An audience member has raised: '{audience_injection}'\n"
            f"Panel members: {', '.join(panel_names)}\n\n"
            "Write 2 sentences: acknowledge the audience injection and instruct all panel members to address it."
        )
        async for token in self.stream(prompt):
            yield token

    async def synthesize_verdict(
        self,
        question: str,
        debate_summary: str,
        decision_parameters: list[str] | None = None,
    ) -> str:
        """Non-streaming verdict synthesis — returns full JSON-structured verdict."""
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(self.language, "")
        params_instruction = (
            f"Decision parameters the debate was meant to cover: {', '.join(decision_parameters)}. "
            "Make sure consensus_areas/disagreements/risks/opportunities collectively touch on "
            "more than one of these parameters — do not let the verdict fixate on a single one.\n\n"
            if decision_parameters
            else ""
        )
        prompt = (
            f"Decision under debate: '{question}'\n\n"
            f"Full debate summary:\n{debate_summary}\n\n"
            f"{params_instruction}"
            "Synthesize a comprehensive verdict. Return ONLY valid JSON with this exact structure:\n"
            '{\n'
            '  "executive_summary": "2-3 sentence summary of the debate and final recommendation",\n'
            '  "consensus_areas": ["area 1", "area 2"],\n'
            '  "disagreements": ["disagreement 1", "disagreement 2"],\n'
            '  "risks": ["risk 1", "risk 2", "risk 3"],\n'
            '  "opportunities": ["opp 1", "opp 2"],\n'
            '  "recommended_actions": ["action 1", "action 2", "action 3"],\n'
            '  "confidence_score": 0.72,\n'
            '  "heatmap_data": [\n'
            '    {"label": "Market Risk", "value": 75, "category": "risk", "description": "..."},\n'
            '    {"label": "Revenue Potential", "value": 85, "category": "benefit", "description": "..."},\n'
            '    {"label": "Capital Required", "value": 60, "category": "cost", "description": "..."},\n'
            '    {"label": "Competitive Gap", "value": 70, "category": "opportunity", "description": "..."}\n'
            '  ]\n'
            '}\n\n'
            "Generate at least 3 items per category. confidence_score must be between 0.0 and 1.0."
            f"{lang_instruction}"
        )
        return await self.generate(prompt, temperature=0.3, max_tokens=1200)
