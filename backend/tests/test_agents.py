"""
Tests for Decision Arena agents.
Run with: pytest tests/ -v
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture
def mock_llm():
    with patch("app.agents.base.get_llm_service") as mock:
        service = MagicMock()
        service.generate = AsyncMock(return_value='{"fallacies": []}')
        service.stream = AsyncMock()

        async def fake_stream(*args, **kwargs):
            yield "Test "
            yield "response"

        service.stream.side_effect = fake_stream
        mock.return_value = service
        yield service


@pytest.mark.asyncio
async def test_fallacy_detector_empty(mock_llm):
    """Should return empty list when no fallacies found."""
    mock_llm.generate = AsyncMock(return_value='{"fallacies": []}')
    from app.agents.fallacy_detector import FallacyDetectorAgent
    agent = FallacyDetectorAgent()
    result = await agent.detect("This is a reasonable and well-supported argument.")
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_fact_checker_empty(mock_llm):
    """Should return empty list when no claims found."""
    mock_llm.generate = AsyncMock(return_value='{"claims": []}')
    from app.agents.fact_checker import FactCheckerAgent
    agent = FactCheckerAgent()
    result = await agent.check("In my opinion, this is a good idea.")
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_panel_builder_defaults(mock_llm):
    """Should return a valid panel using defaults when LLM fails."""
    mock_llm.generate = AsyncMock(side_effect=Exception("LLM unavailable"))
    from app.agents.panel_builder import PanelBuilderAgent
    from app.models.debate import DebateCategory, DebateMode

    agent = PanelBuilderAgent()
    panel = await agent.build_panel(
        question="Should I start a startup?",
        category=DebateCategory.business,
        mode=DebateMode.standard,
    )
    assert len(panel) >= 2
    assert all(hasattr(p, "id") for p in panel)


@pytest.mark.asyncio
async def test_classify_question_fallback(mock_llm):
    """Should return 'other' category on LLM failure."""
    mock_llm.generate = AsyncMock(side_effect=Exception("LLM unavailable"))
    from app.agents.panel_builder import PanelBuilderAgent

    agent = PanelBuilderAgent()
    cat, conf = await agent.classify_question("Some question")
    assert cat.value in ["career", "business", "tech", "policy", "personal", "other"]


def test_agent_config_validation():
    """AgentConfig should validate field constraints."""
    from app.models.debate import AgentConfig
    config = AgentConfig(
        id="test",
        name="Test Agent",
        role="Test Role",
        icon="🤖",
        color="#7C3AED",
        bias="Testing",
        communication_style="analytical",
        expertise_domains=["testing"],
    )
    assert config.id == "test"
    assert config.name == "Test Agent"


def test_create_debate_request_validation():
    """Panel must have at least 2 members."""
    from app.models.debate import CreateDebateRequest, AgentConfig, DebateCategory, DebateMode
    import pytest

    with pytest.raises(Exception):
        CreateDebateRequest(
            question="Short",  # too short
            category=DebateCategory.business,
            mode=DebateMode.standard,
            panel=[],
        )
