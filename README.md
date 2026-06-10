# Decision Arena

🏆 Built for the 1st Hackathon of the Swecha Internship Programme — a national-level AI challenge focused on intelligent decision-making tools.

An AI-powered decision simulation platform where multiple expert agents debate, challenge, and stress-test your most important decisions — exposing blind spots through structured adversarial deliberation.

---

## About Project

**Focus Area:** National level — India

### Problem Statement

Making good decisions is hard. Whether it's a business pivot, a career move, a policy call, or a personal dilemma — most people consult one or two opinions and move on. They miss critical risks, overlook opposing perspectives, and fail to stress-test their assumptions. There's no easy way to simulate adversarial expert thinking before committing to a decision.

### Proposed Solution

Decision Arena puts a panel of AI expert agents in the room with you. You describe your decision, and a structured debate unfolds — opening arguments, cross-examination, closing statements, and a final synthesised verdict with risk analysis, top recommendations, and per-expert scores. You can also inject your own questions mid-debate and ask follow-ups after it ends.

### Existing Solutions

Existing tools like ChatGPT or Google Gemini give a single perspective on demand. Pro/con list generators are static and shallow. Strategy consulting is expensive and inaccessible. None of these simulate genuine adversarial debate between multiple distinct expert viewpoints, with real-time streaming and structured scoring.

### What Makes This Unique

Decision Arena is the only platform that simulates a live multi-expert adversarial debate with token-by-token streaming, structured scoring across six criteria, and an AI-synthesised final verdict with heatmap data. It supports post-debate Q&A — the panel stays available for follow-up questions after the debate ends. The entire experience is designed around explainability: you see every argument, every score, and every reasoning step.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Framer Motion |
| State Management | Zustand |
| Backend | FastAPI (Python 3.12) |
| AI / LLM | Groq — llama-3.1-8b-instant |
| Database | Supabase (PostgreSQL) |
| Auth | Clerk |
| Streaming | WebSocket (real-time token streaming) |
| PDF Export | ReportLab |
| Deployment | Vercel (frontend), Railway (backend) |
| Version Control | Git + GitLab |

---

## Problem

People face high-stakes decisions every day:

- Business founders pivoting their startup without stress-testing the idea
- Job seekers choosing between offers without understanding long-term implications
- Policy makers evaluating options without hearing adversarial counter-arguments
- Individuals making financial decisions based on incomplete information

Most decision-support tools give a single answer. None simulate what it's like to have a room full of experts who genuinely disagree with each other.

---

## Solution

Decision Arena assembles an AI expert panel and runs a structured multi-stage debate around your question:

- **Expert agents** with distinct biases (optimist, pessimist, contrarian, neutral) argue their positions
- **Real-time streaming** delivers every token to your browser as it's generated
- **Cross-examination** forces experts to challenge each other's weakest arguments
- **Scoring** evaluates each expert on logic, evidence, practicality, risk awareness, long-term thinking, and persuasiveness
- **Final verdict** synthesises consensus areas, key disagreements, top recommendation, opportunities, and risks
- **Post-debate Q&A** keeps the panel available for follow-up questions after the debate ends

---

## Features

| Feature | Description |
|---------|-------------|
| Live Debate Streaming | Token-by-token streaming via WebSocket — watch experts think in real time |
| Multi-Expert Panel | 3–6 AI experts with distinct roles, biases, and analytical styles |
| Structured Stages | Opening → Cross-Examination → Closing → Verdict |
| Expert Scoring | Six-criteria scoring: logic, evidence, practicality, risk awareness, long-term thinking, persuasiveness |
| Final Verdict | AI-synthesised recommendation with confidence score, risks, and opportunities |
| Verdict Loading Animation | Pulsing skeleton animation while the panel deliberates |
| Post-Debate Q&A | Ask the panel follow-up questions after the debate ends (10-min window) |
| Audience Injection | Inject your own question mid-debate to steer the conversation |
| Debate History | Full transcript and verdict for every past debate |
| PDF Export | Download the full debate report as a formatted PDF |
| Smart Scroll | Auto-scrolls only when near the bottom — read earlier messages freely |
| Responsive UI | Works on desktop and mobile |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+ (LTS)
- Git
- A [Groq API key](https://console.groq.com) (free tier: 131k TPM)
- A [Supabase](https://supabase.com) project
- A [Clerk](https://clerk.com) application

### 1. Clone the repository

```bash
git clone https://code.swecha.org/chaitanyachalith/decision-arena.git
cd decision-arena
```

### 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CLERK_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

API available at: http://localhost:8000
API docs: http://localhost:8000/docs

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local — fill in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, NEXT_PUBLIC_API_URL
npm run dev
```

Frontend available at: http://localhost:3000

### 4. Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL Editor
3. Run `supabase/migrations/001_initial_schema.sql`
4. Copy your project URL and service role key into `backend/.env`

---

## Project Structure

```
decision-arena/
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/
│   │   ├── arena/              # DebateArena, MessageBubble, Scoreboard, FinalVerdict
│   │   └── landing/            # Hero, Features, HowItWorks
│   ├── store/                  # Zustand debate store
│   ├── hooks/                  # useWebSocket
│   ├── lib/                    # API client, WebSocket manager, utils
│   └── types/                  # TypeScript types
├── backend/
│   ├── app/
│   │   ├── agents/             # ExpertAgent, ModeratorAgent, ScorerAgent, PanelBuilder
│   │   ├── engine/             # DebateOrchestrator
│   │   ├── api/                # REST endpoints + WebSocket handler
│   │   ├── models/             # Pydantic models
│   │   └── services/           # LLM service (Groq), PDF generator
│   └── tests/                  # pytest test suite
├── supabase/
│   └── migrations/             # SQL schema
├── specs/                      # Spec-Driven Development feature specs
├── .specify/                   # Project constitution and templates
├── .pre-commit-config.yaml     # Pre-commit hooks
├── .gitlab-ci.yml              # CI/CD pipeline
└── README.md
```

---

## API Reference

### `POST /api/v1/debates`

Creates a new debate.

**Body:**
```json
{
  "question": "Should I co-found this startup?",
  "category": "business",
  "mode": "standard"
}
```

**Response:**
```json
{
  "id": "uuid",
  "question": "Should I co-found this startup?",
  "status": "pending",
  "panel": [],
  "created_at": "2026-06-10T..."
}
```

### `WebSocket /ws/debate/{debate_id}?token=<jwt>`

Streams the live debate. Key events:

| Event | Payload |
|-------|---------|
| `stage_change` | `{ stage }` |
| `message_start` | `{ messageId, agentId, agentName, stage }` |
| `token` | `{ messageId, content }` |
| `score_update` | `{ scores: AgentScore[] }` |
| `verdict_ready` | `{ verdict: Verdict }` |
| `debate_complete` | `{}` |

After `debate_complete`, send `{ "type": "inject", "question": "..." }` for Q&A.

---

## Debate Stages

| Stage | Description |
|-------|-------------|
| Opening | Each expert presents their position (60–80 words) |
| Cross-Examination | Experts challenge each other (2–4 sentences) |
| Closing | Final positions (2–4 sentences) |
| Verdict | Moderator synthesises the final recommendation |

---

## Deployment

### Backend → Railway

1. Push to GitLab
2. New service → connect repo → set root to `backend/`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `.env.example`

### Frontend → Vercel

1. New project → import from GitLab → set root to `frontend/`
2. Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

---

## Example Questions to Try

- "Should I quit my job and join an early-stage startup as CTO?"
- "Should India mandate Aadhaar for all financial transactions?"
- "Should we launch in international markets before fully saturating India?"
- "Is it worth taking on technical debt to ship faster for this hackathon?"

---

## Contributors

| Contributor | Tasks |
|------------|-------|
| @chaitanyachalith | Full-stack development — FastAPI backend, Next.js frontend, WebSocket streaming engine, multi-agent LLM orchestration, Zustand state management, CI/CD pipeline, pre-commit hooks, Supabase schema, Clerk auth integration, PDF export, compliance setup |

---

## License

MIT License — see [LICENSE](LICENSE) for details.