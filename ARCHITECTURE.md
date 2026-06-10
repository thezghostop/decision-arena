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
│  Next.js 14 App Router · TypeScript · Tailwind · Framer Motion     │
│  shadcn/ui · Zustand · WebSocket client                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS + WSS
┌────────────────────────────▼────────────────────────────────────────┐
│                       API GATEWAY LAYER                             │
│          FastAPI (Railway) · Uvicorn · CORS · Rate Limiting         │
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
│   Gemini 2.5 Pro    │    │      Supabase            │  │    Redis Cache      │
│   (primary LLM)     │    │  PostgreSQL + Realtime   │  │  (debate state)     │
│   OpenAI fallback   │    │  + Storage + Auth        │  │                     │
└─────────────────────┘    └─────────────────────────┘  └─────────────────────┘
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
    CategoryClassifier: uses Gemini to classify into [career, business, tech, policy, personal, other]
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

## 6. DEBATE ORCHESTRATION LOGIC (LangGraph)

```
State:
  debate_id: str
  question: str
  mode: str
  panel: list[ExpertAgent]
  messages: list[Message]
  current_stage: Stage
  stage_message_count: dict
  audience_queue: list[str]
  scores: dict
  completed_stages: list[Stage]

Graph Nodes:
  1. initialize_debate
     - Set up panel, system prompts, stage counter

  2. run_opening_statements
     - Each expert gives opening (parallel generation, sequential display)
     - Moderator introduces the question

  3. run_cross_examination
     - Expert A questions Expert B (round-robin, 2 rounds)
     - Moderator selects the most contentious disagreement to escalate

  4. run_challenges
     - FallacyDetector runs on all prior messages
     - Experts challenge each other's weakest claims
     - FactChecker tags claims in real time

  5. check_audience_intervention
     - If audience_queue not empty → inject question
     - Moderator reformulates for panel
     - All experts must respond

  6. run_rebuttals
     - Each expert defends against the strongest challenge to their position

  7. run_closing_statements
     - Each expert gives a final 2-3 sentence position
     - No new arguments allowed

  8. generate_verdict
     - Moderator synthesizes consensus + disagreements
     - Scorer runs final scoring
     - HeatmapGenerator produces heatmap_data
     - Confidence score calculated
     - Recommended actions generated

  9. finalize
     - Persist verdict to DB
     - Generate shareable slug
     - Trigger report generation

Edges:
  initialize → opening → cross_examination → challenges
  challenges → audience_check (conditional) → rebuttals
  rebuttals → closing → verdict → finalize → END

  audience_check: if queue empty → rebuttals, else → inject → rebuttals

Streaming:
  Each node streams token-by-token via WebSocket
  Frontend receives: {type: "token"|"message_complete"|"stage_change"|"score_update"|"fallacy"|"fact_tag"}
```

---

## 7. FOLDER STRUCTURE

```
decision-arena/
├── frontend/                          # Next.js 14 App Router
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
│   │   ├── report/
│   │   │   └── [slug]/page.tsx        # Shareable public report
│   │   └── api/
│   │       └── webhooks/
│   │           └── clerk/route.ts     # Clerk webhook handler
│   ├── components/
│   │   ├── ui/                        # shadcn/ui base components
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
│   │   └── utils.ts
│   ├── store/
│   │   └── debateStore.ts             # Zustand store
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
│   │   │   ├── debates.py             # Debate CRUD endpoints
│   │   │   ├── panel.py               # Panel generation endpoint
│   │   │   ├── reports.py             # Report generation + share
│   │   │   └── ws.py                  # WebSocket debate stream
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # BaseAgent class
│   │   │   ├── expert.py              # ExpertAgent implementation
│   │   │   ├── moderator.py           # ModeratorAgent
│   │   │   ├── fallacy_detector.py    # FallacyDetectorAgent
│   │   │   ├── fact_checker.py        # FactCheckerAgent
│   │   │   ├── scorer.py              # ScorerAgent
│   │   │   ├── heatmap.py             # HeatmapGeneratorAgent
│   │   │   └── panel_builder.py       # PanelBuilder (dynamic persona generation)
│   │   │
│   │   ├── engine/
│   │   │   ├── __init__.py
│   │   │   ├── debate_graph.py        # LangGraph state machine
│   │   │   ├── state.py               # DebateState TypedDict
│   │   │   ├── stages.py              # Stage node functions
│   │   │   └── orchestrator.py        # Debate orchestrator (runs graph + streams)
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── debate.py              # Pydantic models
│   │   │   ├── message.py
│   │   │   ├── agent.py
│   │   │   └── verdict.py
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── llm.py                 # LLM abstraction (Gemini/OpenAI)
│   │       ├── report_generator.py    # PDF/exec summary generation
│   │       └── cache.py               # Redis cache service
│   │
│   ├── tests/
│   │   ├── test_debate_engine.py
│   │   ├── test_agents.py
│   │   └── test_api.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── Procfile                       # Railway deployment
│   └── railway.json
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
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

### Backend (Railway)
```
railway.json specifies:
  - Build: pip install -r requirements.txt
  - Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
  - Health check: GET /health
  - Environment variables injected via Railway dashboard
```

### Database (Supabase)
```
1. Create project at supabase.com
2. Run migrations/001_initial_schema.sql
3. Enable Realtime on debate_messages table
4. Configure RLS policies
5. Copy connection strings to Railway env
```

### CI/CD
```
GitHub Actions:
  On PR → frontend-ci.yml: lint + type-check + build
  On PR → backend-ci.yml: pytest + flake8
  On merge to main → auto-deploy to Vercel + Railway
```

---

## 11. SCALING STRATEGY

### Phase 1 (Hackathon / MVP)
- Single Railway instance (2 vCPU, 512MB RAM)
- Supabase free tier
- Vercel hobby
- No Redis (in-memory state)
- Gemini 2.5 Pro with rate limiting

### Phase 2 (Launch / Beta)
- Railway Pro (autoscale, multiple workers)
- Redis for debate state (Railway Redis addon)
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
- Built in under 48 hours on Gemini 2.5 Pro

---

## ENVIRONMENT VARIABLES

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
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
```
