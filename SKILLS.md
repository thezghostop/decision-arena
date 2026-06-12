# Skills & Technologies — Decision Arena

A quick reference for every technology, concept, and skill demonstrated in this project. Useful for hackathon judges, recruiters, and new contributors.

---

## Frontend

| Skill | Usage |
|-------|-------|
| **Next.js 15 (App Router)** | File-based routing, server components, middleware for auth |
| **React 19** | Component architecture, hooks, state management |
| **TypeScript** | End-to-end type safety across all components and API calls |
| **Tailwind CSS** | Utility-first responsive styling, dark theme, glass morphism |
| **Framer Motion** | Animated message bubbles, stage transitions, AnimatePresence |
| **Zustand** | Global debate state — messages, scores, verdict, streaming |
| **WebSocket (native)** | Real-time token-by-token streaming from backend |
| **Clerk** | Authentication, JWT tokens, user management |
| **Axios** | HTTP client with auth interceptors |
| **Responsive Design** | Mobile-first layout, adaptive navbar, stacked/side-by-side panels |

---

## Backend

| Skill | Usage |
|-------|-------|
| **FastAPI** | REST API + WebSocket server, dependency injection, async handlers |
| **Python (async/await)** | Fully async LLM calls, WebSocket streaming, database operations |
| **Pydantic v2** | Request/response validation, settings management |
| **WebSocket streaming** | Token-by-token LLM output streamed to connected clients |
| **Multi-agent orchestration** | Custom debate engine with ExpertAgent, ModeratorAgent, ScorerAgent, PanelBuilder |
| **LLM abstraction layer** | Supports Groq, Ollama, Gemini, OpenAI — switchable per request |
| **ReportLab** | Programmatic PDF generation for debate reports and review exports |
| **Supabase (PostgreSQL)** | Debates, messages, scores, verdicts, users, reviews, shared reports |
| **Row-level security** | Supabase RLS policies for user data isolation |
| **Clerk JWT verification** | Backend token verification for protected routes |
| **slowapi** | Rate limiting on debate creation endpoints |
| **httpx** | Async HTTP client for Ollama integration with custom headers |

---

## AI / LLM

| Skill | Usage |
|-------|-------|
| **Prompt engineering** | System prompts for distinct expert personas with biases and roles |
| **Multi-agent debate design** | Structured adversarial deliberation across 4 stages |
| **LLM streaming** | AsyncIterator token streaming from Groq/Ollama/Gemini |
| **Structured JSON output** | Scoring and verdict generation with JSON mode |
| **Local inference (Ollama)** | Self-hosted LLM support for offline/private use |
| **Groq API** | Ultra-fast inference via llama-3.1-8b-instant |
| **Fallback chain** | Auto-fallback across providers if primary fails |
| **Per-request LLM config** | Users can override the AI provider per debate from the UI |

---

## DevOps & Infrastructure

| Skill | Usage |
|-------|-------|
| **Vercel** | Frontend deployment with auto-deploy on GitHub push |
| **Render** | Backend deployment with auto-deploy on GitLab push |
| **GitLab CI/CD** | Pipeline with lint, type-check, test, security scan stages |
| **GitHub Actions** | Parallel CI for frontend (ESLint, TypeScript, Prettier) and backend (ruff, mypy, bandit) |
| **Pre-commit hooks** | ruff, mypy, bandit, vulture, gitleaks, Prettier, ESLint — enforced before every commit |
| **Docker** | Dockerfile for containerised backend deployment |
| **WSL2** | Local development on Windows via Ubuntu |

---

## Security & Compliance

| Skill | Usage |
|-------|-------|
| **gitleaks / detect-secrets** | Prevents hardcoded secrets from being committed |
| **bandit** | Python static analysis for security vulnerabilities |
| **semgrep** | Custom security rules for the codebase |
| **CORS** | Strict origin allowlist on backend |
| **JWT authentication** | Clerk-issued JWTs verified on every protected endpoint and WebSocket |
| **Rate limiting** | Per-IP limits on debate creation to prevent abuse |
| **Security headers** | X-Frame-Options, X-Content-Type-Options, Referrer-Policy on all routes |

---

## Software Engineering

| Skill | Usage |
|-------|-------|
| **Spec-Driven Development** | Feature specs written before implementation (`specs/`) |
| **Monorepo structure** | Frontend and backend in one repo with separate CI pipelines |
| **RESTful API design** | Versioned endpoints (`/api/v1/`), proper HTTP methods and status codes |
| **WebSocket protocol** | Custom event-driven message protocol for live debate streaming |
| **Database migrations** | SQL migration files for schema versioning |
| **Error handling** | Graceful fallbacks, stale closure fixes, token refresh on expiry |
| **PDF generation** | Formatted multi-page PDF with tables, styles, and dynamic data |
| **Git workflow** | Multi-remote push (GitLab + GitHub), conventional commits |
