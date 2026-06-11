# Spec — Decision Arena

## Problem

Making important decisions is hard. People often rely on a single perspective, miss blind spots, or get paralysed by conflicting advice. There is no tool that systematically stress-tests a decision from multiple expert angles before you commit.

---

## Goal

Build a web app where a user describes a decision they face, and a panel of AI expert agents debates it live — exposing risks, surfacing opportunities, and delivering a structured verdict with actionable recommendations.

---

## Users

| User | Description |
|------|-------------|
| Primary | Professional or founder facing a high-stakes decision (hiring, strategy, product) |
| Secondary | Student or individual weighing a personal or career decision |

---

## Features

| Feature | Description |
|---------|-------------|
| Debate Engine | Multi-expert AI panel debates the question across opening, cross-examination, and closing stages |
| Live Streaming | WebSocket streaming shows each expert's words token-by-token in real time |
| Scoring | Each expert is scored on logic, evidence, practicality, risk awareness, and persuasiveness |
| Verdict | Moderator agent synthesises a final verdict with recommended actions, pros/cons, and confidence score |
| Q&A Mode | After the debate, users can inject follow-up questions and get live responses from the panel |
| History | All past debates are saved and browsable with full transcripts |
| Export | Debates can be exported as PDF reports |
