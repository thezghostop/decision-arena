# Decision Arena

🏆 Built for the 1st Hackathon of the Swecha Internship Programme — a national-level AI challenge focused on intelligent decision-making tools.

An AI-powered decision simulation platform where multiple expert agents debate, challenge, and stress-test your most important decisions — exposing blind spots through structured adversarial deliberation.

---

## About Project

**Focus Area:** National level — India

### Problem Statement

Making good decisions is hard. Whether it's a business pivot, a career move, a policy call, or a personal dilemma — most people consult one or two opinions and move on. They miss critical risks, overlook opposing perspectives, and fail to stress-test their assumptions. There's no easy way to simulate adversarial expert thinking before committing to a decision.

### Proposed Solution

Decision Arena puts a panel of AI expert agents in the room with you. You describe your decision, the AI suggests an expert panel, and you can review and edit that panel — swap any member for another curated persona or a fully custom one you define yourself, add up to 6, remove down to 2 — before the debate begins. Then a structured debate unfolds: opening arguments, cross-examination, closing statements, and a final synthesised verdict with risk analysis, top recommendations, and per-expert scores. You can also inject your own questions mid-debate and ask follow-ups after it ends.

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
| AI / LLM | Groq (llama-3.1-8b-instant), Ollama (local), Gemini 2.5 Flash, OpenAI |
| Agent Framework | Google ADK (Agent Development Kit) — tool-calling agent for Document Q&A |
| Document Q&A | PyMuPDF4LLM (extraction) + Google ADK/Gemini agent, with local Llama.cpp GGUF fallback — no vectorDB |
| Database | Supabase (PostgreSQL) |
| Auth | Clerk |
| Streaming | WebSocket (real-time token streaming) |
| PDF Export | ReportLab |
| Deployment | Vercel (frontend), Render (backend) |
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
- **Editable panel** — the AI suggests a panel, but you can swap, add, or remove experts (curated or fully custom) before the debate starts
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
| Multi-Expert Panel | 2–6 AI experts with distinct roles, biases, and analytical styles |
| Manual Panel Editing | Review the AI-suggested panel and swap, add, or remove experts before the debate starts |
| Custom Personas | Define your own expert — name, role, bias, communication style, expertise — typed in at debate setup, no code changes needed |
| Structured Stages | Opening → Cross-Examination → Closing → Verdict |
| Multi-Aspect Decision Breakdown | Before the debate starts, the question is decomposed into 3–5 decision-relevant parameters (cost, effectiveness, feasibility, risk, alternatives, etc.) so the panel argues the whole decision instead of fixating on one detail the question mentions |
| Expert Scoring | Six-criteria scoring: logic, evidence, practicality, risk awareness, long-term thinking, persuasiveness |
| Final Verdict | AI-synthesised recommendation with confidence score, risks, and opportunities |
| Verdict Loading Animation | Pulsing skeleton animation while the panel deliberates |
| Post-Debate Q&A | Ask the panel follow-up questions after the debate ends (10-min window) |
| Audience Injection | Inject your own question mid-debate to steer the conversation |
| Debate History | Full transcript and verdict for every past debate |
| PDF Export | Download the full debate report as a formatted PDF |
| Smart Scroll | Auto-scrolls only when you're near the bottom — read earlier messages freely |
| Responsive UI | Works on desktop and mobile |
| Multi-Provider LLM | Choose your AI provider per debate: Groq, Ollama (local/offline), Gemini, or OpenAI |
| Offline / Local AI | Full Ollama support — run debates with no internet and no API key |
| User Reviews | Rate and review debates (1–5 stars + written feedback) |
| Review Export | `export_reviews.py` — export all user reviews to a formatted PDF |
| Multilingual | Debate in English, Hindi (हिंदी), or Kannada (ಕನ್ನಡ) — all experts respond in the selected language |
| Document Q&A | Upload a PDF/DOCX/TXT/MD/PPTX/XLSX and ask questions about it — answered by a Google ADK agent (Gemini), no vectorDB |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+ (LTS)
- Git
- A [Supabase](https://supabase.com) project
- A [Clerk](https://clerk.com) application
- At least one LLM provider API key:
  - [Groq](https://console.groq.com) — free tier, 131k TPM (recommended)
  - [Google Gemini](https://aistudio.google.com) — free tier available
  - [Ollama](https://ollama.com) — fully local, no API key needed

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
# Edit .env — fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, CLERK_SECRET_KEY
# Add at least one of: GROQ_API_KEY, GEMINI_API_KEY, or point OLLAMA_BASE_URL at a local Ollama instance
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
4. Run `supabase/migrations/002_reviews.sql`
5. Run `supabase/migrations/003_documents.sql`
6. Copy your project URL and service role key into `backend/.env`

### 5. Document Q&A (Google ADK agent, with offline fallback)

The document Q&A feature answers questions with a [Google ADK](https://google.github.io/adk-docs/)
`Agent`: Gemini reasons over the document and calls a `read_section` tool to
pull in exactly the section(s) it needs before answering — no vectorDB, no
embeddings. This is the primary engine whenever `GEMINI_API_KEY` is set
(same key used for debates).

If `GEMINI_API_KEY` is **not** set, the feature falls back to the original
fully-offline path — no API key, no network calls at inference time — via
`llama-cpp-python`. The first request on that path downloads the default
model (`bartowski/Qwen2.5-7B-Instruct-GGUF`, ~8GB) to `~/.cache/huggingface`
and caches it for all later requests. CPU inference is slow; a GPU
(auto-detected via `nvidia-smi`) is used when available. See `DOCUMENT_QA_*`
vars in `backend/.env.example` to change the fallback model or storage
location.

---

## Project Structure

```
decision-arena/
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   │   └── documents/          # Document Q&A list + detail pages
│   ├── components/
│   │   ├── arena/              # DebateArena, MessageBubble, Scoreboard, FinalVerdict
│   │   ├── documents/          # DocumentUpload, DocumentList, DocumentQA
│   │   └── landing/            # Hero, Features, HowItWorks
│   ├── store/                  # Zustand stores (debate, settings, documents)
│   ├── hooks/                  # useWebSocket, useDebateSetup
│   ├── lib/                    # API client, WebSocket manager, utils
│   └── types/                  # TypeScript types
├── backend/
│   ├── app/
│   │   ├── agents/             # ExpertAgent, ModeratorAgent, ScorerAgent, PanelBuilder
│   │   ├── engine/             # DebateOrchestrator
│   │   ├── api/                # debates, reviews, settings, reports, ws, documents
│   │   ├── models/             # Pydantic models (Debate, Message, Score, Verdict, Review, Document)
│   │   └── services/
│   │       ├── llm.py          # LLMService (multi-provider)
│   │       ├── report_generator.py
│   │       └── document_qa/    # PyMuPDF4LLM preprocessing, ADK/Gemini agent (primary), Llama.cpp loader + workflow (fallback)
│   └── tests/                  # pytest test suite
├── supabase/
│   └── migrations/             # 001_initial_schema.sql, 002_reviews.sql, 003_documents.sql
├── export_reviews.py           # Standalone script — export all reviews to PDF
├── specs/                      # Spec-Driven Development feature specs
├── .specify/                   # Project constitution and templates
├── .pre-commit-config.yaml     # Pre-commit hooks (ruff, mypy, bandit, gitleaks)
├── .gitlab-ci.yml              # CI/CD pipeline
└── README.md
```

---

## API Reference

### `POST /api/v1/debates/classify`

Step 1 of debate creation. Classifies the question and returns a suggested
expert panel — does **not** create a debate yet. The frontend shows this
panel in a `PanelEditor` so the user can swap, add, or remove members before
confirming.

**Body:** `{ "question": "...", "mode": "standard" }`

**Response:** `{ "category": "business", "mode": "standard", "suggested_panel": [...], "confidence": 0.9 }`

### `GET /api/v1/debates/experts`

Returns the full curated expert library (no auth required) — every persona
available for the `PanelEditor`'s "swap from library" picker, so the
frontend doesn't duplicate persona data.

### `POST /api/v1/debates`

Step 2 of debate creation. Creates the debate with the user's final panel
(AI-suggested as-is, edited, or fully custom — any mix). `panel` must contain
2–6 members with no duplicate `id`s. `llm_config` is optional — omit to use
the server default (Groq).

**Body:**
```json
{
  "question": "Should I co-found this startup?",
  "category": "business",
  "mode": "standard",
  "panel": [
    {
      "id": "startup_founder",
      "name": "Alex Chen",
      "role": "Serial Startup Founder",
      "icon": "🚀",
      "color": "#7C3AED",
      "bias": "Action, speed, market validation over planning",
      "communication_style": "direct",
      "expertise_domains": ["fundraising", "product-market fit"],
      "is_custom": false
    }
  ],
  "llm_config": {
    "provider": "groq",
    "api_key": "gsk_...",
    "groq_model": "llama-3.1-8b-instant"
  }
}
```

A panel member can also be `is_custom: true` — a persona the user typed in
themselves (any name/role/bias/style/domains, within the field length
limits enforced by `AgentConfig`), not drawn from the curated library.

**Response:**
```json
{
  "id": "uuid",
  "question": "Should I co-found this startup?",
  "status": "pending",
  "panel": [...],
  "created_at": "2026-06-10T..."
}
```

### `GET /api/v1/reviews?debate_id=<uuid>`

Returns all reviews for a debate (or all debates if `debate_id` omitted).

### `POST /api/v1/reviews`

Submit a review for a completed debate.

**Body:** `{ "debate_id": "uuid", "rating": 5, "review_text": "..." }`

### `GET /api/v1/settings/llm`

Returns the current server-side LLM provider configuration.

### `POST /api/v1/documents/upload`

Uploads a document (`multipart/form-data`, field `file`) for Q&A. Accepts
`.pdf`, `.docx`, `.txt`, `.md`, `.pptx`, `.xlsx` up to 25 MB. Returns
immediately with status `processing`; a background task extracts the
document into sections and flips status to `ready` (or `error`).

**Response:** `{ "document_id": "uuid", "document": { ...status: "processing" } }`

### `GET /api/v1/documents`

Lists all documents uploaded by the current user.

### `GET /api/v1/documents/{document_id}`

Returns one document's status, including `num_sections` once ready.

### `POST /api/v1/documents/{document_id}/ask`

Asks a question about a `ready` document. Runs the local find→retrieve→answer
loop (no embeddings, no vectorDB) against the extracted sections.

**Body:** `{ "question": "What is the refund window?" }`

**Response:** `{ "answer": "...", "sections_checked": ["Refunds", "Support"] }`

### `GET /api/v1/documents/{document_id}/questions`

Returns the Q&A history for a document.

### `DELETE /api/v1/documents/{document_id}`

Deletes a document, its extracted sections, and its Q&A history.

### `WebSocket /ws/debate/{debate_id}?token=<jwt>`

Streams the live debate. Events:

| Event | Payload |
|-------|---------|
| `decision_parameters` | `{ parameters: string[] }` — the 3–5 decision dimensions the panel will debate, emitted once before `opening` |
| `stage_change` | `{ stage }` |
| `message_start` | `{ messageId, agentId, agentName, agentRole, stage }` |
| `token` | `{ messageId, content }` |
| `message_complete` | `{ messageId }` |
| `score_update` | `{ scores: AgentScore[] }` |
| `verdict_ready` | `{ verdict: Verdict }` |
| `debate_complete` | `{}` |

After `debate_complete`, send `{ "type": "inject", "question": "..." }` on the same connection to trigger Q&A responses — the server hands the existing socket off to Q&A mode, no reconnect required.

---

## Debate Stages

| Stage | Description |
|-------|-------------|
| Opening | Each expert presents their position (60–80 words) |
| Cross-Examination | Experts challenge each other (2–4 sentences each) |
| Closing | Final positions (2–4 sentences each) |
| Verdict | Moderator synthesises the final recommendation |

---

## Deployment

### Backend → Render

1. Push to GitLab
2. New Web Service → connect repo → set root directory to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example` in the Render dashboard

### Frontend → Vercel

1. New project → import from GitLab → set root to `frontend/`
2. Add `NEXT_PUBLIC_API_URL` (your Render service URL) and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

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
| @chaitanyachalith | Full-stack development — FastAPI backend, Next.js frontend, WebSocket streaming engine, multi-agent LLM orchestration, Zustand state management, multi-provider LLM (Groq/Ollama/Gemini/OpenAI), user reviews system, review PDF export, multilingual support (EN/HI/KN), CI/CD pipeline, pre-commit hooks, Supabase schema & RLS, Clerk auth integration, PDF export, compliance setup |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
