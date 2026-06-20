"""Panel builder — dynamically selects expert personas for a given question."""

from __future__ import annotations

import json
import logging
from app.agents.base import BaseAgent
from app.models.debate import AgentConfig, DebateCategory, DebateMode

logger = logging.getLogger(__name__)


# Curated expert library
EXPERT_LIBRARY: list[AgentConfig] = [
    AgentConfig(
        id="startup_founder",
        name="Alex Chen",
        role="Serial Startup Founder",
        icon="🚀",
        color="#7C3AED",
        bias="Speed, market disruption, first-mover advantage, risk tolerance",
        communication_style="provocative",
        expertise_domains=["startups", "product-market fit", "fundraising", "growth"],
    ),
    AgentConfig(
        id="venture_capitalist",
        name="Maria Santos",
        role="Venture Capitalist",
        icon="💰",
        color="#2563EB",
        bias="ROI, scale, defensible moat, exit potential",
        communication_style="analytical",
        expertise_domains=["investment", "market sizing", "business models", "risk assessment"],
    ),
    AgentConfig(
        id="tenured_professor",
        name="Dr. James Okonkwo",
        role="Tenured Professor",
        icon="🎓",
        color="#10B981",
        bias="Research rigor, long-term thinking, evidence-based approaches, stability",
        communication_style="analytical",
        expertise_domains=["academia", "research", "education", "methodology"],
    ),
    AgentConfig(
        id="senior_engineer",
        name="Priya Nair",
        role="Senior Software Engineer",
        icon="⚙️",
        color="#06B6D4",
        bias="Technical correctness, maintainability, scalability, pragmatic solutions",
        communication_style="pragmatic",
        expertise_domains=["software architecture", "engineering", "systems design", "tech debt"],
    ),
    AgentConfig(
        id="product_manager",
        name="Raj Patel",
        role="Product Manager",
        icon="🎯",
        color="#F59E0B",
        bias="User value, velocity, prioritization, product-market fit",
        communication_style="pragmatic",
        expertise_domains=["product strategy", "user research", "roadmapping", "metrics"],
    ),
    AgentConfig(
        id="cfo",
        name="Sarah Kim",
        role="Chief Financial Officer",
        icon="📊",
        color="#EF4444",
        bias="Cash flow, unit economics, financial risk, cost efficiency",
        communication_style="analytical",
        expertise_domains=["finance", "accounting", "risk management", "fundraising"],
    ),
    AgentConfig(
        id="cto",
        name="Marcus Williams",
        role="Chief Technology Officer",
        icon="🔧",
        color="#8B5CF6",
        bias="Architecture, security, technical strategy, build vs buy",
        communication_style="analytical",
        expertise_domains=["technology strategy", "architecture", "security", "engineering culture"],
    ),
    AgentConfig(
        id="cmo",
        name="Elena Vasquez",
        role="Chief Marketing Officer",
        icon="📣",
        color="#F97316",
        bias="Brand, customer acquisition, growth, market positioning",
        communication_style="empathetic",
        expertise_domains=["marketing", "brand", "growth", "customer psychology"],
    ),
    AgentConfig(
        id="industry_recruiter",
        name="Tom Bradley",
        role="Industry Recruiter",
        icon="👔",
        color="#64748B",
        bias="Market demand, skill gaps, compensation, career trajectories",
        communication_style="pragmatic",
        expertise_domains=["talent acquisition", "career markets", "compensation", "hiring trends"],
    ),
    AgentConfig(
        id="economist",
        name="Dr. Aisha Diallo",
        role="Economist",
        icon="📈",
        color="#0EA5E9",
        bias="Incentive structures, market efficiency, externalities, macroeconomic context",
        communication_style="analytical",
        expertise_domains=["economics", "policy", "market analysis", "behavioral economics"],
    ),
    AgentConfig(
        id="devils_advocate",
        name="Morgan Lee",
        role="Devil's Advocate",
        icon="😈",
        color="#EF4444",
        bias="Opposing the dominant narrative, exposing blind spots, worst-case thinking",
        communication_style="provocative",
        expertise_domains=["critical thinking", "risk analysis", "contrarian views"],
    ),
    AgentConfig(
        id="security_researcher",
        name="Kai Tanaka",
        role="Security Researcher",
        icon="🔒",
        color="#F59E0B",
        bias="Vulnerabilities, compliance risks, adversarial scenarios, zero-trust thinking",
        communication_style="analytical",
        expertise_domains=["cybersecurity", "compliance", "risk", "privacy"],
    ),
    AgentConfig(
        id="civil_society",
        name="Amara Osei",
        role="Civil Society Representative",
        icon="🌍",
        color="#10B981",
        bias="Equity, social impact, community needs, access and inclusion",
        communication_style="empathetic",
        expertise_domains=["social policy", "equity", "community development", "ethics"],
    ),
    AgentConfig(
        id="hr_executive",
        name="Sofia Morales",
        role="HR Executive",
        icon="🤝",
        color="#EC4899",
        bias="People, culture, organizational health, talent retention",
        communication_style="empathetic",
        expertise_domains=["hr", "organizational behavior", "culture", "talent management"],
    ),
    # ── Personal-decision personas ──────────────────────────────────────────
    AgentConfig(
        id="financial_planner",
        name="Maya Thompson",
        role="Certified Financial Planner",
        icon="💵",
        color="#16A34A",
        bias="Personal budgeting, debt management, long-term savings, financial security over short-term gratification",
        communication_style="pragmatic",
        expertise_domains=["personal finance", "budgeting", "debt management", "retirement planning"],
    ),
    AgentConfig(
        id="licensed_therapist",
        name="Dr. Elena Brooks",
        role="Licensed Therapist",
        icon="🧠",
        color="#A855F7",
        bias="Emotional wellbeing, mental health impact, avoiding self-sabotage, sustainable choices over willpower",
        communication_style="empathetic",
        expertise_domains=["mental health", "behavioral patterns", "stress management", "relationships"],
    ),
    AgentConfig(
        id="life_coach",
        name="Jordan Reyes",
        role="Life Coach",
        icon="🌱",
        color="#F59E0B",
        bias="Personal growth, alignment with values, momentum, getting unstuck, regret minimization",
        communication_style="provocative",
        expertise_domains=["goal-setting", "habit change", "motivation", "life transitions"],
    ),
    AgentConfig(
        id="best_friend",
        name="Priya Malhotra",
        role="The Brutally Honest Best Friend",
        icon="🫶",
        color="#FB7185",
        bias="What they will tell you over coffee — cutting through overthinking, excuses, and people-pleasing",
        communication_style="blunt",
        expertise_domains=["lived experience", "relationships", "calling out excuses"],
    ),
    AgentConfig(
        id="protective_parent",
        name="Daniel Osei",
        role="Protective Parent Figure",
        icon="🛡️",
        color="#0891B2",
        bias="Family stability, safety nets, risk-aversion, what could go wrong for those who depend on you",
        communication_style="cautionary",
        expertise_domains=["family planning", "risk mitigation", "long-term security", "life stability"],
    ),
    AgentConfig(
        id="physician",
        name="Dr. Hannah Lindqvist",
        role="Physician & Health Advisor",
        icon="🩺",
        color="#DC2626",
        bias="Physical health impact, stress and burnout risk, sustainable pace over short-term wins",
        communication_style="analytical",
        expertise_domains=["health", "wellbeing", "burnout prevention", "lifestyle medicine"],
    ),
]

# Default panel compositions by category
CATEGORY_DEFAULTS: dict[str, list[str]] = {
    "career": ["startup_founder", "tenured_professor", "industry_recruiter", "hr_executive"],
    "business": ["startup_founder", "venture_capitalist", "cfo", "devils_advocate"],
    "tech": ["senior_engineer", "product_manager", "cto", "security_researcher"],
    "policy": ["economist", "civil_society", "devils_advocate", "tenured_professor"],
    "personal": ["financial_planner", "licensed_therapist", "best_friend", "life_coach"],
    "other": ["startup_founder", "tenured_professor", "venture_capitalist", "devils_advocate"],
}

MODE_OVERRIDES: dict[str, list[str]] = {
    "boardroom": ["cto", "cfo", "cmo", "hr_executive", "venture_capitalist"],
    "shark_tank": ["venture_capitalist", "cfo", "devils_advocate", "cmo"],
    "policy": ["economist", "civil_society", "tenured_professor", "devils_advocate"],
}


class PanelBuilderAgent(BaseAgent):
    """Dynamically builds an expert panel for a given question."""

    def __init__(self, llm_service=None) -> None:
        super().__init__(
            agent_id="panel_builder",
            name="Panel Builder",
            role="Orchestrator",
            llm_service=llm_service,
        )
        self._library_map = {e.id: e for e in EXPERT_LIBRARY}

    @property
    def system_prompt(self) -> str:
        return (
            "You are an expert debate panel curator. "
            "Given a question and category, you select the most relevant expert IDs. "
            "You ONLY return valid JSON.\n"
        )

    async def build_panel(
        self,
        question: str,
        category: DebateCategory,
        mode: DebateMode,
    ) -> list[AgentConfig]:
        """Build a 4-expert panel for the question."""
        # Mode overrides take priority
        if mode.value in MODE_OVERRIDES:
            ids = MODE_OVERRIDES[mode.value]
            return [self._library_map[i] for i in ids if i in self._library_map]

        # Use LLM to pick from library for standard mode
        available_ids = list(self._library_map.keys())
        defaults = CATEGORY_DEFAULTS.get(category.value, CATEGORY_DEFAULTS["other"])

        try:
            prompt = (
                f"Question: '{question}'\nCategory: {category.value}\n\n"
                f"Available expert IDs: {available_ids}\n"
                f"Default suggestions: {defaults}\n\n"
                "Pick exactly 4 expert IDs that would create the most insightful, "
                "diverse, and adversarial debate for this specific question.\n"
                "Return ONLY: {\"panel\": [\"id1\", \"id2\", \"id3\", \"id4\"]}"
            )
            raw = await self.generate(prompt, temperature=0.4)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            data = json.loads(raw[start:end])
            panel_ids = data.get("panel", defaults)[:4]
            panel = [self._library_map[i] for i in panel_ids if i in self._library_map]
            if len(panel) < 2:
                raise ValueError("Insufficient valid panel members")
            return panel
        except Exception as exc:
            logger.warning("LLM panel selection failed (%s), using defaults.", exc)
            return [self._library_map[i] for i in defaults if i in self._library_map]

    async def extract_decision_parameters(self, question: str) -> list[str]:
        """
        Decompose the question into 3-5 distinct decision-relevant parameters
        so the panel debates the whole decision, not just the one number or
        detail the user happened to mention (e.g. a price).

        Returns a list of short parameter labels (e.g. "Pricing & affordability",
        "Effectiveness vs. free alternatives", "Operational feasibility").
        Falls back to a generic, still-multi-aspect set on any failure.
        """
        fallback = [
            "Cost & affordability",
            "Effectiveness & expected outcomes",
            "Feasibility & practical execution",
            "Risks & downsides",
            "Alternatives & opportunity cost",
        ]
        try:
            prompt = (
                f"Decision question: '{question}'\n\n"
                "Identify the 3 to 5 most decision-relevant parameters/dimensions "
                "someone would need to weigh to properly evaluate this decision. "
                "Do NOT fixate on a single number or detail mentioned in the question "
                "(e.g. a price) — surface the full range of what actually matters: "
                "things like cost, effectiveness/outcomes vs. alternatives, feasibility, "
                "risk, equity/access, long-term sustainability, etc., whichever are "
                "genuinely relevant to THIS question.\n\n"
                "Return ONLY: {\"parameters\": [\"short label 1\", \"short label 2\", \"short label 3\"]}"
            )
            raw = await self.generate(prompt, temperature=0.3)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            data = json.loads(raw[start:end])
            params = [str(p).strip() for p in data.get("parameters", []) if str(p).strip()]
            if len(params) < 2:
                raise ValueError("Too few parameters returned")
            return params[:5]
        except Exception as exc:
            logger.warning("Decision parameter extraction failed (%s), using fallback.", exc)
            return fallback

    async def classify_question(self, question: str) -> tuple[DebateCategory, float]:
        """Classify a question into a category. Returns (category, confidence)."""
        prompt = (
            f"Classify this decision question into exactly ONE category.\n"
            f"Question: '{question}'\n"
            f"Categories: career, business, tech, policy, personal, other\n\n"
            "Return ONLY: {\"category\": \"business\", \"confidence\": 0.87}"
        )
        try:
            raw = await self.generate(prompt, temperature=0.1)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            data = json.loads(raw[start:end])
            cat = DebateCategory(data.get("category", "other"))
            conf = float(data.get("confidence", 0.7))
            return cat, conf
        except Exception:
            return DebateCategory.other, 0.5
