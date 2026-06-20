# Changelog

All notable changes to Decision Arena are documented here.

This file is auto-updated by [git-cliff](https://git-cliff.org/) on each release.
See [cliff.toml](cliff.toml) for configuration.

## [Unreleased]

### Added
- Google ADK (Agent Development Kit) integration: `DocumentQAAgent` (`app/services/document_qa/adk_agent.py`) is now the primary Document Q&A engine — a real ADK `Agent` (model `gemini-2.5-flash`) with a `read_section` function tool, run via `InMemoryRunner`, replacing the hand-rolled find→retrieve→answer loop with ADK's own tool-calling reasoning loop. Active whenever `GEMINI_API_KEY` is set
- Document Q&A fallback path: when no `GEMINI_API_KEY` is configured, `api/documents.py` now falls back to the original fully-offline `workflow.find_retrieve_answer()` + local Llama.cpp model, so the feature keeps working with no API key
- `google-adk==2.2.0` added to `backend/requirements.txt`
- Multi-parameter decision debates: `PanelBuilderAgent.extract_decision_parameters()` decomposes the question into 3–5 decision-relevant dimensions (e.g. cost, effectiveness, feasibility, risk) before the debate starts, instead of letting the panel converge on a single number/detail mentioned in the question. Each expert is assigned a focus parameter (round-robin) for opening/closing statements, cross-examination is instructed to surface any unaddressed parameter, and the verdict synthesis is required to touch more than one parameter. Parameters are streamed to the frontend via a new `decision_parameters` WebSocket event and shown as chips above the debate stage indicator
- Local-first document Q&A feature: upload a PDF/DOCX/TXT/MD/PPTX/XLSX and ask questions about it, answered entirely on-device — no vectorDB, no embeddings, no external API key. Modeled on the Mozilla.ai ["structured-qa" Blueprint](https://blueprints.mozilla.ai/all-blueprints/query-structured-documents-using-a-lightweight-llm-workflow)
- `app/services/document_qa/` pipeline: PyMuPDF4LLM markdown extraction + heading-based section splitting (`preprocessing.py`), Llama.cpp local GGUF model loading with process-wide caching (`model_loader.py`), rapidfuzz-matched find→retrieve→answer loop (`workflow.py`)
- `POST/GET /api/v1/documents`, `POST /api/v1/documents/{id}/ask`, `GET /api/v1/documents/{id}/questions`, `DELETE /api/v1/documents/{id}` endpoints
- `documents` and `document_questions` tables in Supabase (`003_documents.sql`) with RLS policies
- Default local model: `bartowski/Qwen2.5-7B-Instruct-GGUF/Qwen2.5-7B-Instruct-Q8_0.gguf` (configurable via `DOCUMENT_QA_MODEL`)
- Frontend `/documents` list page (upload + status polling) and `/documents/{id}` Q&A page, `documentStore` Zustand store, nav link (i18n: EN/HI/KN)
- Multi-provider LLM support: Groq, Ollama (local/offline), Gemini 2.5 Flash, OpenAI — selectable per debate from the UI
- Per-debate `llm_config` threaded through classify → create → orchestrator → all agents
- AI Settings panel in frontend: choose provider, model, and API key per debate
- `LLMUserConfig` Pydantic model for validated per-request LLM configuration
- User reviews system: 1–5 star rating + written feedback after each debate
- `reviews` table in Supabase with RLS policy (users can only write their own reviews)
- `GET/POST /api/v1/reviews` and `GET /api/v1/reviews/{debate_id}` endpoints
- `export_reviews.py` — standalone script to export all reviews to a formatted PDF with Clerk user enrichment
- Multilingual debate support: English, Hindi (हिंदी), Kannada (ಕನ್ನಡ)
- Post-debate Q&A mode: WebSocket stays open after debate completes, allowing audience questions
- Verdict loading animation with pulsing skeleton while panel deliberates
- Smart scroll: chat auto-scrolls only when user is near the bottom
- Expert panel bias system (optimist / pessimist / neutral / contrarian)
- Score deduplication in Zustand store to prevent double-render
- `AGENTS.md` documenting the full multi-agent architecture
- `USER_MANUAL.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- Full CI pipeline (.gitlab-ci.yml) with test, lint, format, type_check, coverage jobs
- Pre-commit hooks enforcing lint, format, type-check, and security checks
- Spec-Kit spec-driven development scaffolding

### Fixed
- Post-debate follow-up Q&A silently dropping questions: the WebSocket connection opened for a live debate stayed open unchanged after completion, so a follow-up question sent over that same connection was routed to the (by-then-dead) in-debate audience-injection queue instead of Q&A mode. The backend now hands the same connection directly to Q&A mode the moment the debate completes, so every follow-up gets a real streamed expert response
- In-debate audience question injection being silently dropped: the orchestrator only drained the injection queue at a `rebuttals` stage that had already been removed from the stage pipeline. The queue is now drained after every stage
- Stale closure bug in `debate_complete` WebSocket handler — fixed by using `useDebateStore.getState()` instead of captured store reference
- JWT token expiry mid-debate — Clerk token refreshed before each WebSocket connection
- Doubled text bug caused by React StrictMode double-invocation of async effects
- Duplicate orchestrator spawns on WebSocket reconnect
- `verdict.final_scores is not iterable` crash in FinalVerdict component
- `debate.experts` → `debate.panel` reference error in DebateHistory
- Stale Zustand state persisting across new debates (missing `resetDebate()`)
- Verdict LLM truncation (increased max_tokens from 350 to 1200 for moderator)
- Scores displaying twice (removed from verdict section, kept in sidebar only)

### Changed
- Backend deployment migrated from Railway to Render
- Default LLM changed to Groq llama-3.1-8b-instant (500 tok/s) replacing Gemini
- Debate stages reduced to `[opening, cross_examination, closing, verdict]`
- Expert messages limited to 60–80 words (opening) / 2–4 sentences (other stages)
- Font sizes increased for readability
- Final verdict rendered full-width below the debate layout

## [0.1.0] — 2026-06-01

### Added
- Initial release: multi-expert AI debate platform
- Next.js 15 frontend with App Router and Zustand state management
- FastAPI backend with WebSocket streaming
- Supabase database integration
- Clerk authentication
- PDF export of debate reports
- Debate history with full transcript view
