"""
Document Q&A endpoints — upload a document, ask questions about it.

No vectorDB, no embeddings: PyMuPDF4LLM splits the document into sections on
disk. Answering is then handled by one of two engines:

  - Primary: a Google ADK `Agent` (Gemini-backed) that reads sections via a
    `read_section` tool, used whenever `GEMINI_API_KEY` is configured. See
    app/services/document_qa/adk_agent.py.
  - Fallback: the original fully-offline loop — a local Llama.cpp model
    finds the relevant section and answers from it directly, no API key,
    no network calls at inference time. See app/services/document_qa/
    workflow.py. Used when no GEMINI_API_KEY is set.

Modeled on the Mozilla.ai "structured-qa" Blueprint.
"""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks

from app.auth import get_current_user
from app.config import get_settings
from app.database import DatabaseService
from app.models.document import (
    AskDocumentRequest,
    AskDocumentResponse,
    DocumentQuestionResponse,
    DocumentResponse,
    DocumentStatus,
    UploadDocumentResponse,
)
from app.services.document_qa import document_to_sections_dir, find_retrieve_answer
from app.services.document_qa.adk_agent import answer_question_via_adk
from app.services.document_qa.model_loader import get_or_load_model
from app.services.document_qa.config import FIND_PROMPT, ANSWER_PROMPT

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".pptx", ".xlsx"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post("/upload", response_model=UploadDocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> UploadDocumentResponse:
    db = DatabaseService()
    clerk_id = user.get("sub", "")
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user:
        email = user.get("email", f"{clerk_id}@unknown.com")
        db_user = await db.upsert_user(clerk_id=clerk_id, email=email)
    user_id = db_user["id"]

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {suffix!r}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 25 MB).")

    document_id = str(uuid.uuid4())
    doc_dir = Path(settings.document_qa_storage_dir) / user_id / document_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    storage_path = doc_dir / f"original{suffix}"
    storage_path.write_bytes(contents)

    sections_dir = doc_dir / "sections"

    document_data = {
        "id": document_id,
        "user_id": user_id,
        "filename": file.filename or "document",
        "storage_path": str(storage_path),
        "sections_dir": str(sections_dir),
        "status": DocumentStatus.processing.value,
        "num_sections": 0,
    }
    created = await db.create_document(document_data)

    background_tasks.add_task(_process_document, document_id, storage_path, sections_dir)

    return UploadDocumentResponse(document_id=document_id, document=_map_document(created))


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(user: dict = Depends(get_current_user)) -> list[DocumentResponse]:
    db = DatabaseService()
    db_user = await db.get_user_by_clerk_id(user.get("sub", ""))
    if not db_user:
        return []
    documents = await db.list_documents(db_user["id"])
    return [_map_document(d) for d in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user: dict = Depends(get_current_user),
) -> DocumentResponse:
    db = DatabaseService()
    document = await _get_and_authorize_document(db, document_id, user)
    return _map_document(document)


@router.post("/{document_id}/ask", response_model=AskDocumentResponse)
async def ask_document(
    document_id: str,
    payload: AskDocumentRequest,
    user: dict = Depends(get_current_user),
) -> AskDocumentResponse:
    db = DatabaseService()
    document = await _get_and_authorize_document(db, document_id, user)

    if document["status"] != DocumentStatus.ready.value:
        raise HTTPException(
            status_code=409,
            detail=f"Document is not ready yet (status: {document['status']}).",
        )

    if settings.gemini_api_key:
        # Primary engine: ADK Agent, Gemini-backed tool-calling reasoning loop.
        try:
            answer, sections_checked = await answer_question_via_adk(
                question=payload.question,
                sections_dir=document["sections_dir"],
                api_key=settings.gemini_api_key,
                max_sections_to_check=settings.document_qa_max_sections,
            )
        except Exception as exc:
            logger.exception("ADK document Q&A agent failed")
            raise HTTPException(
                status_code=503,
                detail="The document Q&A agent failed to respond. Check server logs.",
            ) from exc
    else:
        # Fallback engine: fully offline, no API key — local Llama.cpp model.
        try:
            model = get_or_load_model(settings.document_qa_model)
        except Exception as exc:
            logger.exception("Failed to load document Q&A model")
            raise HTTPException(
                status_code=503,
                detail="No GEMINI_API_KEY is configured, and the local LLM is not "
                "available either. Set GEMINI_API_KEY for the ADK agent, or check "
                "that llama-cpp-python is installed and the model can be downloaded "
                "on this server.",
            ) from exc

        answer, sections_checked = find_retrieve_answer(
            question=payload.question,
            model=model,
            sections_dir=document["sections_dir"],
            find_prompt=FIND_PROMPT,
            answer_prompt=ANSWER_PROMPT,
            max_sections_to_check=settings.document_qa_max_sections,
        )

    await db.save_document_question({
        "document_id": document_id,
        "user_id": document["user_id"],
        "question": payload.question,
        "answer": answer,
        "sections_checked": sections_checked,
    })

    return AskDocumentResponse(answer=answer, sections_checked=sections_checked)


@router.get("/{document_id}/questions", response_model=list[DocumentQuestionResponse])
async def get_document_questions(
    document_id: str,
    user: dict = Depends(get_current_user),
) -> list[DocumentQuestionResponse]:
    db = DatabaseService()
    await _get_and_authorize_document(db, document_id, user)
    questions = await db.get_document_questions(document_id)
    return [_map_question(q) for q in questions]


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user: dict = Depends(get_current_user),
) -> None:
    db = DatabaseService()
    document = await _get_and_authorize_document(db, document_id, user)

    storage_path = Path(document["storage_path"])
    shutil.rmtree(storage_path.parent, ignore_errors=True)

    await db.delete_document(document_id)


# ── Background task ─────────────────────────────────────────────────────────

def _process_document(document_id: str, storage_path: Path, sections_dir: Path) -> None:
    """Runs in the background after upload: extract sections, update status."""
    import asyncio

    async def _run() -> None:
        db = DatabaseService()
        try:
            section_names = document_to_sections_dir(storage_path, sections_dir)
            await db.update_document_status(
                document_id, DocumentStatus.ready.value, num_sections=len(section_names)
            )
            logger.info("Document %s ready with %d sections", document_id, len(section_names))
        except Exception as exc:
            logger.exception("Failed to process document %s", document_id)
            await db.update_document_status(
                document_id, DocumentStatus.error.value, error_message=str(exc)
            )

    asyncio.run(_run())


# ── Private Helpers ───────────────────────────────────────────────────────────

async def _get_and_authorize_document(db: DatabaseService, document_id: str, user: dict) -> dict:
    document = await db.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    db_user = await db.get_user_by_clerk_id(user.get("sub", ""))
    if not db_user or document["user_id"] != db_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    return document


def _map_document(d: dict) -> DocumentResponse:
    return DocumentResponse(
        id=d["id"],
        user_id=d["user_id"],
        filename=d["filename"],
        status=d["status"],
        num_sections=d.get("num_sections", 0),
        error_message=d.get("error_message"),
        created_at=d["created_at"] if isinstance(d["created_at"], datetime) else datetime.fromisoformat(d["created_at"]),
    )


def _map_question(q: dict) -> DocumentQuestionResponse:
    return DocumentQuestionResponse(
        id=q["id"],
        document_id=q["document_id"],
        question=q["question"],
        answer=q["answer"],
        sections_checked=q.get("sections_checked", []),
        created_at=q["created_at"] if isinstance(q["created_at"], datetime) else datetime.fromisoformat(q["created_at"]),
    )
