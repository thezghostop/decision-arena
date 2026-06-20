import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  Debate,
  DebateMessage,
  AgentScore,
  Verdict,
  DebateStageType,
  AgentConfig,
} from "@/types";

interface DebateState {
  debate: Debate | null;
  messages: DebateMessage[];
  scores: AgentScore[];
  verdict: Verdict | null;
  currentStage: DebateStageType | null;
  streamingMessageId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  debates: Debate[];
  decisionParameters: string[];

  setDebate: (debate: Debate) => void;
  addMessage: (message: DebateMessage) => void;
  appendToStreamingMessage: (id: string, token: string) => void;
  finalizeStreamingMessage: (id: string) => void;
  setStreamingMessageId: (id: string | null) => void;
  setScores: (scores: AgentScore[]) => void;
  setVerdict: (verdict: Verdict) => void;
  setStage: (stage: DebateStageType) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDebates: (debates: Debate[]) => void;
  updateAgent: (agent: AgentConfig) => void;
  setDecisionParameters: (parameters: string[]) => void;
  resetDebate: () => void;
}

export const useDebateStore = create<DebateState>()(
  devtools(
    (set) => ({
      debate: null,
      messages: [],
      scores: [],
      verdict: null,
      currentStage: null,
      streamingMessageId: null,
      isConnected: false,
      isLoading: false,
      error: null,
      debates: [],
      decisionParameters: [],

      setDebate: (debate) =>
        set({ debate, currentStage: debate.current_stage }, false, "setDebate"),

      addMessage: (message) =>
        set(
          (state) => ({
            messages: state.messages.some((m) => m.id === message.id)
              ? state.messages
              : [...state.messages, message],
          }),
          false,
          "addMessage",
        ),

      appendToStreamingMessage: (id, token) =>
        set(
          (state) => ({
            messages: state.messages.map((m) =>
              m.id === id ? { ...m, content: m.content + token } : m,
            ),
          }),
          false,
          "appendToken",
        ),

      finalizeStreamingMessage: (id) =>
        set(
          (state) => ({
            messages: state.messages.map((m) =>
              m.id === id ? { ...m, is_streaming: false } : m,
            ),
            streamingMessageId: null,
          }),
          false,
          "finalizeMessage",
        ),

      setStreamingMessageId: (id) =>
        set({ streamingMessageId: id }, false, "setStreamingId"),

      setScores: (scores) => set({ scores }, false, "setScores"),

      setVerdict: (verdict) => set({ verdict }, false, "setVerdict"),

      setStage: (stage) =>
        set(
          (state) => ({
            currentStage: stage,
            debate: state.debate
              ? { ...state.debate, current_stage: stage }
              : null,
          }),
          false,
          "setStage",
        ),

      setConnected: (isConnected) =>
        set({ isConnected }, false, "setConnected"),

      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

      setError: (error) => set({ error }, false, "setError"),

      setDebates: (debates) => set({ debates }, false, "setDebates"),

      setDecisionParameters: (parameters) =>
        set({ decisionParameters: parameters }, false, "setDecisionParameters"),

      updateAgent: (agent) =>
        set(
          (state) => ({
            debate: state.debate
              ? {
                  ...state.debate,
                  panel: state.debate.panel.map((a) =>
                    a.id === agent.id ? agent : a,
                  ),
                }
              : null,
          }),
          false,
          "updateAgent",
        ),

      resetDebate: () =>
        set(
          {
            debate: null,
            messages: [],
            scores: [],
            verdict: null,
            currentStage: null,
            streamingMessageId: null,
            isConnected: false,
            error: null,
            decisionParameters: [],
          },
          false,
          "resetDebate",
        ),
    }),
    { name: "debate-store" },
  ),
);
