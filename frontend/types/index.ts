// ── Backend-aligned types ─────────────────────────────────────────────────────

export type DebateMode = "standard" | "boardroom" | "shark_tank" | "policy";
export type DebateCategory =
  | "career"
  | "business"
  | "tech"
  | "policy"
  | "personal"
  | "other";
export type DebateStatus = "pending" | "running" | "completed" | "error";
export type DebateStageType =
  | "opening"
  | "cross_examination"
  | "challenges"
  | "audience_intervention"
  | "rebuttals"
  | "closing"
  | "verdict";
export type MessageRole =
  | "expert"
  | "moderator"
  | "system"
  | "audience"
  | "fallacy"
  | "fact_check"
  | "question";

// Matches backend AgentConfig
export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  bias: string;
  communication_style: string;
  expertise_domains: string[];
  avatar_seed?: string;
}

// Frontend convenience alias
export type ExpertAgent = AgentConfig & {
  title: string; // alias for role
  stance: string; // alias for bias
  expertise: string[]; // alias for expertise_domains
};

export interface Fallacy {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  agent_id: string;
}

export interface FactTag {
  claim: string;
  verdict: "verified" | "disputed" | "unverifiable";
  source?: string;
}

export interface AgentScore {
  agent_id: string;
  agent_name: string;
  agent_color?: string;
  logic: number;
  evidence: number;
  practicality: number;
  risk_awareness: number;
  longterm_thinking: number;
  persuasiveness: number;
  overall: number;
}

export interface DebateMessage {
  id: string;
  debate_id: string;
  stage: DebateStageType;
  role?: MessageRole; // used by MessageBubble for rendering variant
  agent_id?: string;
  agent_name?: string;
  agent_role?: string; // agent's job title, e.g. "CFO"
  agent_title?: string; // alias shown in MessageBubble subtitle
  agent_icon?: string;
  agent_color?: string;
  content: string;
  message_type?: string; // "argument" | "question" | "moderation"
  timestamp?: string;
  created_at?: string;
  fallacies?: Fallacy[];
  fact_tags?: FactTag[];
  is_streaming?: boolean;
  sequence_num?: number;
}

export interface HeatmapCell {
  aspect: string;
  agent_id: string;
  agent_name: string;
  score: number;
  confidence: number;
}

export interface VerdictHeatmapItem {
  label: string;
  value: number;
  category: "risk" | "benefit" | "cost" | "opportunity" | string;
  description: string;
}

// Matches backend synthesize_verdict JSON shape
export interface Verdict {
  id?: string;
  debateId?: string;
  executive_summary?: string;
  consensus_areas?: string[];
  disagreements?: string[];
  risks?: string[];
  opportunities?: string[];
  recommended_actions?: string[];
  confidence_score?: number;
  heatmap_data?: VerdictHeatmapItem[];
  createdAt?: string;
  // Legacy fields (kept for type compat)
  summary?: string;
  recommendation?: string;
  consensus_level?: number;
  key_risks?: string[];
  key_opportunities?: string[];
}

// Matches backend DebateResponse
export interface Debate {
  id: string;
  user_id: string;
  question: string;
  category: DebateCategory;
  mode: DebateMode;
  status: DebateStatus;
  panel: AgentConfig[];
  current_stage: DebateStageType;
  audience_questions: string[];
  messages?: DebateMessage[];
  verdict?: Verdict;
  created_at: string;
  completed_at?: string;
}

// Matches backend ClassifyResponse
export interface ClassifyResponse {
  category: DebateCategory;
  mode: DebateMode;
  suggested_panel: AgentConfig[];
  confidence: number;
}

// WebSocket message types
export type WSEventType =
  | "debate_started"
  | "stage_changed"
  | "message_start"
  | "message_token"
  | "message_end"
  | "fallacy_detected"
  | "fact_checked"
  | "scores_updated"
  | "audience_acknowledged"
  | "verdict_ready"
  | "debate_complete"
  | "error";

export interface WSMessage {
  type: WSEventType;
  debate_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface LLMConfig {
  provider: string;
  api_key?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  groq_model?: string;
}

export interface CreateDebatePayload {
  question: string;
  category: DebateCategory;
  mode: DebateMode;
  panel: AgentConfig[];
  llm_config?: LLMConfig;
}

export interface AudienceInjectionRequest {
  debate_id: string;
  question: string;
}
