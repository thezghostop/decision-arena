# AGENTS.md — AI Agent Architecture

This document describes the AI agents that power Decision Arena.

## Overview

Decision Arena uses a multi-agent orchestration system built on FastAPI + LangGraph. Each debate spawns a panel of `ExpertAgent` instances managed by a `DebateOrchestrator`, with a `ModeratorAgent` synthesising the final verdict and a `ScorerAgent` evaluating each expert.

Separately, the Document Q&A feature is powered by a `DocumentQAAgent` built on the [Google Agent Development Kit (ADK)](https://google.github.io/adk-docs/) — a different framework from the debate engine above, used because Document Q&A's "read sections, decide if you have enough, ask for more if not" task is exactly the tool-calling reasoning loop ADK's `Agent` + `Runner` already implement, so it replaces a hand-rolled while-loop instead of duplicating one.

---

## Agent Types

### ExpertAgent (`backend/app/agents/expert.py`)

Each expert represents a distinct analytical perspective on the debate question.

**Configuration (`AgentConfig`)**
| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g. `risk-analyst`) |
| `name` | Display name |
| `role` | Short role label (e.g. "Risk Analyst") |
| `bias` | Analytical stance: `optimist`, `pessimist`, `neutral`, `contrarian` |
| `icon` | Emoji avatar |
| `color` | Hex colour for UI |

**Stages an expert participates in**
- `opening` — punchy opening statement (60–80 words)
- `cross_examination` — 2–4 sentences challenging other experts
- `closing` — 2–4 sentence closing argument
- `audience_intervention` — brief answer to audience-injected questions (post-debate Q&A)

**LLM**: Configurable per request via `llm_config` (defaults to Groq `llama-3.1-8b-instant`). Supported providers: Groq, Ollama, Gemini, OpenAI. Temperature 0.85, max_tokens 350.

---

### PanelBuilderAgent (`backend/app/agents/panel_builder.py`)

Selects the expert panel for a question and decomposes the question into the dimensions the debate must cover.

**`build_panel(question, category, mode)`** — picks 4 expert IDs from the curated `EXPERT_LIBRARY` (LLM-selected for `standard` mode, fixed overrides for `boardroom`/`shark_tank`/`policy` modes, category-based defaults on failure).

**`extract_decision_parameters(question)`** — returns 3–5 short decision-relevant parameter labels (e.g. `"Cost & affordability"`, `"Effectiveness & expected outcomes"`, `"Feasibility & practical execution"`). Run once per debate, before the opening stage. This exists so the panel debates the whole decision rather than fixating on the single number or detail the user happened to mention in the question (e.g. a price) — a real issue reported by a user whose question was about a per-subject course fee, where the entire debate ended up only discussing the fee and never the plan's actual effectiveness. Falls back to a generic 5-parameter set (`Cost & affordability`, `Effectiveness & expected outcomes`, `Feasibility & practical execution`, `Risks & downsides`, `Alternatives & opportunity cost`) on any LLM/parse failure, so the multi-aspect behavior still holds even if extraction fails.

**LLM**: Same configurable provider as ExpertAgent.

---

### ModeratorAgent (`backend/app/agents/moderator.py`)

Synthesises the final verdict after all debate stages complete.

**Output fields**
- `executive_summary` — 2-sentence plain-English summary
- `recommended_actions` — ordered list of actionable steps
- `opportunities` / `risks` — key opportunities and risks identified
- `consensus_areas` / `disagreements` — where the panel agreed/differed
- `confidence_score` — 0–100 confidence in the recommendation
- `heatmap_data` — per-expert scores for each criterion

`synthesize_verdict()` optionally takes the debate's `decision_parameters` (from `PanelBuilderAgent.extract_decision_parameters`) and is instructed to make sure `consensus_areas`/`disagreements`/`risks`/`opportunities` collectively cover more than one of them, rather than the verdict fixating on a single parameter.

**LLM**: Same configurable provider as ExpertAgent, max_tokens 1200 (larger budget for JSON verdict)

---

### ScorerAgent (`backend/app/agents/scorer.py`)

Evaluates each expert's overall performance after the debate.

**Scoring criteria**
`logic`, `evidence`, `practicality`, `risk_awareness`, `longterm_thinking`, `persuasiveness`, `overall`

Each criterion is scored 0–100.

**LLM**: Same configurable provider as ExpertAgent, max_tokens 800

---

### DocumentQAAgent (`backend/app/services/document_qa/adk_agent.py`)

Answers questions about an uploaded document. Unlike the debate agents above (plain LLM calls orchestrated by hand-written Python), this is a real [Google ADK](https://google.github.io/adk-docs/) `Agent` — the reasoning loop ("which section do I need? do I have enough to answer? should I check another one?") is driven by ADK's `Runner`, not by Decision Arena's own control flow.

**Tool**: `read_section(section_name: str) -> dict` — the agent's only way to see document content. Fuzzy-matches the requested name to a real section (via `rapidfuzz`, same approach as the fallback engine's `get_matching_section`), returns that section's full text, and once `max_sections_to_check` sections have been read, starts returning an error telling the agent to answer with what it has instead of continuing.

**Instruction**: lists every real section name up front and tells the agent to answer ONLY from tool-retrieved text, to call the tool again if one section isn't enough (up to the cap), and to reply exactly `NOT FOUND` if nothing it checked answers the question.

**Runner**: `InMemoryRunner` + `InMemorySessionService` — a fresh session per request (the route is stateless; conversation history isn't needed across questions). `runner.run_async()` is awaited inside the existing `async def ask_document` FastAPI route.

**LLM**: `gemini-2.5-flash`, via `GEMINI_API_KEY` (same key used for debates — ADK reads it from the `GOOGLE_API_KEY` env var, set internally from `settings.gemini_api_key`).

**Fallback**: when `GEMINI_API_KEY` isn't set, `api/documents.py` uses the original non-ADK engine instead — `workflow.find_retrieve_answer()` with a local Llama.cpp model — so the feature still works fully offline with no API key. See `ARCHITECTURE.md` → Document Q&A for the full pipeline diagram.

---

## Orchestration (`backend/app/engine/orchestrator.py`)

`DebateOrchestrator` manages the full debate lifecycle:

```
opening → cross_examination → closing → verdict
```

Before `opening`, `run()` calls `PanelBuilderAgent.extract_decision_parameters()` once and stores the result as `self.decision_parameters`. During `opening`/`closing`, each expert in the panel is assigned a `focus_parameter` via round-robin (`decision_parameters[idx % len(decision_parameters)]`) so the four experts collectively argue four different dimensions instead of all leading with the same point. `cross_examination` and the verdict synthesis also receive the full `decision_parameters` list so they can surface/cover dimensions the opening round didn't.

Audience questions injected mid-debate (`inject_audience_question()`, fed by either the WS `inject` message or the REST `POST /{debate_id}/inject` endpoint) go onto `audience_queue` and are drained — answered by every expert — after every stage in the main loop, not just at a fixed point in the pipeline.

Events are emitted to a queue and streamed to the frontend via WebSocket.

### WebSocket Protocol

All events follow this shape:
```json
{ "type": "<event_type>", ...payload }
```

Key event types:
| Event | Payload |
|-------|---------|
| `decision_parameters` | `{ parameters: string[] }` — emitted once, before `opening` |
| `stage_change` | `{ stage }` |
| `message_start` | `{ messageId, agentId, agentName, agentRole, agentIcon, agentColor, stage, messageType, sequenceNum }` |
| `token` | `{ messageId, content }` |
| `message_complete` | `{ messageId, fallacies, factTags }` |
| `score_update` | `{ scores: AgentScore[] }` |
| `verdict_ready` | `{ verdict: Verdict }` |
| `debate_complete` | `{}` |

---

## Post-Debate Q&A Mode

After `debate_complete`, the WebSocket hands off into **Q&A mode** (`_qa_mode` in `backend/app/api/ws.py`) **on the same connection** — no client reconnect needed. The connection stays open for 10 minutes. The frontend can send:
```json
{ "type": "inject", "question": "What about the regulatory risk?" }
```
Each expert then streams a fresh response to the question, and the response is persisted as a message.

**Implementation note**: a live debate's WebSocket previously stayed on the same connection through completion without resetting the message routing, so a follow-up question sent right after the debate finished was misrouted to the in-debate injection path (`_read_client` → `inject_audience_question`), whose queue nothing was draining anymore once `run()` had returned — the question was silently dropped instead of reaching `_qa_mode`. The handler now explicitly cancels the in-debate client reader and hands the same socket to `_qa_mode` the moment `run()` finishes normally, so this works correctly without any frontend reconnect logic.

---

## Adding a New Expert Persona

1. Add an `AgentConfig` entry to the panel configuration
2. No code changes needed — `ExpertAgent` is fully data-driven
3. The `bias` field shapes the system prompt automatically

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Groq API key (recommended — 500 tok/s) |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash API key |
| `OPENAI_API_KEY` | OpenAI API key (fallback) |
| `OLLAMA_BASE_URL` | Base URL for local Ollama instance (e.g. `http://localhost:11434`) |
| `OLLAMA_MODEL` | Ollama model name (default: `qwen2.5`) |
| `PRIMARY_LLM` | Server-default provider: `groq` \| `ollama` \| `gemini` \| `openai` |
| `LLM_TEMPERATURE` | Sampling temperature (default: 0.85) |
| `LLM_MAX_TOKENS` | Default token budget per message (default: 350) |
| `DOCUMENT_QA_MAX_SECTIONS` | Cap on sections the `DocumentQAAgent` (or fallback loop) may read per question (default: 20) |

Users can override the provider per debate from the UI — see `POST /api/v1/debates` (`llm_config` field). `DocumentQAAgent` always uses Gemini (or falls back to the local model) — it doesn't go through this per-debate provider selection.
