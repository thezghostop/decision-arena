from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class DebateCategory(str, Enum):
    career = "career"
    business = "business"
    tech = "tech"
    policy = "policy"
    personal = "personal"
    other = "other"


class DebateMode(str, Enum):
    standard = "standard"
    boardroom = "boardroom"
    shark_tank = "shark_tank"
    policy = "policy"


class DebateStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    error = "error"


class DebateStage(str, Enum):
    opening = "opening"
    cross_examination = "cross_examination"
    challenges = "challenges"
    audience_intervention = "audience_intervention"
    rebuttals = "rebuttals"
    closing = "closing"
    verdict = "verdict"


class AgentConfig(BaseModel):
    id: str
    name: str
    role: str
    icon: str
    color: str
    bias: str
    communication_style: str
    expertise_domains: list[str]
    avatar_seed: str | None = None


class ClassifyRequest(BaseModel):
    question: str = Field(..., min_length=10, max_length=1000)
    mode: DebateMode | None = None


class ClassifyResponse(BaseModel):
    category: DebateCategory
    mode: DebateMode
    suggested_panel: list[AgentConfig]
    confidence: float


class LLMProviderConfig(BaseModel):
    """Per-debate LLM config supplied by the client (BYOK / local Ollama)."""

    provider: str = "server"  # server | ollama | groq | openai | gemini
    api_key: str | None = None  # BYOK cloud key
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    groq_model: str | None = None


class CreateDebateRequest(BaseModel):
    question: str = Field(..., min_length=10, max_length=1000)
    category: DebateCategory
    mode: DebateMode = DebateMode.standard
    panel: list[AgentConfig] = Field(..., min_length=2, max_length=6)
    llm_config: LLMProviderConfig | None = None

    @field_validator("panel")
    @classmethod
    def validate_panel_unique(cls, v: list[AgentConfig]) -> list[AgentConfig]:
        ids = [a.id for a in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Panel cannot contain duplicate agents.")
        return v


class DebateResponse(BaseModel):
    id: str
    user_id: str
    question: str
    category: DebateCategory
    mode: DebateMode
    status: DebateStatus
    panel: list[AgentConfig]
    current_stage: DebateStage
    audience_questions: list[str]
    created_at: datetime
    completed_at: datetime | None = None


class CreateDebateResponse(BaseModel):
    debate_id: str
    debate: DebateResponse


class StartDebateResponse(BaseModel):
    started: bool
    debate_id: str


class InjectQuestionRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=500)


class InjectQuestionResponse(BaseModel):
    injected: bool
