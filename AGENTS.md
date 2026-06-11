# AGENTS.md â AI Agent Architecture

This document describes the AI agents that power Decision Arena.

## Overview

Decision Arena uses a multi-agent orchestration system built on FastAPI + LangGraph.

## Agent Types

### ExpertAgent

- `opening` â punchy opening statement (60â80 words)
- `cross_examination` â 2â4 sentences challenging other experts
- `closing` â 2â4 sentence closing argument
- `audience_intervention` â brief answer to injected questions

LLM: Groq `llama-3.1-8b-instant`, max_tokens 350

### ModeratorAgent

Synthesises the final verdict. LLM: max_tokens 1200

### ScorerAgent

Evaluates each expert on: logic, evidence, practicality, risk_awareness, longterm_thinking, persuasiveness, overall. LLM: max_tokens 800

## Orchestration

```
opening â cross_examination â closing â verdict
```

## Post-Debate Q&A Mode

After `debate_complete`, WebSocket stays open 10 min. Send:
```json
{ "type": "inject", "question": "What about the risk?" }
```
