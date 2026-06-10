# Decision Arena — Project Constitution

## Purpose

Decision Arena helps individuals and teams make better decisions by simulating adversarial expert debate around a question or dilemma. It surfaces blind spots, stress-tests assumptions, and synthesises a structured final recommendation.

## Core Principles

1. **Adversarial by design** — every claim is challenged; consensus is earned, not assumed.
2. **Transparency** — all reasoning is visible; no black-box verdicts.
3. **Brevity** — expert responses are short and punchy; signal over noise.
4. **User control** — users can inject questions at any stage and drive the debate.
5. **Privacy first** — debates belong to the user; nothing is shared externally.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 15 + App Router | Server components, streaming, edge-ready |
| State management | Zustand | Lightweight, singleton store, devtools support |
| Backend | FastAPI | Async-native, WebSocket support, Python ecosystem |
| LLM provider | Groq (llama-3.1-8b-instant) | High throughput, low latency, 131k TPM free tier |
| Database | Supabase (PostgreSQL) | Managed Postgres with real-time and auth helpers |
| Auth | Clerk | Drop-in JWT auth with webhook support |
| Streaming | WebSocket | True real-time token streaming to the browser |

## What We Do Not Do

- No autonomous multi-step agents without human-in-the-loop
- No storing or logging debate content for training purposes
- No exposing user data across accounts
- No mocking the database in integration tests

## Definition of Done

A feature is done when:
- [ ] Backend endpoint or WS event implemented and tested
- [ ] Frontend component renders correctly and handles loading/error states
- [ ] No TypeScript errors, no ruff lint errors
- [ ] Relevant spec in `specs/` updated or created