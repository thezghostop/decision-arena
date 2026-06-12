"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DebateMessage } from "@/types";

const FALLACY_COLORS: Record<string, string> = {
  high: "text-red-400 border-red-500/30 bg-red-500/10",
  medium: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  low: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
};

const FACT_COLORS: Record<string, string> = {
  verified: "text-green-400 border-green-500/30 bg-green-500/10",
  disputed: "text-red-400 border-red-500/30 bg-red-500/10",
  unverifiable: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

export function MessageBubble({ message }: { message: DebateMessage }) {
  if (message.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 py-2"
      >
        <div className="h-px bg-[#1e1e2e] flex-1" />
        <span className="text-xs text-slate-500 font-medium px-3 py-1 rounded-full border border-[#1e1e2e]">
          {message.content}
        </span>
        <div className="h-px bg-[#1e1e2e] flex-1" />
      </motion.div>
    );
  }

  if (message.role === "moderator") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 px-4 py-3 bg-violet-600/5 border-l-2 border-violet-500/50 rounded-r-xl"
      >
        <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-violet-400 font-medium mb-1">Moderator</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  if (message.role === "audience") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 px-4 py-3 bg-cyan-600/5 border-l-2 border-cyan-500/50 rounded-r-xl"
      >
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-cyan-400 font-medium mb-1">
            Audience Question
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="glass rounded-xl p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: message.agent_color ?? "#7c3aed" }}
          >
            {message.agent_name?.slice(0, 2).toUpperCase() ?? "AI"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-base leading-none">
              {message.agent_name}
            </p>
            {message.agent_title && (
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {message.agent_title}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <p
          className={cn(
            "text-base text-slate-300 leading-relaxed whitespace-pre-wrap",
            message.is_streaming && "streaming-cursor",
          )}
        >
          {message.content}
        </p>

        {/* Fallacies */}
        {message.fallacies && message.fallacies.length > 0 && (
          <div className="mt-3 space-y-1">
            {message.fallacies.map((f, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 text-xs px-3 py-2 rounded-lg border",
                  FALLACY_COLORS[f.severity],
                )}
              >
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  <strong>{f.type}:</strong> {f.description}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Fact tags */}
        {message.fact_tags && message.fact_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.fact_tags.map((tag, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded border",
                  FACT_COLORS[tag.verdict],
                )}
              >
                {tag.verdict === "verified" ? (
                  <CheckCircle className="w-3 h-3" />
                ) : tag.verdict === "disputed" ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <Info className="w-3 h-3" />
                )}
                <span className="truncate max-w-[200px]">{tag.claim}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
