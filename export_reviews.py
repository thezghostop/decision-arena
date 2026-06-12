#!/usr/bin/env python3
"""
Decision Arena — Review Export Script
Fetches all reviews from Supabase and generates a formatted PDF.

Usage:
    python export_reviews.py
    python export_reviews.py --output reviews_2026.pdf

Requirements:
    pip install supabase reportlab python-dotenv --break-system-packages
"""

import argparse
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from supabase import create_client


# ── Load env ──────────────────────────────────────────────────────────────────

# Try backend .env first, then project root
for env_path in [
    os.path.join(os.path.dirname(__file__), "backend", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("supabase_url")
SUPABASE_SERVICE_KEY = (
    os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("supabase_service_key")
)
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env")
    sys.exit(1)


# ── Fetch reviews ─────────────────────────────────────────────────────────────

def fetch_clerk_users(clerk_ids: list[str]) -> dict[str, dict]:
    """Fetch real names + emails from Clerk API. Returns {clerk_id: {name, email}}."""
    if not CLERK_SECRET_KEY or not clerk_ids:
        return {}
    import urllib.request
    import json as _json
    result = {}
    for cid in clerk_ids:
        try:
            req = urllib.request.Request(
                f"https://api.clerk.com/v1/users/{cid}",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = _json.loads(resp.read())
            first = data.get("first_name") or ""
            last = data.get("last_name") or ""
            name = f"{first} {last}".strip()
            emails = data.get("email_addresses", [])
            email = emails[0]["email_address"] if emails else ""
            result[cid] = {"name": name or email, "email": email}
        except Exception:
            pass
    return result


def fetch_reviews() -> list[dict]:
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    result = (
        db.table("reviews")
        .select("*, users(email, display_name, clerk_id)")
        .order("created_at", desc=True)
        .execute()
    )
    reviews = result.data or []

    # Enrich with real Clerk data
    clerk_ids = list({
        r["users"]["clerk_id"]
        for r in reviews
        if r.get("users") and r["users"].get("clerk_id")
    })
    clerk_map = fetch_clerk_users(clerk_ids)

    for r in reviews:
        cid = (r.get("users") or {}).get("clerk_id")
        if cid and cid in clerk_map:
            r["_clerk_name"] = clerk_map[cid]["name"]
            r["_clerk_email"] = clerk_map[cid]["email"]

    return reviews


# ── Star rendering ────────────────────────────────────────────────────────────

def stars(n: int) -> str:
    return "★" * n + "☆" * (5 - n)


RATING_LABELS = {1: "Poor", 2: "Fair", 3: "Good", 4: "Great", 5: "Excellent"}
RATING_COLORS = {
    1: colors.HexColor("#ef4444"),
    2: colors.HexColor("#f97316"),
    3: colors.HexColor("#eab308"),
    4: colors.HexColor("#22c55e"),
    5: colors.HexColor("#8b5cf6"),
}


# ── PDF generation ────────────────────────────────────────────────────────────

def build_pdf(reviews: list[dict], output_path: str) -> None:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    base = getSampleStyleSheet()
    story = []

    # ── Cover / Header ────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "Title",
        parent=base["Title"],
        fontSize=24,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=base["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=0,
    )
    story.append(Paragraph("Decision Arena", title_style))
    story.append(Paragraph("User Review Report", subtitle_style))
    story.append(
        Paragraph(
            f"Generated {datetime.now(timezone.utc).strftime('%d %B %Y, %H:%M UTC')} · "
            f"{len(reviews)} review{'s' if len(reviews) != 1 else ''}",
            subtitle_style,
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#8b5cf6")))
    story.append(Spacer(1, 0.6 * cm))

    # ── Summary stats ─────────────────────────────────────────────────────────
    if reviews:
        avg = sum(r["rating"] for r in reviews) / len(reviews)
        dist = {i: sum(1 for r in reviews if r["rating"] == i) for i in range(1, 6)}

        stats_style = ParagraphStyle(
            "Stats",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#374151"),
        )
        story.append(
            Paragraph(
                f"<b>Average rating:</b> {avg:.1f} / 5.0 &nbsp;&nbsp; "
                f"<b>Distribution:</b> "
                + " | ".join(f"{i}★ × {dist[i]}" for i in range(5, 0, -1)),
                stats_style,
            )
        )
        story.append(Spacer(1, 0.8 * cm))

    # ── Individual reviews ────────────────────────────────────────────────────
    name_style = ParagraphStyle(
        "Name",
        parent=base["Normal"],
        fontSize=12,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#111827"),
        spaceAfter=2,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=base["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=4,
    )
    review_text_style = ParagraphStyle(
        "ReviewText",
        parent=base["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#374151"),
        leading=14,
        spaceAfter=0,
    )
    no_review_style = ParagraphStyle(
        "NoReview",
        parent=base["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#9ca3af"),
        fontName="Helvetica-Oblique",
        spaceAfter=0,
    )

    for i, review in enumerate(reviews, start=1):
        # User info — prefer live Clerk data
        user = review.get("users") or {}
        name = (
            review.get("_clerk_name")
            or user.get("display_name")
            or review.get("name")
            or "Anonymous"
        )
        email = (
            review.get("_clerk_email")
            or user.get("email")
            or review.get("email")
            or "—"
        )
        rating = review["rating"]
        label = RATING_LABELS.get(rating, "")
        star_color = RATING_COLORS.get(rating, colors.grey)
        debate_id = review.get("debate_id") or "—"
        created_raw = review.get("created_at", "")
        try:
            created = datetime.fromisoformat(created_raw.replace("Z", "+00:00")).strftime(
                "%d %b %Y, %H:%M UTC"
            )
        except Exception:
            created = created_raw

        # Card via a single-cell table for the background tint
        star_para = Paragraph(
            f'<font color="{star_color.hexval() if hasattr(star_color, "hexval") else "#8b5cf6"}" size="14"><b>{stars(rating)}</b></font>'
            f'  <font size="10" color="#6b7280">{label}</font>',
            ParagraphStyle("Stars", parent=base["Normal"], spaceAfter=4),
        )

        card_contents = [
            Paragraph(f"#{i} — {name}", name_style),
            Paragraph(
                f"{email} &nbsp;·&nbsp; Debate: {debate_id[:8]}… &nbsp;·&nbsp; {created}",
                meta_style,
            ),
            star_para,
            Paragraph(
                review["review_text"] if review.get("review_text") else "(no written review)",
                review_text_style if review.get("review_text") else no_review_style,
            ),
        ]

        card_table = Table(
            [[card_contents]],
            colWidths=["100%"],
        )
        card_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ])
        )
        story.append(card_table)
        story.append(Spacer(1, 0.35 * cm))

    if not reviews:
        story.append(
            Paragraph("No reviews found.", ParagraphStyle("Empty", parent=base["Normal"], textColor=colors.grey))
        )

    doc.build(story)
    print(f"✓ Exported {len(reviews)} reviews → {output_path}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Export Decision Arena reviews to PDF")
    parser.add_argument(
        "--output",
        default=f"reviews_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
        help="Output PDF filename (default: reviews_YYYYMMDD_HHMMSS.pdf)",
    )
    args = parser.parse_args()

    print("Fetching reviews from Supabase…")
    reviews = fetch_reviews()
    print(f"Found {len(reviews)} review(s).")

    build_pdf(reviews, args.output)


if __name__ == "__main__":
    main()
