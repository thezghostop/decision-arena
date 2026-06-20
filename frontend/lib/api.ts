import axios from "axios";
import type {
  Debate,
  DebateMessage,
  ClassifyResponse,
  CreateDebatePayload,
  AudienceInjectionRequest,
  DebateMode,
  AgentConfig,
  DocumentItem,
  UploadDocumentResponse,
  AskDocumentResponse,
  DocumentQuestion,
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
  mode?: DebateMode
): Promise<ClassifyResponse> {
  const { data } = await apiClient.post<ClassifyResponse>(
    "/api/v1/debates/classify",
    { question, mode }
  );
  return data;
}

// Full curated expert library — lets the user swap in a different preset
// persona when manually editing a panel, without duplicating persona data
// in the frontend.
export async function listExperts(): Promise<AgentConfig[]> {
  const { data } = await apiClient.get<AgentConfig[]>("/api/v1/debates/experts");
  return data;
}

// Step 2: create debate with full payload (question + category + mode + final panel)
export async function createDebateWithPanel(payload: CreateDebatePayload): Promise<Debate> {
  const { data } = await apiClient.post<{ debate_id: string; debate: Debate }>(
    "/api/v1/debates/",
    payload
  );
  return data.debate;
}

export interface LLMConfig {
  provider: string;
  api_key?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  groq_model?: string;
}

// Convenience: classify then create immediately with the AI-suggested panel
// (used by any caller that skips panel review/editing).
export async function createDebate(opts: {
  question: string;
  mode: DebateMode;
  llm_config?: LLMConfig;
}): Promise<Debate> {
  const classification = await classifyQuestion(opts.question, opts.mode);
  return createDebateWithPanel({
    question: opts.question,
    category: classification.category,
    mode: opts.mode,
    panel: classification.suggested_panel,
    llm_config: opts.llm_config,
  });
}

export async function getDebate(debateId: string): Promise<Debate> {
  const { data } = await apiClient.get<Debate>(`/api/v1/debates/${debateId}`);
  return data;
}

export async function getMessages(debateId: string): Promise<DebateMessage[]> {
  const { data } = await apiClient.get<DebateMessage[]>(
    `/api/v1/debates/${debateId}/messages`
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
  payload: AudienceInjectionRequest
): Promise<void> {
  await apiClient.post(
    `/api/v1/debates/${payload.debate_id}/inject`,
    { question: payload.question }
  );
}

export async function exportDebateReport(debateId: string): Promise<string> {
  const { data } = await apiClient.post<{ download_url: string }>(
    `/api/v1/reports/${debateId}`
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

// ── Local Document Q&A ───────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<UploadDocumentResponse>(
    "/api/v1/documents/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const { data } = await apiClient.get<DocumentItem[]>("/api/v1/documents/");
  return data;
}

export async function getDocument(documentId: string): Promise<DocumentItem> {
  const { data } = await apiClient.get<DocumentItem>(
    `/api/v1/documents/${documentId}`
  );
  return data;
}

export async function askDocument(
  documentId: string,
  question: string
): Promise<AskDocumentResponse> {
  const { data } = await apiClient.post<AskDocumentResponse>(
    `/api/v1/documents/${documentId}/ask`,
    { question }
  );
  return data;
}

export async function getDocumentQuestions(
  documentId: string
): Promise<DocumentQuestion[]> {
  const { data } = await apiClient.get<DocumentQuestion[]>(
    `/api/v1/documents/${documentId}/questions`
  );
  return data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/documents/${documentId}`);
}
