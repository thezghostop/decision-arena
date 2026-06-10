"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useDebateStore } from "@/store/debateStore";
import { useDebateWebSocket } from "@/hooks/useWebSocket";
import { getDebate, getMessages, setAuthToken } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { Scoreboard } from "./Scoreboard";
import { AudienceInput } from "./AudienceInput";
import { FinalVerdict } from "./FinalVerdict";
import { ExportReport } from "./ExportReport";
import { DebateStage } from "./DebateStage";
import { truncate } from "@/lib/utils";

export function DebateArena({ debateId }: { debateId: string }) {
  const { getToken } = useAuth();
  const store = useDebateStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const { isConnected } = useDebateWebSocket(debateId);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
  }, []);

  useEffect(() => {
    // Reset stale state from any previous debate before loading the new one
    store.resetDebate();
    let mounted = true;
    const load = async () => {
      store.setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        setAuthToken(token);
        const debate = await getDebate(debateId);
        if (!mounted) return;
        store.setDebate(debate);
        if (debate.status === "completed") {
          const msgs = await getMessages(debateId);
          if (mounted) msgs.forEach((m) => store.addMessage(m));
        }
      } catch (err) {
        console.error("Failed to load debate:", err);
      } finally {
        if (mounted) store.setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debateId]);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [store.messages]);

  const isComplete = store.debate?.status === "completed";

  if (store.isLoading && !store.debate) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
          <p className="text-slate-400 text-sm">Loading debate…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">
              {store.debate ? truncate(store.debate.question, 80) : "Loading…"}
            </h1>
            {store.debate && (
              <p className="text-sm text-slate-500 mt-1 capitalize">
                {store.debate.mode.replace(/_/g, " ")} · {store.debate.category} · {store.debate.status}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-green-400" : "text-slate-500"}`}>
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isConnected ? "Live" : "Offline"}
            </div>
            {isComplete && store.debate && (
              <ExportReport
                debate={store.debate}
                messages={store.messages}
                scores={store.scores}
                verdict={store.verdict}
              />
            )}
          </div>
        </div>
        <DebateStage current={store.currentStage} />
      </div>

      {/* Main debate layout: messages + sidebar */}
      <div className="flex gap-6">
        {/* Messages */}
        <div className="flex-1 min-w-0">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="space-y-3 min-h-96 max-h-[calc(100vh-280px)] overflow-y-auto pr-2"
          >
            <AnimatePresence initial={false}>
              {store.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {!isComplete && store.messages.length === 0 && (
              <div className="flex items-center justify-center h-48">
                <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
                  <p className="text-slate-500 text-sm">Panel assembling…</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {store.debate && (
            <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
              <AudienceInput debateId={debateId} isComplete={isComplete} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 shrink-0 space-y-4">
          {store.debate && store.debate.panel.length > 0 && (
            <div className="glass rounded-xl p-4 overflow-hidden">
              <h3 className="text-sm font-semibold text-white mb-3">Expert Panel</h3>
              <div className="space-y-2">
                {store.debate.panel.map((agent) => (
                  <div key={agent.id} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-slate-400">{agent.role}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">{agent.bias}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Scoreboard scores={store.scores} />
        </div>
      </div>

      {/* Verdict loading skeleton */}
      {store.currentStage === "verdict" && !store.verdict && (
        <div className="border-t border-[#1e1e2e] pt-6">
          <div className="glass rounded-xl p-8 border border-violet-500/20">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-violet-500/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/10 animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold text-base">Deliberating…</p>
                <p className="text-slate-400 text-sm">The panel is synthesising the final verdict</p>
              </div>
              {/* Pulsing placeholder bars */}
              <div className="w-full max-w-md space-y-3 mt-2">
                {[80, 60, 72, 55].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded-full bg-violet-500/10 animate-pulse"
                    style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Verdict — full width below the debate */}
      {store.verdict && (
        <div className="border-t border-[#1e1e2e] pt-6">
          <FinalVerdict verdict={store.verdict} />
        </div>
      )}
    </div>
  );
}
