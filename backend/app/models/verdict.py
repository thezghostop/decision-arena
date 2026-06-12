from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class HeatmapCategory(str, Enum):
    risk = "risk"
    opportunity = "opportunity"
    cost = "cost"
    benefit = "benefit"


class HeatmapItem(BaseModel):
    label: str
    value: float = Field(..., ge=0, le=100)
    category: HeatmapCategory
    description: str


class AgentScoreResponse(BaseModel):
    agent_id: str
    agent_name: str
    agent_color: str
    logic: float
    evidence: float
    practicality: float
    risk_awareness: float
    longterm_thinking: float
    persuasiveness: float
    overall: float


class VerdictResponse(BaseModel):
    id: str
    debate_id: str
    consensus_areas: list[str]
    disagreements: list[str]
    risks: list[str]
    opportunities: list[str]
    recommended_actions: list[str]
    confidence_score: float
    heatmap_data: list[HeatmapItem]
    executive_summary: str
    created_at: datetime


class ShareLinkResponse(BaseModel):
    slug: str
    url: str
    expires_at: Optional[datetime] = None


class ReportResponse(BaseModel):
    download_url: str
    expires_at: Optional[datetime] = None


class PublicReportResponse(BaseModel):
    debate: dict
    messages: list[dict]
    scores: list[AgentScoreResponse]
    verdict: VerdictResponse
