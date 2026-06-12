"""Review endpoints — submit and export user reviews."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.database import DatabaseService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])


class CreateReviewRequest(BaseModel):
    debate_id: str | None = None
    rating: int = Field(..., ge=1, le=5)
    review_text: str | None = None


class ReviewResponse(BaseModel):
    id: str
    rating: int
    review_text: str | None
    created_at: str


@router.post("/", response_model=ReviewResponse)
async def submit_review(
    body: CreateReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    db = DatabaseService()
    user = await db.get_user_by_clerk_id(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    payload = {
        "user_id": user["id"],
        "debate_id": body.debate_id,
        "rating": body.rating,
        "review_text": body.review_text,
        "name": user.get("display_name") or user.get("email", ""),
        "email": user.get("email", ""),
    }

    result = db.db.table("reviews").insert(payload).execute()
    row = result.data[0]
    return ReviewResponse(
        id=row["id"],
        rating=row["rating"],
        review_text=row.get("review_text"),
        created_at=row["created_at"],
    )


@router.get("/export")
async def export_reviews(current_user: dict = Depends(get_current_user)):
    """Return all reviews with user details as JSON (for PDF generation)."""
    db = DatabaseService()
    result = (
        db.db.table("reviews")
        .select("*, users(email, display_name, clerk_id)")
        .order("created_at", desc=True)
        .execute()
    )
    return {"reviews": result.data, "total": len(result.data)}
