"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/types";

function getHeatColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-green-400/70";
  if (score >= 40) return "bg-yellow-500/70";
  if (score >= 20) return "bg-orange-500/70";
  return "bg-red-500/70";
}

export function DecisionHeatmap({ cells }: { cells: HeatmapCell[] }) {
  if (cells.length === 0) return null;

  const aspects = [...new Set(cells.map((c) => c.aspect))];
  const agents = [...new Set(cells.map((c) => c.agent_name))];

  const getCell = (aspect: string, agentName: string) =>
    cells.find((c) => c.aspect === aspect && c.agent_name === agentName);

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">
        Decision Heatmap
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-slate-500 font-medium pb-2 pr-4 w-32">
                Aspect
              </th>
              {agents.map((agent) => (
                <th
                  key={agent}
                  className="text-center text-slate-400 font-medium pb-2 px-2"
                >
                  <div className="truncate max-w-[80px] mx-auto">{agent}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {aspects.map((aspect) => (
              <tr key={aspect}>
                <td className="text-slate-400 py-1 pr-4 font-medium">
                  {aspect}
                </td>
                {agents.map((agent) => {
                  const cell = getCell(aspect, agent);
                  const score = cell?.score ?? 0;
                  return (
                    <td key={agent} className="py-1 px-2 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "w-8 h-8 rounded-md mx-auto flex items-center justify-center text-white font-bold text-xs",
                          getHeatColor(score),
                        )}
                        title={`${aspect} / ${agent}: ${score}`}
                      >
                        {score}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-slate-500">Score:</span>
        {[
          { label: "0-20", color: "bg-red-500/70" },
          { label: "20-40", color: "bg-orange-500/70" },
          { label: "40-60", color: "bg-yellow-500/70" },
          { label: "60-80", color: "bg-green-400/70" },
          { label: "80+", color: "bg-green-500" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", color)} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
