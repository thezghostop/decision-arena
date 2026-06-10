# Feature Spec: Multi-Expert AI Debate Engine

**Status**: Done
**Author**: @chaitanyachalith
**Date**: 2026-06-01

---

## Problem Statement

Users face complex decisions but lack access to diverse expert perspectives. Traditional decision-support tools give a single answer; Decision Arena simulates a full adversarial debate between multiple AI experts, surfacing the best arguments on all sides before synthesising a verdict.

## Goals

- Allow users to submit any decision question and get a structured expert debate
- Stream the debate live to the browser via WebSocket
- Synthesise a final verdict with top recommendation, risks, and opportunities
- Score each expert's performance across logic, evidence, and persuasiveness

## Non-Goals

- Real-time collaboration (multiple human users in the same debate)
- Voice/audio output
- Integration with external data sources

## User Stories

- As a user, I want to enter a question and see multiple experts debate it live, so I can understand different perspectives before deciding.
- As a user, I want to inject my own question mid-debate so I can probe specific concerns.
- As a user, I want a final verdict with a clear top recommendation so I don't have to synthesise the debate myself.
- As a user, I want to export the full debate as a PDF so I can share it.

## Acceptance Criteria

- [x] User can start a debate with a question, category, and mode
- [x] 3–6 expert agents debate in structured stages: opening → cross-examination → closing → verdict
- [x] All tokens stream live to the browser via WebSocket
- [x] Each expert is scored after the debate (logic, evidence, practicality, etc.)
- [x] Final verdict includes: summary, top recommendation, risks, opportunities, consensus/disagreements
- [x] User can inject questions during or after the debate
- [x] Completed debates enter Q&A mode (WS stays open 10 min)
- [x] Debate transcript is saved to DB and viewable in History
- [x] PDF export available after debate completes

## Technical Design

### Backend

- `DebateOrchestrator` manages stage progression and emits WebSocket events
- `ExpertAgent` streams tokens via Groq API for each stage
- `ModeratorAgent` synthesises the JSON verdict (max_tokens=1200)
- `ScorerAgent` scores all experts after closing (max_tokens=800)
- WS endpoint: `/ws/debate/{debate_id}?token=<jwt>`

### Frontend

- `useDebateWebSocket` hook manages WS lifecycle with `cancelled` flag
- `debateStore` (Zustand) holds messages, scores, verdict, stage
- `DebateArena` renders messages + sidebar + verdict

## Edge Cases & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| LLM truncates verdict JSON | Medium | max_tokens=1200 for moderator |
| React StrictMode double-effect | High (dev) | `cancelled` flag in async useEffect |
| Duplicate WS connections | Medium | Check active_debates dict before spawning |

## Testing Plan

- Unit: test_agents.py — mock LLM, verify expert speaks per stage
- Integration: test_api.py — create debate via REST, check DB record

## Open Questions

- [x] Should verdicts be regeneratable? → No, stored once
- [x] What if an expert fails mid-stream? → Log warning, continue