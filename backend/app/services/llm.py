"""
LLM abstraction layer: Groq (primary) → Ollama → Gemini → OpenAI fallback.
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMService:
    """Groq-first LLM service with Ollama/Gemini/OpenAI fallback."""

    def __init__(self) -> None:
        self._groq_client = None
        self._ollama_client = None
        self._gemini_client = None
        self._openai_client = None
        self._setup_clients()

    def _setup_clients(self) -> None:
        # Groq (primary for deployment)
        if settings.groq_api_key:
            try:
                from openai import AsyncOpenAI
                self._groq_client = AsyncOpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=settings.groq_api_key,
                )
                logger.info("Groq initialized (model: %s).", settings.groq_model)
            except Exception as exc:
                logger.warning("Groq init failed: %s", exc)

        # Ollama (local fallback)
        try:
            from openai import AsyncOpenAI
            self._ollama_client = AsyncOpenAI(
                base_url=f"{settings.ollama_base_url}/v1",
                api_key="ollama",
            )
            logger.info("Ollama client initialized (model: %s).", settings.ollama_model)
        except Exception as exc:
            logger.warning("Ollama init failed: %s", exc)

        # Gemini fallback
        if settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                self._gemini_client = genai.GenerativeModel(
                    model_name="gemini-2.5-flash",
                    generation_config={
                        "temperature": settings.llm_temperature,
                        "max_output_tokens": settings.llm_max_tokens,
                        "top_p": 0.95,
                    },
                )
                logger.info("Gemini 2.5 Flash fallback initialized.")
            except Exception as exc:
                logger.warning("Gemini init failed: %s", exc)

        # OpenAI fallback
        if settings.openai_api_key and not settings.openai_api_key.startswith("sk-replace"):
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI fallback initialized.")
            except Exception as exc:
                logger.warning("OpenAI init failed: %s", exc)

    def _primary_client(self):
        """Return the best available client based on primary_llm setting."""
        if settings.primary_llm == "groq" and self._groq_client:
            return ("groq", self._groq_client, settings.groq_model)
        if settings.primary_llm == "ollama" and self._ollama_client:
            return ("ollama", self._ollama_client, settings.ollama_model)
        # Auto-fallback chain
        if self._groq_client:
            return ("groq", self._groq_client, settings.groq_model)
        if self._ollama_client:
            return ("ollama", self._ollama_client, settings.ollama_model)
        return None

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        primary = self._primary_client()
        if primary:
            name, client, model = primary
            try:
                return await self._compat_generate(client, model, system_prompt, user_prompt, temperature, max_tokens)
            except Exception as exc:
                logger.error("%s generate failed, trying fallback: %s", name, exc)

        if self._gemini_client:
            try:
                return await self._gemini_generate(system_prompt, user_prompt, temperature, max_tokens)
            except Exception as exc:
                logger.error("Gemini generate failed: %s", exc)

        if self._openai_client:
            return await self._compat_generate(self._openai_client, "gpt-4o", system_prompt, user_prompt, temperature, max_tokens)

        raise RuntimeError("No LLM available.")

    async def stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
    ) -> AsyncIterator[str]:
        primary = self._primary_client()
        if primary:
            name, client, model = primary
            try:
                async for token in self._compat_stream(client, model, system_prompt, user_prompt, temperature):
                    yield token
                return
            except Exception as exc:
                logger.error("%s stream failed, trying fallback: %s", name, exc)

        if self._gemini_client:
            try:
                async for token in self._gemini_stream(system_prompt, user_prompt, temperature):
                    yield token
                return
            except Exception as exc:
                logger.error("Gemini stream failed: %s", exc)

        if self._openai_client:
            async for token in self._compat_stream(self._openai_client, "gpt-4o", system_prompt, user_prompt, temperature):
                yield token
            return

        raise RuntimeError("No LLM available.")

    # ── OpenAI-compatible (Groq / Ollama / OpenAI) ────────────────────────────

    async def _compat_generate(
        self,
        client,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> str:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature or settings.llm_temperature,
            max_tokens=max_tokens or settings.llm_max_tokens,
        )
        return response.choices[0].message.content or ""

    async def _compat_stream(
        self,
        client,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float],
    ) -> AsyncIterator[str]:
        stream = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature or settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    # ── Gemini ────────────────────────────────────────────────────────────────

    async def _gemini_generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float],
        max_tokens: Optional[int],
    ) -> str:
        import google.generativeai as genai
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": temperature or settings.llm_temperature,
                "max_output_tokens": max_tokens or settings.llm_max_tokens,
            },
            system_instruction=system_prompt,
        )
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(user_prompt))
        return response.text

    async def _gemini_stream(
        self, system_prompt: str, user_prompt: str, temperature: Optional[float]
    ) -> AsyncIterator[str]:
        import google.generativeai as genai
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "temperature": temperature or settings.llm_temperature,
                "max_output_tokens": settings.llm_max_tokens,
            },
            system_instruction=system_prompt,
        )
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(user_prompt, stream=True))
        for chunk in response:
            if chunk.text:
                yield chunk.text


# Singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
