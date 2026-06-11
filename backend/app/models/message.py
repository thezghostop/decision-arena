from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class MessageType(str, Enum):
    argument = "argument"
    question = "question"
    challenge = "challenge"
    rebuttal = "rebuttal"
    verdict = "verdict"
    moderation = "moderation"


class FallacyType(str, Enum):
    strawman = "strawman"
    false_dilemma = "false_dilemma"
    circular_reasoning = "circular_reasoning"
    ad_hominem = "ad_hominem"
    appeal_to_authority = "appeal_to_authority"
    hasty_generalization = "hasty_generalization"
    slippery_slope = "slippery_slope"
    false_equivalence = "false_equivalence"


class FallacySeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class FactStatus(str, Enum):
    supported = "supported"
    weak_evidence = "weak_evidence"
    needs_verification = "needs_verification"
    contested = "contested"


class Fallacy(BaseModel):
    type: FallacyType
    excerpt: str
    explanation: str
    severity: FallacySeverity = FallacySeverity.medium


class FactTag(BaseModel):
    claim: str
    status: FactStatus
    confidence: float
    note: str | None = None


class DebateMessageResponse(BaseModel):
    id: str
    debate_id: str
    agent_id: str
    agent_name: str
    agent_role: str | None = None
    agent_icon: str | None = None
    agent_color: str | None = None
    stage: str
    content: str
    message_type: MessageType
    fallacies: list[Fallacy]
    fact_tags: list[FactTag]
    sequence_num: int
    created_at: datetime
    is_streaming: bool = False
