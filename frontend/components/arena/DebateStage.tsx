"use client";

import { cn, getStageLabel, getStageIndex } from "@/lib/utils";
import type { DebateStageType } from "@/types";

const STAGES: DebateStageType[] = [
  "opening",
  "cross_examination",
  "challenges",
  "audience_intervention",
  "rebuttals",
  "closing",
  "verdict",
];

export function DebateStage({ current }: { current: DebateStageType | null }) {
  const currentIndex = current ? getStageIndex(current) : -1;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={stage} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-all",
                isCurrent &&
                  "bg-violet-600/20 text-violet-300 border border-violet-500/30",
                isCompleted && "text-slate-500",
                !isCurrent && !isCompleted && "text-slate-600"
              )}
            >
              {getStageLabel(stage)}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "w-4 h-px",
                  i < currentIndex ? "bg-violet-500/40" : "bg-[#1e1e2e]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
