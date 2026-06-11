"""
API endpoint tests.
Run with: pytest tests/ -v
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture
def mock_auth():
    with patch("app.auth.get_current_user") as mock:
        mock.return_value = {"sub": "user_test123", "email": "test@example.com"}
        yield mock


@pytest.fixture
def mock_db():
    with patch("app.api.debates.DatabaseService") as mock:
        db = MagicMock()
        db.get_user_by_clerk_id = AsyncMock(return_value={"id": "uuid-user", "plan": "free"})
        db.create_debate = AsyncMock(return_value={
            "id": "uuid-debate",
            "user_id": "uuid-user",
            "question": "Should I start a startup?",
            "category": "business",
            "mode": "standard",
            "status": "pending",
            "panel": [],
            "current_stage": "opening",
            "audience_questions": [],
            "created_at": "2025-01-01T00:00:00Z",
        })
        db.list_debates = AsyncMock(return_value=[])
        db.db = MagicMock()
        db.db.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(count=0))
                ))
            ))
        ))
        mock.return_value = db
        yield db


@pytest.mark.asyncio
async def test_health_check():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_classify_endpoint():
    with patch("app.api.debates.PanelBuilderAgent") as mock_panel:
        builder = MagicMock()
        builder.classify_question = AsyncMock(return_value=("business", 0.9))
        builder.build_panel = AsyncMock(return_value=[])
        mock_panel.return_value = builder

        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/debates/classify",
                json={"question": "Should I start a SaaS startup?"},
            )
        assert response.status_code == 200
        data = response.json()
        assert "category" in data
        assert "suggested_panel" in data


@pytest.mark.asyncio
async def test_list_debates_unauthorized():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/debates/")
    assert response.status_code == 403
