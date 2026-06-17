# DECISION ARENA — Complete Architecture Document

---

## 1. PRODUCT VISION

**Decision Arena** is an AI-powered decision simulation platform that convenes a panel of expert AI agents to debate, challenge, and scrutinize any decision a user brings — career choices, business strategy, policy proposals, technology selection, or personal dilemmas.

**Core Value Proposition:** Instead of one AI giving one answer, Decision Arena surfaces *conflicting perspectives*, *hidden risks*, *logical fallacies*, and *blind spots* through structured, multi-agent adversarial debate — producing decisions that are more robust, better-reasoned, and defensible.

**Target Users:**
- Founders evaluating strategy
- Students choosing career paths
- Policy researchers simulating outcomes
- Product teams making build/buy/partner decisions
- Anyone facing a high-stakes choice

**Tagline:** *"Don't just decide. Decide better."*

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                           │
│  Next.js 15 App Router · TypeScript · Tailwind · Framer Motion     │
│  Zustand · Clerk · Axios · WebSocket client                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS + WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                       API GATEWAY LAYER                             │
│          FastAPI (Render) · Uvicorn · CORS · Rate Limiting         │
│          REST endpoints + WebSocket streaming                       │
└──────┬──────────────────────────┬──────────────────────────────────-┘
       │                          │
┌──────▼──────────┐   ┌───────────▼──────────────────────────────────┐
│  Auth Service   │   │           DEBATE ENGINE (LangGraph)          │
│  Clerk.dev      │   │  ┌─────────────┐  ┌──────────────────────┐   │
│  JWT Validation │   │  │  Moderator  │  │   Expert Panel       │   │
└─────────────────┘   │  │    Agent    │  │  (2-6 agents dynamic)│   │
                      │  └──────┬──────┘  └──────────┬───────────┘   │
                      │         │                     │               │
                      │  ┌──────▼─────────────────────▼──────────┐   │
                      │  │         State Graph (LangGraph)        │   │
                      │  │  opening → cross_exam → challenge →   │   │
                      │  │  rebuttal → closing → verdict          │   │
                      │  └────────────────────────────────────────┘   │
                      │                                               │
                      │  ┌───────────────────────────────────────┐   │
                      │  │         Support Agents                │   │
                      │  │  Fallacy Detector · Fact Checker      │   │
                      │  │  Scorer · Heatmap Generator           │   │
                      │  └───────────────────────────────────────┘   │
                      └──────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
┌─────────────▼───────┐    ┌──────────────▼──────────┐  ┌────────────▼────────┐
│  Groq / Ollama /    │    │      Supabase            │  │    Redis Cache      │
│  Gemini / OpenAI    │    │  PostgreSQL + Realtime   │  │  (debate state)     │
│  (multi-provider)   │    │  + Storage + Auth        │  │                     │
└─────────────────────┘    └─────────────────────────┘  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              LOCAL DOCUMENT Q&A (no vectorDB, runs on the API host)  │
│  Upload → PyMuPDF4LLM (markdown) → heading split → sections/*.txt    │
│  Question → Llama.cpp (local GGUF) → find section → answer from it   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. USER FLOWS

### Flow A — Standard Debate
```
Landing Page
    → Enter decision question
    → (optional) Select mode: Standard / Boardroom / Shark Tank / Policy Arena
    → AI categorizes decision + selects expert panel (preview shown)
    → User confirms or customizes panel
    → Debate begins (WebSocket stream)
        Stage 1: Opening Statements (each expert)
        Stage 2: Cross-Examination (experts question each other)
        Stage 3: Challenges (fallacy/fact flags surface)
        Stage 4: Audience Intervention (user can inject a question)
        Stage 5: Rebuttals
        Stage 6: Closing Statements
        Stage 7: Final Verdict + Scoreboard
    → Export Report (PDF / Executive Brief)
    → Share link generated
```

### Flow B — Boardroom Mode
```
User enters idea as "CEO"
    → AI populates: CTO, CFO, COO, CMO, Lead Investor
    → Each exec challenges the idea from their lens
    → CEO (user) can respond at any stage
    → Board vote at end with confidence scores
```

### Flow C — Shark Tank Mode
```
User pitches startup idea
    → 4 AI investors evaluate
    → Market sizing, competitive moat, unit economics, risk challenges
    → "Deal / No Deal" verdict per investor
    → Aggregate funding likelihood score
```

### Flow D — Policy Arena
```
User proposes a policy
    → AI selects: Economist, Politician (pro), Politician (anti), Civil Society Rep, Citizen
    → Full policy debate with real-world impact analysis
    → Policy heatmap generated
```

---

## 4. DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- Users (handled by Clerk, mirrored here)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT DEFAULT 'free',           -- free | pro | enterprise
  debates_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debates
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL,             -- career | business | tech | policy | personal
  mode TEXT DEFAULT 'standard',       -- standard | boardroom | shark_tank | policy
  status TEXT DEFAULT 'pending',      -- pending | running | completed | error
  panel JSONB NOT NULL DEFAULT '[]',  -- [{id, name, role, avatar_seed, color}]
  current_stage TEXT DEFAULT 'opening',
  audience_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Debate Messages (the actual debate content)
CREATE TABLE debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,             -- agent slug or 'moderator' or 'system'
  agent_name TEXT NOT NULL,
  agent_role TEXT,
  stage TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'argument', -- argument | question | challenge | rebuttal | verdict
  fallacies JSONB DEFAULT '[]',       -- [{type, excerpt, explanation}]
  fact_tags JSONB DEFAULT '[]',       -- [{claim, status, confidence}]
  sequence_num INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scores
CREATE TABLE agent_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  logic_score FLOAT,
  evidence_score FLOAT,
  practicality_score FLOAT,
  risk_awareness_score FLOAT,
  longterm_thinking_score FLOAT,
  persuasiveness_score FLOAT,
  overall_score FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verdicts
CREATE TABLE verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  consensus_areas JSONB DEFAULT '[]',
  disagreements JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  confidence_score FLOAT,
  heatmap_data JSONB,
  executive_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (local document Q&A — no vectorDB)
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,            -- original uploaded file on disk
  sections_dir  TEXT NOT NULL,            -- directory of extracted .txt sections
  status        TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  num_sections  INT DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Document Questions (Q&A history per document)
CREATE TABLE document_questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  sections_checked  JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Reports
CREATE TABLE shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_debates_user_id ON debates(user_id);
CREATE INDEX idx_debate_messages_debate_id ON debate_messages(debate_id);
CREATE INDEX idx_debate_messages_sequence ON debate_messages(debate_id, sequence_num);
CREATE INDEX idx_agent_scores_debate_id ON agent_scores(debate_id);

-- Row Level Security
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own debates" ON debates
  FOR ALL USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users see own debate messages" ON debate_messages
  FOR ALL USING (
    debate_id IN (
      SELECT id FROM debates WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );
```

---

## 5. AGENT ARCHITECTURE

### Panel Generation
```
User question → CategoryClassifier → PanelBuilder
    CategoryClassifier: uses LLM to classify into [career, business, tech, policy, personal, other]
    PanelBuilder: maps category + question keywords to 3–5 expert personas
    Each persona has: {id, name, role, system_prompt, bias, communication_style, avatar_seed}
```

### Expert Agent Schema
```python
ExpertAgent:
  id: str                  # slug e.g. "startup_founder"
  name: str                # display name e.g. "Alex Chen"
  role: str                # role label e.g. "Serial Startup Founder"
  icon: str                # emoji
  color: str               # hex for UI theming
  system_prompt: str       # full persona instructions
  bias: str                # what they naturally advocate for
  communication_style: str # analytical | provocative | empathetic | pragmatic
  expertise_domains: list[str]
```

### Built-in Expert Library (expandable)
| Persona | Used For | Bias |
|---|---|---|
| Serial Startup Founder | Career, Business | Action, speed, market |
| Tenured Professor | Career, Policy | Academia, research, long-term |
| Venture Capitalist | Business, Startup | ROI, scale, exit |
| Senior Engineer | Tech | Technical correctness, maintainability |
| Product Manager | Tech, Business | User value, velocity |
| CFO | Business, Boardroom | Cash flow, risk, cost |
| CTO | Tech, Boardroom | Architecture, security, scale |
| CMO | Business, Boardroom | Brand, growth, customer |
| HR Executive | Career | People, culture, retention |
| Industry Recruiter | Career | Market demand, skills |
| Security Researcher | Tech | Vulnerabilities, compliance |
| Economist | Policy | GDP, incentives, externalities |
| Civil Society Rep | Policy | Equity, access, social impact |
| Devil's Advocate | Any | Opposing the consensus |

### Moderator Agent
```
Responsibilities:
  - Introduce each stage with a structured prompt
  - Detect when an expert is repeating themselves (similarity check)
  - Force experts to address audience injections
  - Generate transition summaries between stages
  - Ensure no more than 3 consecutive messages from same agent
  - Final verdict synthesis
```

### Support Agents (run async, post-process each message)
```
FallacyDetector:
  Input: message content
  Output: [{type, excerpt, explanation, severity}]
  Detects: strawman, false_dilemma, circular_reasoning, ad_hominem, appeal_to_authority,
           hasty_generalization, slippery_slope, false_equivalence

FactChecker:
  Input: message content
  Output: [{claim, status, confidence, note}]
  Status: supported | weak_evidence | needs_verification | contested

Scorer:
  Input: debate_id, all messages so far
  Output: scores per agent per metric
  Runs at end of each stage

HeatmapGenerator:
  Input: all messages + verdict
  Output: {risks[], opportunities[], costs[], benefits[]} with intensity scores
```

---

## 6. DEBATE ORCHESTRATION LOGIC (`DebateOrchestrator`, asyncio — not LangGraph in the current implementation)

```
STAGE_ORDER = [opening, cross_examination, closing, verdict]

State (DebateOrchestrator instance):
  debate_id, question, mode, panel: list[ExpertAgent]
  messages: list[dict]
  agent_contributions: dict[agent_id, str]
  current_stage: DebateStage
  audience_queue: asyncio.Queue[str]      # in-debate audience injections
  decision_parameters: list[str]          # extracted once per run(), see below
  sequence_counter: int

run() pipeline:
  1. extract_decision_parameters(question) via PanelBuilderAgent
     - Decomposes the question into 3-5 decision-relevant parameters
       (e.g. "Cost & affordability", "Effectiveness & expected outcomes",
       "Feasibility & practical execution", "Risks & downsides") so the
       panel debates the whole decision instead of converging on a single
       number/detail the question happens to mention.
     - Emits {"type": "decision_parameters", "parameters": [...]} to the client.
     - Falls back to a generic 5-parameter set on any LLM/parse failure.

  2. For each stage in STAGE_ORDER:
     - Emit stage_change
     - _run_stage(stage):
       - cross_examination: each expert asks one question to the panel
         member it most disagrees with (round-robin); also instructed to
         surface any decision parameter the debate hasn't addressed yet.
       - opening/closing: each expert is assigned a focus_parameter via
         round-robin over decision_parameters (idx % len(decision_parameters))
         and argues that dimension specifically, not just "their strongest
         point" — this round-robin assignment is what fixes single-aspect
         convergence.
     - Drain audience_queue: any question injected via inject_audience_question()
       during this stage is answered by every expert before moving to the
       next stage. (Previously this drain only ran at a "rebuttals" stage
       that no longer exists in STAGE_ORDER, so injected questions were
       silently dropped — fixed by draining after every stage instead.)

  3. _run_scoring() — ScorerAgent scores all agents on contributions so far
  4. _generate_verdict() — ModeratorAgent.synthesize_verdict(), given
     decision_parameters, is instructed to make consensus/disagreements/
     risks/opportunities collectively cover more than one parameter
  5. Emit debate_complete, persist completion to DB

Streaming:
  Frontend receives (WebSocket): {type: "decision_parameters"|"stage_change"|
  "message_start"|"token"|"message_complete"|"score_update"|"verdict_ready"|
  "debate_complete"|"audience_injected"|"error"}

Post-completion handoff (same WebSocket connection, no client reconnect):
  When run() finishes normally, the WS handler in app/api/ws.py cancels the
  live-debate client reader (_read_client, whose "inject" path fed
  audience_queue — dead once run() has returned) and hands the still-open
  socket directly to _qa_mode(), which streams a fresh round of expert
  responses for every subsequent follow-up question and persists each as a
  message. This fixes a prior bug where a follow-up sent right after
  completion, over the same connection, was silently swallowed by the dead
  in-debate injection path instead of reaching Q&A mode.
```

---

## 7. FOLDER STRUCTURE

```
decision-arena/
├── frontend/                          # Next.js 15 App Router
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (dark theme, fonts, Clerk)
│   │   ├── page.tsx                   # Landing page
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── arena/
│   │   │   ├── page.tsx               # New debate setup
│   │   │   └── [debateId]/
│   │   │       └── page.tsx           # Live debate view
│   │   ├── history/
│   │   │   └── page.tsx               # Past debates
│   │   ├── documents/
│   │   │   ├── page.tsx               # Document list + upload
│   │   │   └── [documentId]/
│   │   │       └── page.tsx           # Document Q&A view
│   │   ├── report/
│   │   │   └── [slug]/page.tsx        # Shareable public report
│   │   └── api/
│   │       └── webhooks/
│   │           └── clerk/route.ts     # Clerk webhook handler
│   ├── components/
│   │   ├── ui/                        # Shared UI primitives
│   │   ├── arena/
│   │   │   ├── ArenaSetup.tsx         # Question input + panel preview
│   │   │   ├── DebateStage.tsx        # Stage progress indicator
│   │   │   ├── ExpertCard.tsx         # Agent bubble/card
│   │   │   ├── MessageBubble.tsx      # Debate message with fallacy/fact tags
│   │   │   ├── ModeratorPanel.tsx     # Moderator UI element
│   │   │   ├── Scoreboard.tsx         # Live scores visualization
│   │   │   ├── AudienceInput.tsx      # Audience injection input
│   │   │   ├── FinalVerdict.tsx       # Verdict display
│   │   │   ├── DecisionHeatmap.tsx    # Visual heatmap
│   │   │   └── ExportReport.tsx       # Export controls
│   │   ├── documents/
│   │   │   ├── DocumentUpload.tsx     # Drag-and-drop upload
│   │   │   ├── DocumentList.tsx       # Status-polling document list
│   │   │   └── DocumentQA.tsx         # Ask-a-question UI + answer history
│   │   ├── landing/
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── ModeSelector.tsx
│   │   │   └── DemoPreview.tsx
│   │   └── shared/
│   │       ├── GlassCard.tsx
│   │       ├── AnimatedBackground.tsx
│   │       └── LoadingOrb.tsx
│   ├── lib/
│   │   ├── api.ts                     # API client functions
│   │   ├── websocket.ts               # WebSocket manager
│   │   ├── supabase.ts                # Supabase client
│   │   ├── i18n.tsx                   # I18nProvider / useI18n (en/hi/kn)
│   │   └── utils.ts
│   ├── store/
│   │   ├── debateStore.ts             # Zustand store
│   │   └── documentStore.ts           # Zustand store (document Q&A)
│   ├── types/
│   │   └── index.ts                   # All TypeScript types
│   ├── hooks/
│   │   ├── useDebate.ts
│   │   └── useWebSocket.ts
│   ├── public/
│   ├── .env.local.example
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # FastAPI + LangGraph
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Settings / env vars
│   │   ├── database.py                # Supabase client
│   │   ├── auth.py                    # Clerk JWT validation
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── debates.py             # Debate CRUD + classify endpoints
│   │   │   ├── reviews.py             # User review endpoints
│   │   │   ├── settings.py            # LLM provider settings endpoint
│   │   │   ├── reports.py             # Report generation + PDF download
│   │   │   ├── documents.py           # Document Q&A endpoints (upload/ask/list/delete)
│   │   │   └── ws.py                  # WebSocket debate stream
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # BaseAgent abstract class
│   │   │   ├── expert.py              # ExpertAgent implementation
│   │   │   ├── moderator.py           # ModeratorAgent (final verdict)
│   │   │   ├── fallacy_detector.py    # FallacyDetectorAgent
│   │   │   ├── fact_checker.py        # FactCheckerAgent
│   │   │   ├── scorer.py              # ScorerAgent
│   │   │   └── panel_builder.py       # PanelBuilder (dynamic persona generation)
│   │   │
│   │   ├── engine/
│   │   │   ├── __init__.py
│   │   │   ├── state.py               # DebateState dataclass
│   │   │   └── orchestrator.py        # DebateOrchestrator (asyncio queue + streaming)
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── debate.py              # Debate, CreateDebatePayload, LLMUserConfig
│   │   │   ├── message.py             # DebateMessage, MessageType
│   │   │   ├── verdict.py             # Verdict, AgentScore, HeatmapData
│   │   │   └── document.py            # DocumentResponse, AskDocumentRequest/Response
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── llm.py                 # LLMService (Groq/Ollama/Gemini/OpenAI + fallback chain)
│   │       ├── report_generator.py    # PDF generation via ReportLab
│   │       └── document_qa/           # Local document Q&A (no vectorDB)
│   │           ├── __init__.py
│   │           ├── config.py          # FIND_PROMPT / ANSWER_PROMPT
│   │           ├── preprocessing.py   # PyMuPDF4LLM extraction + heading-based section split
│   │           ├── model_loader.py    # Llama.cpp GGUF loading + process-wide cache
│   │           └── workflow.py        # find -> retrieve -> answer loop (rapidfuzz section match)
│   │
│   ├── tests/
│   │   ├── test_debate_engine.py
│   │   ├── test_agents.py
│   │   └── test_api.py
│   ├── .env.example
│   ├── requirements.txt
│   └── Procfile                       # Render deployment
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_reviews.sql
│   │   └── 003_documents.sql
│   └── seed.sql
│
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml
│       └── backend-ci.yml
│
└── README.md
```

---

## 8. API DESIGN

### REST Endpoints

```
POST   /api/v1/debates/classify         # Classify question, suggest panel
POST   /api/v1/debates/                 # Create new debate
GET    /api/v1/debates/                 # List user's debates
GET    /api/v1/debates/{id}             # Get debate with messages
DELETE /api/v1/debates/{id}             # Delete debate

POST   /api/v1/debates/{id}/start       # Start the debate engine
POST   /api/v1/debates/{id}/inject      # Audience injection
POST   /api/v1/debates/{id}/stop        # Stop debate early

GET    /api/v1/debates/{id}/scores      # Get live scores
GET    /api/v1/debates/{id}/verdict     # Get final verdict
GET    /api/v1/debates/{id}/heatmap     # Get heatmap data

POST   /api/v1/reports/{debate_id}      # Generate report
GET    /api/v1/reports/share/{slug}     # Get public shared report
POST   /api/v1/reports/{debate_id}/share # Create share link

POST   /api/v1/documents/upload         # Upload a document (multipart/form-data)
GET    /api/v1/documents/               # List user's documents
GET    /api/v1/documents/{id}           # Get one document's status
POST   /api/v1/documents/{id}/ask       # Ask a question (local find -> retrieve -> answer)
GET    /api/v1/documents/{id}/questions # Q&A history for a document
DELETE /api/v1/documents/{id}           # Delete document + sections + history

GET    /health                          # Health check
```

### WebSocket Protocol

```
Connect: ws://api/ws/debate/{debate_id}?token={jwt}

Client → Server:
  {"type": "inject", "question": "What about..."}
  {"type": "skip_stage"}
  {"type": "ping"}

Server → Client:
  {"type": "decision_parameters", "parameters": ["Cost & affordability", "Effectiveness & expected outcomes", ...]}
  {"type": "stage_change", "stage": "cross_examination", "title": "Cross-Examination"}
  {"type": "message_start", "agent_id": "...", "agent_name": "...", "stage": "..."}
  {"type": "token", "content": "..."}
  {"type": "message_complete", "message_id": "...", "fallacies": [...], "fact_tags": [...]}
  {"type": "score_update", "scores": {...}}
  {"type": "audience_injected", "question": "..."}
  {"type": "verdict_ready", "verdict": {...}}
  {"type": "debate_complete"}
  {"type": "error", "message": "..."}
```

---

## 9. UI WIREFRAMES (Conceptual)

### Landing Page
```
┌────────────────────────────────────────────────┐
│  ⬡ DECISION ARENA              Sign In   →     │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         [Animated particle field]        │  │
│  │                                          │  │
│  │   Don't just decide. Decide better.      │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  Enter your decision question...   │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │         [ Enter the Arena → ]            │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  MODES:  [Standard] [Boardroom] [Shark Tank]   │
│          [Policy Arena]                         │
│                                                 │
│  RECENT: Should I raise a Series A? ········   │
└────────────────────────────────────────────────┘
```

### Arena Setup
```
┌──────────────────────────────────────────────────────────────┐
│  "Should I build a SaaS startup?"              ✎ Edit        │
│  Category: BUSINESS                                          │
│                                                              │
│  YOUR PANEL                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🚀 Alex  │ │ 📊 Maria │ │ 🔐 Sam   │ │ 🎯 Raj   │       │
│  │ Founder  │ │ Investor │ │ Engineer │ │ PM       │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  [+ Add Expert]  [Customize]                                │
│                                                              │
│                    [ BEGIN DEBATE → ]                       │
└──────────────────────────────────────────────────────────────┘
```

### Live Debate View
```
┌────────────────────────────────────────────────────────────────┐
│  ⬡ DECISION ARENA   "Should I build a SaaS startup?"          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [OPENING] ● [CROSS-EXAM] ○ [CHALLENGES] ○ [REBUTTALS] ○      │
│                                                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────┐ │
│  │          DEBATE FEED            │  │     SCOREBOARD      │ │
│  │                                 │  │  Alex  ████ 82      │ │
│  │  ⚖️ MODERATOR                   │  │  Maria ███  74      │ │
│  │  "Welcome to Decision Arena..." │  │  Sam   █████ 91     │ │
│  │                                 │  │  Raj   ████ 79      │ │
│  │  🚀 Alex Chen — Founder         │  └─────────────────────┘ │
│  │  "The SaaS market presents..."  │                          │
│  │  ⚠ [Strawman detected]          │  ┌─────────────────────┐ │
│  │                                 │  │    INJECT QUESTION  │ │
│  │  📊 Maria Santos — Investor     │  │  "What about AI     │ │
│  │  "Capital efficiency matters..." │  │   competition?"    │ │
│  │  ✓ [Evidence supported]         │  │  [Inject →]         │ │
│  │                                 │  └─────────────────────┘ │
│  └─────────────────────────────────┘                          │
└────────────────────────────────────────────────────────────────┘
```

### Final Verdict
```
┌──────────────────────────────────────────────────────────┐
│  FINAL VERDICT           Confidence: 78%   ████████░░   │
│                                                          │
│  ✅ CONSENSUS            ⚡ RISKS           🎯 ACTIONS   │
│  All agree on market     Market saturation  Validate     │
│  timing being right      risk is real       niche first  │
│                                                          │
│  DECISION HEATMAP                                        │
│  ┌─────────────────────────────────────┐                │
│  │ Risk    ████████████ HIGH           │                │
│  │ Cost    ████████     MEDIUM         │                │
│  │ Benefit ████████████████ VERY HIGH  │                │
│  │ Speed   ██████       MEDIUM         │                │
│  └─────────────────────────────────────┘                │
│                                                          │
│  [📄 Export PDF]  [📊 Exec Brief]  [🔗 Share Link]      │
└──────────────────────────────────────────────────────────┘
```

---

## 10. DEPLOYMENT STRATEGY

### Frontend (Vercel)
```bash
# vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_WS_URL": "@ws_url",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "@clerk_pub_key",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Backend (Render)
```
Render Web Service:
  - Build: pip install -r requirements.txt
  - Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
  - Health check: GET /health
  - Environment variables injected via Render dashboard
```

### Database (Supabase)
```
1. Create project at supabase.com
2. Run migrations/001_initial_schema.sql
3. Enable Realtime on debate_messages table
4. Configure RLS policies
5. Copy connection strings to Render env
```

### CI/CD
```
GitHub Actions:
  On PR → frontend-ci.yml: lint + type-check + build
  On PR → backend-ci.yml: pytest + flake8
  On merge to main → auto-deploy to Vercel + Render
```

---

## 11. SCALING STRATEGY

### Phase 1 (Hackathon / MVP)
- Single Render instance (2 vCPU, 512MB RAM)
- Supabase free tier
- Vercel hobby
- No Redis (in-memory state)
- Groq llama-3.1-8b-instant (primary LLM) with rate limiting

### Phase 2 (Launch / Beta)
- Render Pro (autoscale, multiple workers)
- Redis for debate state (Render Redis addon)
- Supabase Pro (connection pooling via pgBouncer)
- CDN for report PDFs (Supabase Storage)
- Vercel Pro

### Phase 3 (Scale)
- Kubernetes (GKE or EKS)
- Horizontal scaling of debate workers
- Message queue (Redis Streams) for async debate execution
- Read replicas for history/report queries
- Edge caching for public shared reports
- Rate limiting per user tier (free: 3 debates/day, pro: unlimited)

### Cost Optimization
- Cache common panel configurations
- Reuse LLM context when possible
- Batch support agent calls (fallacy + fact checker in parallel)
- Truncate old debate messages to stay within context limits

---

## 12. HACKATHON DEMO SCRIPT

### Opening (30 seconds)
> "Everyone faces big decisions. And everyone's been burned by getting advice from just one perspective. What if you could convene an AI board of experts — who actually disagree with each other — and watch them debate your decision in real time?"

### Demo Flow (4 minutes)
1. **Enter the question**: "Should I drop out of college and start a startup?"
2. **Show panel generation**: "The AI just picked — a Startup Founder, a VC, a Professor, and a Recruiter. Watch."
3. **Let opening statements stream**: point out different tones, different priorities
4. **Trigger audience injection**: type "What about the 2025 funding winter?" — show all experts forced to respond
5. **Point at fallacy badge**: "Alex just used a hasty generalization — our fallacy detector caught it"
6. **Show scoreboard updating live**
7. **Reveal final verdict heatmap**: "78% confidence. High risk, very high potential. Here's the recommended path."
8. **One-click export**: generate executive brief

### Judge Hook (30 seconds)
> "This isn't a chatbot. This is a decision infrastructure. Every board meeting, every policy decision, every major career choice — they all deserve adversarial thinking. Decision Arena makes that accessible to everyone. The same quality of deliberation that Fortune 500 boards pay consultants millions for — available to any founder, student, or policymaker in under 5 minutes."

### Technical Differentiators to Mention
- LangGraph state machine (not just chained prompts)
- Real-time WebSocket streaming
- Fallacy detection as a first-class feature
- Multi-modal output: scoreboard + heatmap + exportable report
- 4 distinct modes (Standard, Boardroom, Shark Tank, Policy)
- Built in under 48 hours using Groq (llama-3.1-8b-instant) as the primary LLM

---

## 13. LOCAL DOCUMENT Q&A (NO-VECTORDB RAG)

Modeled directly on the Mozilla.ai ["structured-qa" Blueprint](https://blueprints.mozilla.ai/all-blueprints/query-structured-documents-using-a-lightweight-llm-workflow).
Integrated as a feature inside the existing FastAPI backend (not a standalone tool)
and exposed through the existing Render/Vercel deployment — no separate service.

### Why no vectorDB

Traditional RAG embeds chunks and does similarity search. This pipeline skips
embeddings entirely: documents are split into named sections by heading, and
the LLM itself picks which section is relevant, then answers strictly from
that section's text. Simpler infra, no embedding model, no vector store — at
the cost of being best suited to documents with clear heading structure
(specs, manuals, policies, FAQs) rather than dense unstructured prose.

### Pipeline

```
Upload                         Ask
──────                         ───
file (.pdf/.docx/.txt/.md/      question
.pptx/.xlsx, ≤25MB)                │
   │                               ▼
   ▼                         get_or_load_model()
PyMuPDF4LLM.to_markdown()    (Llama.cpp GGUF, cached
   │                          in-process after first load)
   ▼                               │
split_markdown_by_headings()       ▼
   │                         find_retrieve_answer():
   ▼                           1. ask model: which section_name
sections/<name>.txt × N             best matches the question?
(+ _full_text.md for debug)       2. rapidfuzz-match model's reply
   │                                 to the real section names
   ▼                              3. read that section's .txt,
status: ready (or error)             ask model to answer from it
                                   4. if model replies "need more
                                      info", drop that section and
                                      retry (up to max_sections)
                                   5. otherwise return the answer
                                      + list of sections_checked
```

### Components (`backend/app/services/document_qa/`)

| File | Responsibility |
|------|-----------------|
| `preprocessing.py` | `document_to_sections_dir()` — PyMuPDF4LLM extraction + `split_markdown_by_headings()` (regex on `#`/`##`/`###`/`####` and bold-numbered headings) |
| `model_loader.py` | `get_or_load_model()` — loads a GGUF model via `llama_cpp.Llama.from_pretrained`, process-wide cache keyed by `model_id`, auto-detects GPU via `nvidia-smi` |
| `workflow.py` | `find_retrieve_answer()` — the find→retrieve→answer loop; `get_matching_section()` does the rapidfuzz fuzzy match |
| `config.py` | `FIND_PROMPT` / `ANSWER_PROMPT` templates, validated to contain their required placeholders |

### Default model

`bartowski/Qwen2.5-7B-Instruct-GGUF/Qwen2.5-7B-Instruct-Q8_0.gguf` (the
Blueprint's default 7B model) — downloaded once to `~/.cache/huggingface` on
first request, then served from the in-memory cache. Configurable via
`DOCUMENT_QA_MODEL`. CPU inference works but is slow; a GPU is used
automatically when `nvidia-smi` succeeds.

### Data model

`documents` (status: processing/ready/error, storage_path, sections_dir,
num_sections) and `document_questions` (per-document Q&A history with
`sections_checked`) — see migration `003_documents.sql` and the schema in
section 4 above. Authorization follows the same per-user ownership check
pattern as debates (`_get_and_authorize_document` in `api/documents.py`).

### Frontend

`/documents` (upload + status-polling list) and `/documents/{id}` (ask
questions, see answer history with which sections were checked) — both
behind the existing Clerk auth, reachable from the navbar (`nav.documents`,
localized EN/HI/KN).

---

## ENVIRONMENT VARIABLES

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
```

### Backend (.env)
```
GEMINI_API_KEY=AI...
OPENAI_API_KEY=sk-...             # fallback
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...       # service role key (NOT anon)
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://...             # optional Phase 2
ALLOWED_ORIGINS=https://your-frontend.vercel.app
DEBUG=false
MAX_DEBATE_AGENTS=6
FREE_TIER_DAILY_LIMIT=3

# Local document Q&A (no API key — runs on this host via llama-cpp-python)
DOCUMENT_QA_MODEL=bartowski/Qwen2.5-7B-Instruct-GGUF/Qwen2.5-7B-Instruct-Q8_0.gguf
DOCUMENT_QA_MAX_SECTIONS=20
DOCUMENT_QA_STORAGE_DIR=./document_qa_storage
```
