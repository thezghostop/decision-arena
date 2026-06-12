"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { wsManager } from "@/lib/websocket";
import { useDebateStore } from "@/store/debateStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMsg = Record<string, any>;

export function useDebateWebSocket(debateId: string | null) {
  const { getToken } = useAuth();
  const store = useDebateStore();
  const connected = useRef(false);

  const handleMessage = useCallback(
    (msg: AnyMsg) => {
      switch (msg.type) {
        case "stage_change": {
          store.setStage(msg.stage);
          break;
        }
        case "message_start": {
          const isModeratorMsg =
            msg.agentId === "moderator" || msg.messageType === "moderation";
          store.addMessage({
            id: msg.messageId,
            debate_id: debateId ?? "",
            agent_id: msg.agentId,
            agent_name: msg.agentName,
            agent_role: msg.agentRole,
            agent_title: msg.agentRole,
            agent_icon: msg.agentIcon,
            agent_color: msg.agentColor,
            stage: msg.stage,
            role: isModeratorMsg ? "moderator" : "expert",
            content: "",
            message_type: msg.messageType,
            fallacies: [],
            fact_tags: [],
            sequence_num: msg.sequenceNum,
            is_streaming: true,
            created_at: new Date().toISOString(),
          });
          store.setStreamingMessageId(msg.messageId);
          break;
        }
        case "token": {
          store.appendToStreamingMessage(msg.messageId, msg.content);
          break;
        }
        case "message_complete": {
          store.finalizeStreamingMessage(msg.messageId);
          break;
        }
        case "score_update": {
          store.setScores(msg.scores ?? []);
          break;
        }
        case "verdict_ready": {
          store.setVerdict(msg.verdict);
          break;
        }
        case "debate_complete": {
          if (store.debate) {
            store.setDebate({ ...store.debate, status: "completed" });
          }
          break;
        }
        case "error": {
          store.setError(String(msg.message ?? "Unknown error"));
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debateId]
  );

  useEffect(() => {
    if (!debateId) return;
    // Allow reconnect if previously connected (e.g. completed debate → Q&A mode)
    if (connected.current) {
      wsManager.disconnect();
      connected.current = false;
    }

    let cancelled = false;
    let cleanups: Array<() => void> = [];

    getToken()
      .then((token) => {
        // Stale effect (React StrictMode double-invoke): bail out
        if (cancelled || !token) return;
        wsManager.connect(debateId, token);
        connected.current = true;
        store.setConnected(true);

        const events = [
          "debate_started",
          "stage_change",
          "message_start",
          "token",
          "message_complete",
          "score_update",
          "verdict_ready",
          "debate_complete",
          "audience_injected",
          "error",
        ] as const;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cleanups = events.map((event) => wsManager.on(event as any, handleMessage as any));
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      wsManager.disconnect();
      connected.current = false;
      store.setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId]);

  return { isConnected: store.isConnected };
}
