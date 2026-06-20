# Decision Arena — User Manual

## What Is Decision Arena?

Decision Arena is an AI-powered decision simulation platform. You describe a decision you're facing, and a panel of expert AI agents debates it from multiple angles — exposing blind spots, stress-testing assumptions, and surfacing risks you might have missed.

## Getting Started

### 1. Sign Up
Visit the app and sign in with your Google or email account (powered by Clerk).

### 2. Start a New Debate
On the home page, click **Start a Debate** and fill in:
- **Your Question** — the decision or dilemma you want debated (e.g. "Should we launch in India before Europe?")
- **Category** — Business, Technology, Policy, Personal, or Other
- **Debate Mode** — choose how many perspectives you want and how adversarial the debate should be

### 3. Review & Customize Your Panel
After you submit your question, the AI suggests an expert panel — you don't go straight into the debate. Instead you land on a panel review screen where you can:
- **Swap** any expert for another from the curated library, or for a **custom expert** you define yourself (name, role, what they care about, communication style, and areas of expertise)
- **Remove** an expert (panel must keep at least 2)
- **Add** an expert (panel can grow to at most 6)

Click **Confirm Panel** when you're happy with the lineup — that's when the debate is actually created and begins. Click **Back** to change your question or mode instead.

### 4. Watch the Debate Unfold
Before the debate starts, the panel breaks your question down into the 3–5 dimensions that actually matter for the decision (for example: cost, effectiveness, feasibility, risk, alternatives) — shown as small tags above the debate. This keeps the panel from fixating on a single number or detail in your question (e.g. a price) and ignoring everything else relevant to the decision. You'll then see:
- Each expert's opening statement, cross-examination, and closing argument — each expert is assigned one of the decision dimensions to argue, so the debate covers the question from multiple angles instead of just one
- A **Scoreboard** showing each expert's scores for logic, evidence, persuasiveness, and more
- A **Final Verdict** with the top recommendation, pros/cons, and key risks

### 5. Ask the Panel
During or after the debate, use **Ask the Panel** to inject your own question — the experts respond in real time, whether the debate is still running or has already finished. You don't need to start a new debate to ask a follow-up; it's answered on the same debate page.

### 6. Rate the Debate
Once the debate ends, a **Review** prompt appears. Give a star rating (1–5) and optional written feedback. Your review helps improve the platform.

### 7. Export the Report
Once the debate completes, click **Export Report** to download a full PDF summary including the verdict, scores, and all messages.

## Choosing Your AI Provider

Before starting a debate, expand **AI Settings** to choose which AI powers your debate:

| Provider | How to use |
|----------|-----------|
| **Groq** (default) | Paste your free [Groq API key](https://console.groq.com) — 500 tokens/sec |
| **Ollama** | Run Ollama locally and enter its URL — fully offline, no data leaves your device |
| **Gemini** | Paste your [Google AI Studio](https://aistudio.google.com) key |
| **OpenAI** | Paste your OpenAI key |

If you leave AI Settings empty, the server's default (Groq) is used automatically.

## Multilingual Debates

Select your language from the **Language** dropdown before starting a debate. All experts will argue, cross-examine, and deliver the final verdict in that language.

| Language | Option |
|----------|--------|
| English | Default |
| Hindi | हिंदी |
| Kannada | ಕನ್ನಡ |

## Debate Modes

| Mode | Experts | Description |
|------|---------|-------------|
| Quick | 3 | Fast 3-expert debate, ideal for quick decisions |
| Standard | 4 | Balanced panel with multiple perspectives |
| Deep Dive | 6 | Full adversarial panel, maximum coverage |

## Understanding the Scores

Each expert is scored after the debate:
- **Logic** — soundness of arguments
- **Evidence** — quality of supporting data
- **Practicality** — real-world feasibility
- **Risk Awareness** — identification of potential downsides
- **Long-term Thinking** — consideration of future implications
- **Persuasiveness** — overall impact of the argument
- **Overall** — weighted composite score

## Debate History
Access all past debates from the **History** page. Click any debate to review the full transcript and verdict.

## Document Q&A

The **Documents** tab lets you upload a document and ask questions about it.
Answers come from an AI agent that reads the document section by section and
answers strictly from what it finds — it never makes anything up or answers
from general knowledge.

By default this agent uses Google Gemini (the platform's own API key — you
don't need to provide one). If the server has no Gemini key configured, it
falls back automatically to a local model that runs entirely on the server
with no external API calls at all; either way, your file never leaves the
platform's infrastructure.

### 1. Upload a Document
Go to **Documents** and drag in (or click to select) a file: PDF, DOCX, TXT,
MD, PPTX, or XLSX, up to 25 MB. The document appears in your list with status
**Processing**.

### 2. Wait for Processing
The page automatically checks status every few seconds. Once the document has
been split into sections, status changes to **Ready**. If extraction fails
(e.g. an unreadable scan), status changes to **Error**.

### 3. Ask Questions
Open a **Ready** document and type a question in the box. On the default
Gemini-backed path, answers come back as fast as Gemini can generate them.
On the local fallback path, the first answer on a fresh server may take a
while — the local model has to load (and download, on its very first use).
After that, answers come back as fast as that model can generate them.

### 4. Review Past Answers
Each answer shows which section(s) of the document were checked to produce
it, so you can verify it against the source. All past questions and answers
for a document are kept and shown on the same page.

### 5. Delete a Document
Remove a document (and its extracted sections and Q&A history) from the
document list.

**Note:** This feature works best on documents with clear headings (specs,
manuals, policies, FAQs, contracts) since it answers by locating the most
relevant section rather than searching the whole document at once.

## Privacy
Your debates are private to your account. We do not share debate content with third parties. See our [Security Policy](SECURITY.md) for more.

## Support
For bugs or questions, open an issue on our [GitLab project](https://code.swecha.org).
