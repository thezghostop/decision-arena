# Plan — Decision Arena

## Phase 1: Core Debate Engine
- FastAPI backend with WebSocket support
- LangGraph orchestration for multi-agent debate flow
- ExpertAgent, ModeratorAgent, ScorerAgent implementations
- Groq LLM integration (llama-3.1-8b-instant)

## Phase 2: Frontend
- Next.js 15 App Router frontend
- Real-time WebSocket client with token streaming
- Debate UI: expert cards, scoreboard, verdict panel
- Zustand state management

## Phase 3: Auth & Persistence
- Clerk authentication (Google + email)
- Supabase database for debate history
- User-scoped debate ownership

## Phase 4: Polish
- PDF export of debate reports
- Post-debate Q&A mode
- Debate history page
- Rate limiting (free tier: 3 debates/day)
