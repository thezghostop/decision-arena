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
from app.api.ws import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title="Decision Arena API", version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=settings.allowed_origins_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(debates_router)
app.include_router(reports_router)
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
