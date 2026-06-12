"""FastAPI application entry point for Decision Arena."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.api.debates import router as debates_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router
from app.api.ws import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Decision Arena API starting up. Environment: %s", settings.environment)
    yield
    logger.info("Decision Arena API shutting down.")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Decision Arena API",
    description="AI-powered multi-agent decision debate platform",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Total-Count"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(debates_router)
app.include_router(reports_router)
app.include_router(settings_router)
app.include_router(ws_router)


# ── Clerk Webhook ─────────────────────────────────────────────────────────────

@app.post("/api/v1/webhooks/clerk")
async def clerk_webhook(request: Request) -> JSONResponse:
    """Handle Clerk webhook events (user created/updated/deleted)."""
    try:
        from svix.webhooks import Webhook, WebhookVerificationError
        webhook_secret = settings.clerk_webhook_secret
        if not webhook_secret:
            return JSONResponse({"ok": True})

        headers = dict(request.headers)
        body = await request.body()

        wh = Webhook(webhook_secret)
        evt = wh.verify(body, headers)

        event_type = evt.get("type", "")
        data = evt.get("data", {})

        if event_type in ("user.created", "user.updated"):
            from app.database import DatabaseService
            db = DatabaseService()
            clerk_id = data.get("id", "")
            email_objs = data.get("email_addresses", [])
            email = email_objs[0]["email_address"] if email_objs else ""
            first = data.get("first_name", "")
            last = data.get("last_name", "")
            display_name = f"{first} {last}".strip() or None
            await db.upsert_user(clerk_id=clerk_id, email=email, display_name=display_name)
            logger.info("User upserted: %s", clerk_id)

        return JSONResponse({"ok": True})

    except Exception as exc:
        logger.error("Webhook processing error: %s", exc)
        return JSONResponse({"ok": True})  # Always 200 to Clerk


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "decision-arena-api",
        "version": "1.0.0",
        "environment": settings.environment,
    }


# ── Global Exception Handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )
