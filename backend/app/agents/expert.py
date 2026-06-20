"""Dynamic expert agent — persona driven by config."""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.agents.base import BaseAgent
from app.models.debate import AgentConfig, DebateStage

STAGE_INSTRUCTIONS: dict[str, str] = {
    "opening": (
        "Give ONE punchy paragraph (60–80 words) stating your position on YOUR ASSIGNED FOCUS "
        "PARAMETER below. Be decisive. Do not default to whichever single number or detail the "
        "question happens to mention (e.g. a price) — argue your assigned dimension specifically."
    ),
    "cross_examination": (
        "Ask ONE sharp question (2–3 sentences) to the expert whose view most conflicts with yours. "
        "Address them by name. Expose a specific gap or contradiction. If you notice the panel has "
        "ignored one of the listed decision parameters so far, raise a question about it now."
    ),
    "challenges": (
        "In 2–3 sentences, challenge the weakest argument made so far. "
        "Be specific — name the claim and say exactly why it is flawed."
    ),
    "audience_intervention": (
        "Answer the audience question in 2–3 sentences from your expert perspective. Be concrete."
    ),
    "rebuttals": (
        "In 3–4 sentences, defend your position against the strongest challenge. "
        "Acknowledge any valid point, then explain why your overall stance still holds."
    ),
    "closing": (
        "2 sentences max. Tie your view back to your assigned focus parameter — what is the single "
        "most important thing the decision-maker must know about that dimension?"
    ),
}

LANGUAGE_INSTRUCTIONS: dict[str, str] = {
    "en": "",
    "hi": (
        "\n\nLANGUAGE REQUIREMENT: You MUST respond entirely in Hindi (हिन्दी) using Devanagari script. "
        "All your arguments, examples, analysis, and reasoning must be written in Hindi. "
        "You may use English only for proper nouns, brand names, or technical acronyms that have no Hindi equivalent."
    ),
    "kn": (
        "\n\nLANGUAGE REQUIREMENT: You MUST respond entirely in Kannada (ಕನ್ನಡ) using Kannada script. "
        "All your arguments, examples, analysis, and reasoning must be written in Kannada. "
        "You may use English only for proper nouns, brand names, or technical acronyms that have no Kannada equivalent."
    ),
}


class ExpertAgent(BaseAgent):
    """A dynamically configured expert persona."""

    def __init__(self, config: AgentConfig, language: str = "en", llm_service=None) -> None:
        super().__init__(
            agent_id=config.id,
            name=config.name,
            role=config.role,
            llm_service=llm_service,
        )
        self.config = config
        self.language = language

    @property
    def system_prompt(self) -> str:
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(self.language, "")
        return (
            f"You are {self.name}, a {self.role}.\n\n"
            f"EXPERTISE: {', '.join(self.config.expertise_domains)}\n"
            f"YOUR BIAS & PERSPECTIVE: {self.config.bias}\n"
            f"COMMUNICATION STYLE: {self.config.communication_style}\n\n"
            "DEBATE RULES:\n"
            "- Argue from your specific expertise and worldview. Never be neutral.\n"
            "- Be direct, opinionated, and intellectually honest.\n"
            "- Use real-world examples, data points, or case studies when possible.\n"
            "- Challenge other perspectives when they conflict with your expertise.\n"
            "- Keep responses focused and under 250 words unless instructed otherwise.\n"
            "- Never break character. You are this expert, not an AI playing a role.\n"
            "- Do not use bullet points or headers — write in natural, spoken prose.\n"
            f"{lang_instruction}"
        )

    async def speak(
        self,
        stage: DebateStage,
        question: str,
        context: str,
        audience_question: str | None = None,
        focus_parameter: str | None = None,
        decision_parameters: list[str] | None = None,
    ) -> AsyncIterator[str]:
        """Stream the expert's contribution for the given stage."""
        stage_instruction = STAGE_INSTRUCTIONS.get(stage.value, STAGE_INSTRUCTIONS["opening"])

        prompt = (
            f"DECISION UNDER DEBATE: {question}\n\n"
            f"DEBATE CONTEXT (previous statements):\n{context or 'No previous statements yet.'}\n\n"
        )

        if decision_parameters:
            prompt += (
                "DECISION PARAMETERS THE PANEL MUST COLLECTIVELY COVER (not just one of these): "
                f"{', '.join(decision_parameters)}\n\n"
            )

        if focus_parameter:
            prompt += f"YOUR ASSIGNED FOCUS PARAMETER FOR THIS TURN: {focus_parameter}\n\n"

        if audience_question:
            prompt += f"AUDIENCE QUESTION TO ADDRESS: {audience_question}\n\n"

        prompt += f"YOUR TASK: {stage_instruction}"

        async for token in self.stream(prompt):
            yield token
