# Tasks — Decision Arena

## Backend
- [x] FastAPI app scaffold with CORS and WebSocket endpoint
- [x] LangGraph debate orchestrator
- [x] ExpertAgent with opening / cross-examination / closing stages
- [x] ModeratorAgent for final verdict generation
- [x] ScorerAgent for per-expert scoring
- [x] Groq streaming integration
- [x] Supabase debate persistence
- [x] Clerk JWT authentication middleware
- [x] Post-debate Q&A mode (inject question via WebSocket)

## Frontend
- [x] Next.js 15 App Router setup with Clerk
- [x] Debate creation form (question, category, mode)
- [x] Live debate UI with streaming expert messages
- [x] Scoreboard sidebar
- [x] Final verdict display
- [x] Debate history page
- [x] PDF export

## DevOps / Quality
- [x] GitLab CI pipeline (lint, format, type_check, security, test, coverage)
- [x] Pre-commit hooks (ruff, mypy, gitleaks, bandit)
- [x] Dockerfile (multi-stage backend + frontend)
- [x] .env.example with all required variables
