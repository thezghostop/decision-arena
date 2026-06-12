"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Trophy,
  Lightbulb,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/types";

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden flex-1">
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

function Section({
  icon,
  title,
  items,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  iconColor: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="glass rounded-xl p-5">
      <div className={cn("flex items-center gap-2 mb-3", iconColor)}>
        {icon}
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-slate-300 leading-snug"
          >
            <span className={cn("mt-1 shrink-0", iconColor)}>{icon}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FinalVerdict({ verdict }: { verdict: Verdict }) {
  const confidence =
    verdict.confidence_score ??
    (verdict.consensus_level ? verdict.consensus_level / 100 : 0);
  const confidencePct = Math.round(
    confidence > 1 ? confidence : confidence * 100,
  );

  const confidenceLabel =
    confidencePct >= 80
      ? "Strong Consensus"
      : confidencePct >= 60
        ? "Moderate Consensus"
        : confidencePct >= 40
          ? "Mixed Views"
          : "Deep Division";

  const summary = verdict.executive_summary ?? verdict.summary ?? "";
  const actions = verdict.recommended_actions ?? [];
  const risks = verdict.risks ?? verdict.key_risks ?? [];
  const opportunities =
    verdict.opportunities ?? verdict.key_opportunities ?? [];
  const heatmap = verdict.heatmap_data ?? [];
  const consensusAreas = verdict.consensus_areas ?? [];
  const disagreements = verdict.disagreements ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Header card */}
      <div className="glass rounded-xl p-6 border border-violet-500/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Final Verdict</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI Panel Deliberation Complete
              </p>
            </div>
          </div>
          <span
            className={cn(
              "text-xs px-3 py-1 rounded-full border font-medium shrink-0",
              confidencePct >= 60
                ? "text-green-400 border-green-500/30 bg-green-500/10"
                : "text-orange-400 border-orange-500/30 bg-orange-500/10",
            )}
          >
            {confidenceLabel}
          </span>
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Panel Confidence</span>
            <span className="font-medium text-slate-300">{confidencePct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Bar
              value={confidencePct}
              color={confidencePct >= 60 ? "bg-green-500" : "bg-orange-500"}
            />
          </div>
        </div>

        {summary && (
          <p className="text-base text-slate-300 leading-relaxed">{summary}</p>
        )}
      </div>

      {/* Top recommendation */}
      {actions.length > 0 && (
        <div className="glass rounded-xl p-5 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-3 text-violet-400">
            <Target className="w-4 h-4" />
            <h4 className="text-sm font-semibold text-white">
              Top Recommendation
            </h4>
          </div>
          <p className="text-base text-white font-medium leading-snug">
            {actions[0]}
          </p>
          {actions.length > 1 && (
            <ul className="mt-3 space-y-2 border-t border-[#1e1e2e] pt-3">
              {actions.slice(1).map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-400"
                >
                  <span className="text-violet-400 font-bold shrink-0">
                    {i + 2}.
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Opportunities & Risks — side by side */}
      <div className="grid grid-cols-2 gap-4">
        {opportunities.length > 0 && (
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <h4 className="text-sm font-semibold text-white">
                Opportunities
              </h4>
            </div>
            <ul className="space-y-2">
              {opportunities.map((o, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300 leading-snug"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-semibold text-white">Risks</h4>
            </div>
            <ul className="space-y-2">
              {risks.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-300 leading-snug"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Where panel agreed / disagreed */}
      {(consensusAreas.length > 0 || disagreements.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {consensusAreas.length > 0 && (
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-semibold text-white">
                  Panel Agreement
                </h4>
              </div>
              <ul className="space-y-2">
                {consensusAreas.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-300 leading-snug"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {disagreements.length > 0 && (
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-orange-400" />
                <h4 className="text-sm font-semibold text-white">
                  Key Disagreements
                </h4>
              </div>
              <ul className="space-y-2">
                {disagreements.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-300 leading-snug"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Decision factor bars */}
      {heatmap.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h4 className="text-sm font-semibold text-white mb-4">
            Decision Factors
          </h4>
          <div className="space-y-3">
            {heatmap.map((item, i) => {
              const color =
                item.category === "risk" || item.category === "cost"
                  ? "bg-red-500"
                  : item.category === "benefit" ||
                      item.category === "opportunity"
                    ? "bg-green-500"
                    : "bg-violet-500";
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="text-slate-400 font-medium">
                      {item.value}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bar value={item.value} color={color} />
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
