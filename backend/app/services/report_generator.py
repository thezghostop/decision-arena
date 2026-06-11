"""PDF report generator using ReportLab."""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


async def generate_pdf_report(
    debate: dict,
    messages: list[dict],
    scores: list[dict],
    verdict: Optional[dict],
) -> str:
    """
    Generate a PDF report and return a data URI or storage URL.
    For MVP: saves to Supabase Storage and returns signed URL.
    """
    try:
        pdf_bytes = _build_pdf(debate, messages, scores, verdict)
        url = await _upload_pdf(debate["id"], pdf_bytes)
        return url
    except Exception as exc:
        logger.error("PDF generation failed: %s", exc)
        raise RuntimeError(f"Failed to generate report: {exc}") from exc


def _build_pdf(debate: dict, messages: list[dict], scores: list[dict], verdict: Optional[dict]) -> bytes:
    """Build PDF using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#7C3AED"),
        spaceAfter=6,
    )
    story.append(Paragraph("Decision Arena — Debate Report", title_style))

    # Question
    q_style = ParagraphStyle(
        "Question", parent=styles["Normal"],
        fontSize=14, textColor=colors.HexColor("#1E293B"), spaceBefore=4, spaceAfter=12,
    )
    story.append(Paragraph(f'<b>Question:</b> {debate.get("question", "")}', q_style))
    story.append(Paragraph(
        f'Category: {debate.get("category", "")} | Mode: {debate.get("mode", "")} | '
        f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}',
        styles["Normal"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceBefore=12, spaceAfter=12))

    # Executive Summary
    if verdict and verdict.get("executive_summary"):
        story.append(Paragraph("<b>Executive Summary</b>", styles["Heading2"]))
        story.append(Paragraph(verdict["executive_summary"], styles["Normal"]))
        story.append(Spacer(1, 12))

    # Scores Table
    if scores:
        story.append(Paragraph("<b>Expert Scoreboard</b>", styles["Heading2"]))
        score_data = [["Expert", "Logic", "Evidence", "Practicality", "Risk", "Overall"]]
        for s in scores:
            score_data.append([
                s.get("agent_name", s.get("agent_id", "?")),
                f"{s.get('logic_score', 0):.0f}",
                f"{s.get('evidence_score', 0):.0f}",
                f"{s.get('practicality_score', 0):.0f}",
                f"{s.get('risk_awareness_score', 0):.0f}",
                f"{s.get('overall_score', 0):.0f}",
            ])
        t = Table(score_data, colWidths=[4 * cm, 2 * cm, 2 * cm, 2.5 * cm, 2 * cm, 2 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7C3AED")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    # Verdict sections
    if verdict:
        for section, title, _color in [
            ("consensus_areas", "Consensus Areas", "#10B981"),
            ("risks", "Key Risks", "#EF4444"),
            ("opportunities", "Opportunities", "#2563EB"),
            ("recommended_actions", "Recommended Actions", "#F59E0B"),
        ]:
            items = verdict.get(section, [])
            if items:
                story.append(Paragraph(f"<b>{title}</b>", styles["Heading2"]))
                for item in items:
                    story.append(Paragraph(f"• {item}", styles["Normal"]))
                story.append(Spacer(1, 8))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceBefore=8, spaceAfter=8))

    # Debate transcript (truncated)
    story.append(Paragraph("<b>Debate Transcript</b>", styles["Heading2"]))
    for msg in messages[:30]:  # Cap for PDF size
        agent_style = ParagraphStyle(
            "AgentLabel",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#7C3AED"),
            fontName="Helvetica-Bold",
            spaceBefore=8,
        )
        story.append(Paragraph(f"{msg.get('agent_name', '?')} — {msg.get('stage', '')}", agent_style))
        content = msg.get("content", "")[:600]
        story.append(Paragraph(content, styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()


async def _upload_pdf(debate_id: str, pdf_bytes: bytes) -> str:
    """Upload PDF to Supabase Storage and return signed URL."""
    from app.database import get_supabase
    supabase = get_supabase()
    filename = f"reports/{debate_id}.pdf"

    try:
        supabase.storage.from_("reports").upload(
            filename,
            pdf_bytes,
            {"content-type": "application/pdf", "cache-control": "3600", "upsert": "true"},
        )
        signed = supabase.storage.from_("reports").create_signed_url(filename, 3600)
        return signed["signedURL"]
    except Exception as exc:
        logger.warning("Supabase storage upload failed: %s", exc)
        # Fallback: return as base64 data URI
        import base64
        b64 = base64.b64encode(pdf_bytes).decode()
        return f"data:application/pdf;base64,{b64}"
