import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    opening: "Opening Statements",
    cross_examination: "Cross-Examination",
    challenges: "Challenges",
    audience_intervention: "Audience Intervention",
    rebuttals: "Rebuttals",
    closing: "Closing Statements",
    verdict: "Final Verdict",
  };
  return labels[stage] ?? stage;
}

export function getStageIndex(stage: string): number {
  const stages = [
    "opening",
    "cross_examination",
    "challenges",
    "audience_intervention",
    "rebuttals",
    "closing",
    "verdict",
  ];
  return stages.indexOf(stage);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
