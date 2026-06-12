"""
LLM abstraction layer — supports per-request user config (BYOK / Ollama).

Provider priority (when user has no override):
  primary_llm env → Groq → Ollama → Gemini → OpenAI
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── User-supplied LLM config (BYOK / local Ollama) ───────────────────────────

@dataclass
class LLMUserConfig:
    """
    Per-request config supplied by the frontend.
    Fields left as None fall back to server env values.
    """
    provider: str = "server"          # "server" | "ollama" | "groq" | "openai" | "gemini"
    api_key: Optional[str] = None     # BYOK key (groq / openai / gemini)
    ollama_base_url: Optional[str] = None   # e.g. "http://localhost:11434"
    ollama_model: Optional[str] = None      # e.g. "qwen2.5:14b"
    groq_model: Optional[str] = None


# ── LLM Service ───────────────────────────────────────────────────────────────

class LLMService:
    """
    Groq-first LLM service with Ollama/Gemini/OpenAI fallback.
    Pass a LLMUserConfig to override server-level keys/provider.
    """

    def __init__(self, user_config: Optional[LLMUserConfig] = None) -> None:
        self._cfg = user_config
        self._groq_client = None
        self._ollama_client = None
        self._gemini_client = None
        self._openai_client = None
        self._groq_model = settings.groq_model
        self._ollama_model = settings.ollama_model
        self._primary = settings.primary_llm
        self._setup_clients()

    def _setup_clients(self) -> None:
        cfg = self._cfg

        # ── User chose Ollama ─────────────────────────────────────────────────
        if cfg and cfg.provider == "ollama":
            base_url = cfg.ollama_base_url or settings.ollama_base_url
            model = cfg.ollama_model or settings.ollama_model
            try:
                from openai import AsyncOpenAI
                self._ollama_client = AsyncOpenAI(base_url=f"{base_url}/v1", api_key="ollama")
                self._ollama_model = model
                self._primary = "ollama"
                logger.info("User Ollama: %s @ %s", model, base_url)
            except Exception as exc:
                logger.warning("User Ollama init failed: %s", exc)
            return  # skip all other providers for this session

        # ── User chose a cloud provider (BYOK) ────────────────────────────────
        if cfg and cfg.provider == "groq" and cfg.api_key:
            try:
                from openai import AsyncOpenAI
                self._groq_client = AsyncOpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=cfg.api_key,
                )
                self._groq_model = cfg.groq_model or settings.groq_model
                self._primary = "groq"
                logger.info("BYOK Groq: %s", self._groq_model)
            except Exception as exc:
                logger.warning("BYOK Groq init failed: %s", exc)
            return

        if cfg and cfg.provider == "openai" and cfg.api_key:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=cfg.api_key)
                self._primary = "openai"
                logger.info("BYOK OpenAI initialized.")
            except Exception as exc:
                logger.warning("BYOK OpenAI init failed: %s", exc)
            return

        if cfg and cfg.provider == "gemini" and cfg.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=cfg.api_key)
                self._gemini_client = genai.GenerativeModel(
                    model_name="gemini-2.5-flash",
                    generation_config={
                        "temperature": settings.llm_temperature,
                        "max_output_tokens": settings.llm_max_tokens,
                        "top_p": 0.95,
                    },
                )
                self._primary = "gemini"
                logger.info("BYOK Gemini 2.5 Flash initialized.")
            except Exception as exc:
                logger.warning("BYOK Gemini init failed: %s", exc)
            return

        # ── No user override → use server defaults ────────────────────────────
        if settings.groq_api_key:
            try:
                from openai import AsyncOpenAI
                self._groq_client = AsyncOpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=settings.groq_api_key,
                )
                logger.info("Server Groq: %s", settings.groq_model)
            except Exception as exc:
                logger.warning("Groq init failed: %s", exc)

        try:
            from openai import AsyncOpenAI
            self._ollama_client = AsyncOpenAI(
                base_url=f"{settings.ollama_base_url}/v1",
                api_key="ollama",
            )
            logger.info("Server Ollama: %s", settings.ollama_model)
        except Exception as exc:
            logger.warning("Ollama init failed: %s", exc)

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
                logger.info("Server Gemini 2.5 Flash initialized.")
            except Exception as exc:
                logger.warning("Gemini init failed: %s", exc)

        if settings.openai_api_key and not settings.openai_api_key.startswith("sk-replace"):
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("Server OpenAI initialized.")
            except Exception as exc:
                logger.warning("OpenAI init failed: %s", exc)

    # ── Client routing ────────────────────────────────────────────────────────

    def _primary_client(self):
        if self._primary == "groq" and self._groq_client:
            return ("groq", self._groq_client, self._groq_model)
        if self._primary == "ollama" and self._ollama_client:
            return ("ollama", self._ollama_client, self._ollama_model)
        if self._primary == "openai" and self._openai_client:
            return ("openai", self._openai_client, "gpt-4o")
        if self._primary == "gemini" and self._gemini_client:
            return ("gemini", None, None)  # handled separately
        # Auto-fallback chain
        if self._groq_client:
            return ("groq", self._groq_client, self._groq_model)
        if self._ollama_client:
            return ("ollama", self._ollama_client, self._ollama_model)
        return None

    # ── Public API ────────────────────────────────────────────────────────────

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
            if name == "gemini":
                try:
                    return await self._gemini_generate(system_prompt, user_prompt, temperature, max_tokens)
                except Exception as exc:
                    logger.error("Gemini generate failed: %s", exc)
            else:
                try:
                    return await self._compat_generate(client, model, system_prompt, user_prompt, temperature, max_tokens)
                except Exception as exc:
                    logger.error("%s generate failed, trying fallback: %s", name, exc)

        if self._gemini_client:
            try:
                return await self._gemini_generate(system_prompt, user_prompt, temperature, max_tokens)
            except Exception as exc:
                logger.error("Gemini fallback failed: %s", exc)

        if self._openai_client:
            return await self._compat_generate(self._openai_client, "gpt-4o", system_prompt, user_prompt, temperature, max_tokens)

        raise RuntimeError("No LLM available. Check your AI provider settings.")

    async def stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
    ) -> AsyncIterator[str]:
        primary = self._primary_client()
        if primary:
            name, client, model = primary
            if name == "gemini":
                try:
                    async for token in self._gemini_stream(system_prompt, user_prompt, temperature):
                        yield token
                    return
                except Exception as exc:
                    logger.error("Gemini stream failed: %s", exc)
            else:
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
                logger.error("Gemini fallback stream failed: %s", exc)

        if self._openai_client:
            async for token in self._compat_stream(self._openai_client, "gpt-4o", system_prompt, user_prompt, temperature):
                yield token
            return

        raise RuntimeError("No LLM available. Check your AI provider settings.")

    # ── OpenAI-compatible (Groq / Ollama / OpenAI) ────────────────────────────

    async def _compat_generate(self, client, model, system_prompt, user_prompt, temperature, max_tokens) -> str:
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

    async def _compat_stream(self, client, model, system_prompt, user_prompt, temperature) -> AsyncIterator[str]:
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

    async def _gemini_generate(self, system_prompt, user_prompt, temperature, max_tokens) -> str:
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

    async def _gemini_stream(self, system_prompt, user_prompt, temperature) -> AsyncIterator[str]:
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


# ── Factories ─────────────────────────────────────────────────────────────────

# Default singleton (server config only)
_default_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Return the global singleton using server env config."""
    global _default_service
    if _default_service is None:
        _default_service = LLMService()
    return _default_service


def create_llm_service(user_config: Optional[LLMUserConfig]) -> LLMService:
    """
    Create a fresh LLMService for a specific request.
    Falls back to the global singleton when user_config is None or provider='server'.
    """
    if not user_config or user_config.provider == "server":
        return get_llm_service()
    return LLMService(user_config=user_config)
