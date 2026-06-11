"""Base agent class for all Decision Arena agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from app.services.llm import get_llm_service


class BaseAgent(ABC):
    """Abstract base for all agents."""

    def __init__(self, agent_id: str, name: str, role: str) -> None:
        self.agent_id = agent_id
        self.name = name
        self.role = role
        self._llm = get_llm_service()

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Return the full system prompt for this agent."""
        ...

    async def generate(
        self,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        return await self._llm.generate(
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def stream(self, user_prompt: str) -> AsyncIterator[str]:
        async for token in self._llm.stream(
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
        ):
            yield token
