# ⬡ Decision Arena

> **Don't just decide. Decide better.**

An AI-powered decision simulation platform where multiple expert agents debate, challenge, and stress-test your most important decisions — exposing blind spots through structured adversarial deliberation.

---

## Quick Start (WSL2 Ubuntu Linux)

### Prerequisites

```bash
# Verify WSL2 Ubuntu
uname -a   # Should show Linux ... Microsoft

# Check Node (use nvm)
node --version   # Should be 20.x

# Check Python
python3 --version  # Should be 3.11+
```

### 1. Clone & Setup

```bash
cd ~
git clone https://github.com/your-username/decision-arena.git
cd decision-arena
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt --break-system-packages

# Configure environment
cp .env.example .env
# Edit .env — fill in GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CLERK_SECRET_KEY

# Run backend
uvicorn app.main:app --reload --port 8000
```

Backend available at: http://localhost:8000
API docs (debug mode): http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local — fill in CLERK keys, SUPABASE keys

# Run frontend
npm run dev
```

Frontend available at: http://localhost:3000

### 4. Database Setup (Supabase)

```bash
# 1. Create project at supabase.com
# 2. Go to SQL Editor
# 3. Run the migration:
cat supabase/migrations/001_initial_schema.sql
# Paste into Supabase SQL Editor and execute

# 4. Create Storage Bucket:
# Dashboard > Storage > New Bucket
# Name: reports
# Public: false

# 5. Copy credentials to backend/.env
```

---

## Architecture

```
Frontend (Next.js + Vercel)
    ↕ HTTPS + WSS
Backend (FastAPI + Railway)
    ↕
LangGraph Debate Engine
    ├── ExpertAgent (×4-6 per debate)
    ├── ModeratorAgent
    ├── FallacyDetectorAgent
    ├── FactCheckerAgent
    └── ScorerAgent
    ↕
Gemini 2.5 Pro (primary LLM)
OpenAI (fallback)
    ↕
Supabase (PostgreSQL + Storage)
```

---

## Debate Modes

| Mode | Description |
|------|-------------|
| **Standard** | Expert panel debates your decision |
| **Boardroom** | You're the CEO; AI execs challenge you |
| **Shark Tank** | AI investors evaluate your startup idea |
| **Policy Arena** | Economists & politicians debate policy |

---

## Debate Stages

1. **Opening Statements** — Each expert presents their position
2. **Cross-Examination** — Experts question each other
3. **Challenges** — Weakest arguments are challenged (+ fallacy detection)
4. **Audience Intervention** — User can inject any question
5. **Rebuttals** — Experts defend their positions
6. **Closing Statements** — Final positions
7. **Final Verdict** — AI synthesizes consensus, risks, recommendations + heatmap

---

## Testing

```bash
# Backend
cd backend
source .venv/bin/activate
pytest tests/ -v

# Frontend
cd frontend
npm run type-check
npm run lint
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
# Set environment variables in Vercel Dashboard
```

### Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

cd backend
railway init
railway up
# Set environment variables in Railway Dashboard
```

### Environment Variables Summary

**Frontend (Vercel)**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

**Backend (Railway)**
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (optional fallback)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ALLOWED_ORIGINS`
- `SECRET_KEY`

---

## Project Structure

```
decision-arena/
├── frontend/          # Next.js 14 App Router
│   ├── app/           # Pages & API routes
│   ├── components/    # UI components
│   ├── store/         # Zustand state
│   ├── hooks/         # React hooks
│   ├── lib/           # API client, WebSocket, utils
│   └── types/         # TypeScript types
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── agents/    # AI agent implementations
│   │   ├── engine/    # Debate orchestrator
│   │   ├── api/       # REST + WebSocket endpoints
│   │   ├── models/    # Pydantic models
│   │   └── services/  # LLM, PDF generation
│   └── tests/         # pytest tests
├── supabase/
│   └── migrations/    # SQL schema
└── .github/
    └── workflows/     # CI/CD
```

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Zustand
- **Backend**: FastAPI, Python 3.11, LangGraph
- **AI**: Gemini 2.5 Pro (primary), OpenAI GPT-4o (fallback)
- **Database**: Supabase (PostgreSQL + Storage + Realtime)
- **Auth**: Clerk
- **Deployment**: Vercel (frontend) + Railway (backend)

---

## Compliance & Security

- All API routes protected by Clerk JWT validation
- Row-level security on Supabase (service role key never exposed to frontend)
- CORS restricted to allowed origins
- Rate limiting on all endpoints (slowapi)
- Input validation via Pydantic v2
- Security headers set on all responses
- No sensitive credentials in codebase (all via environment variables)
- Free tier rate limiting (3 debates/day)

---

Built for hackathon. Powered by Gemini 2.5 Pro.
