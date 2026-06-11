import axios from "axios";
import type {
  Debate,
  DebateMessage,
  ClassifyResponse,
  CreateDebatePayload,
  AudienceInjectionRequest,
  DebateMode,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 90000, // 90s — Render free tier cold starts can take ~60s
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

// Step 1: classify question → get category + suggested panel
export async function classifyQuestion(
  question: string,
  mode?: DebateMode,
): Promise<ClassifyResponse> {
  const { data } = await apiClient.post<ClassifyResponse>(
    "/api/v1/debates/classify",
    { question, mode },
  );
  return data;
}

// Step 2: create debate with full payload
async function _createDebate(payload: CreateDebatePayload): Promise<Debate> {
  const { data } = await apiClient.post<{ debate_id: string; debate: Debate }>(
    "/api/v1/debates/",
    payload,
  );
  return data.debate;
}

// Public: classify then create in one call
export async function createDebate(opts: {
  question: string;
  mode: DebateMode;
}): Promise<Debate> {
  const classification = await classifyQuestion(opts.question, opts.mode);
  return _createDebate({
    question: opts.question,
    category: classification.category,
    mode: opts.mode,
    panel: classification.suggested_panel,
  });
}

export async function getDebate(debateId: string): Promise<Debate> {
  const { data } = await apiClient.get<Debate>(`/api/v1/debates/${debateId}`);
  return data;
}

export async function getMessages(debateId: string): Promise<DebateMessage[]> {
  const { data } = await apiClient.get<DebateMessage[]>(
    `/api/v1/debates/${debateId}/messages`,
  );
  // Derive `role` for MessageBubble rendering
  return data.map((m) => ({
    ...m,
    agent_title: m.agent_role,
    role:
      m.agent_id === "moderator" || m.message_type === "moderation"
        ? "moderator"
        : ("expert" as const),
  }));
}

export async function listDebates(): Promise<Debate[]> {
  const { data } = await apiClient.get<Debate[]>("/api/v1/debates/");
  return data;
}

export async function injectAudienceQuestion(
  payload: AudienceInjectionRequest,
): Promise<void> {
  await apiClient.post(`/api/v1/debates/${payload.debate_id}/inject`, {
    question: payload.question,
  });
}

export async function exportDebateReport(debateId: string): Promise<string> {
  const { data } = await apiClient.post<{ download_url: string }>(
    `/api/v1/reports/${debateId}`,
  );
  return data.download_url;
}

export async function healthCheck(): Promise<boolean> {
  try {
    await apiClient.get("/health");
    return true;
  } catch {
    return false;
  }
}
