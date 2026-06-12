"""AI settings endpoints — provider defaults and Ollama model discovery."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class AIDefaults(BaseModel):
    primary_llm: str
    ollama_base_url: str
    ollama_model: str
    groq_model: str
    has_groq: bool
    has_openai: bool
    has_gemini: bool


class OllamaModel(BaseModel):
    name: str
    size: int = 0
    parameter_size: str = ""


class OllamaModelsResponse(BaseModel):
    models: list[OllamaModel]
    base_url: str


@router.get("/ai", response_model=AIDefaults)
async def get_ai_defaults() -> AIDefaults:
    """Return server-side AI provider defaults (no secrets exposed)."""
    return AIDefaults(
        primary_llm=settings.primary_llm,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        groq_model=settings.groq_model,
        has_groq=bool(settings.groq_api_key),
        has_openai=bool(settings.openai_api_key and not settings.openai_api_key.startswith("sk-replace")),
        has_gemini=bool(settings.gemini_api_key),
    )


@router.get("/ollama/models", response_model=OllamaModelsResponse)
async def list_ollama_models(base_url: str = "") -> OllamaModelsResponse:
    """
    Proxy a request to Ollama's /api/tags endpoint.
    Pass ?base_url=http://localhost:11434 to override the server default.
    The browser can also call Ollama directly at localhost:11434/api/tags —
    this endpoint exists for cases where the backend and Ollama are co-located.
    """
    target = base_url.rstrip("/") or settings.ollama_base_url.rstrip("/")
    url = f"{target}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError as err:
        raise HTTPException(status_code=503, detail=f"Cannot reach Ollama at {target}. Is it running?") from err
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc}") from exc

    models = []
    for m in data.get("models", []):
        details = m.get("details", {})
        models.append(
            OllamaModel(
                name=m.get("name", ""),
                size=m.get("size", 0),
                parameter_size=details.get("parameter_size", ""),
            )
        )

    return OllamaModelsResponse(models=models, base_url=target)
