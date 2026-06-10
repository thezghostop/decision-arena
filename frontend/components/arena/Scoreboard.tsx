"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import type { AgentScore } from "@/types";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className={getScoreColor(pct)}>{pct}</span>
      </div>
      <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-violet-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function Scoreboard({ scores }: { scores: AgentScore[] }) {
  if (scores.length === 0) return null;

  const sorted = [...scores].sort((a, b) => b.overall - a.overall);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Live Scores</h3>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {sorted.map((score, i) => (
            <motion.div
              key={score.agent_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {score.agent_color && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: score.agent_color }}
                    />
                  )}
                  <span className="text-sm font-medium text-slate-300 truncate">
                    {score.agent_name}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-bold ml-2 shrink-0",
                    getScoreColor(score.overall)
                  )}
                >
                  {Math.round(score.overall)}
                </span>
              </div>
              <div className="space-y-1">
                <ScoreBar label="Logic" value={score.logic} />
                <ScoreBar label="Evidence" value={score.evidence} />
                <ScoreBar label="Persuasion" value={score.persuasiveness} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
