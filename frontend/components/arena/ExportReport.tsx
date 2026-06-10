"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import type { Debate, DebateMessage, AgentScore, Verdict } from "@/types";

interface ExportReportProps {
  debate: Debate;
  messages: DebateMessage[];
  scores: AgentScore[];
  verdict: Verdict | null;
}

export function ExportReport({ debate, messages, scores, verdict }: ExportReportProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210;
      const margin = 15;
      const maxW = W - margin * 2;
      let y = margin;

      const addPage = () => { doc.addPage(); y = margin; };

      const write = (
        text: string,
        size: number,
        bold = false,
        rgb: [number, number, number] = [30, 30, 30]
      ) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(...rgb);
        const lines = doc.splitTextToSize(text, maxW) as string[];
        const h = lines.length * size * 0.38 + 1.5;
        if (y + h > 285) addPage();
        doc.text(lines, margin, y);
        y += h;
      };

      const hr = () => {
        if (y + 4 > 285) addPage();
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y + 1, W - margin, y + 1);
        y += 5;
      };

      const section = (title: string) => {
        y += 2;
        write(title, 13, true, [124, 58, 237]);
        y += 1;
      };

      // ── Header ──────────────────────────────────────────────────────────────
      write("Decision Arena — Debate Report", 20, true, [124, 58, 237]);
      y += 2;
      write(debate.question, 13, true);
      y += 1;
      write(
        `Category: ${debate.category}  ·  Mode: ${debate.mode.replace(/_/g, " ")}  ·  Status: ${debate.status}`,
        9, false, [120, 120, 120]
      );
      write(`Generated: ${new Date().toLocaleString()}`, 9, false, [160, 160, 160]);
      y += 2;
      hr();

      // ── Expert Panel ────────────────────────────────────────────────────────
      section("Expert Panel");
      for (const a of debate.panel) {
        write(`${a.icon ?? "•"}  ${a.name} — ${a.role}`, 10);
        write(`   Bias: ${a.bias}`, 9, false, [100, 100, 100]);
        y += 0.5;
      }
      hr();

      // ── Scoreboard ──────────────────────────────────────────────────────────
      if (scores.length > 0) {
        section("Scoreboard");
        for (const s of scores) {
          write(
            `${s.agent_name}  —  Overall: ${s.overall?.toFixed(0) ?? "–"}/100`,
            10, true
          );
          write(
            `  Logic: ${s.logic?.toFixed(0) ?? "–"}  ·  Evidence: ${s.evidence?.toFixed(0) ?? "–"}  ·  Practicality: ${s.practicality?.toFixed(0) ?? "–"}  ·  Risk: ${s.risk_awareness?.toFixed(0) ?? "–"}  ·  Long-term: ${s.longterm_thinking?.toFixed(0) ?? "–"}  ·  Persuasion: ${s.persuasiveness?.toFixed(0) ?? "–"}`,
            9, false, [100, 100, 100]
          );
          y += 1;
        }
        hr();
      }

      // ── Verdict ─────────────────────────────────────────────────────────────
      if (verdict) {
        section("Final Verdict");
        if (verdict.executive_summary) {
          write(verdict.executive_summary, 10);
          y += 2;
        }
        if (verdict.confidence_score != null) {
          write(`Confidence Score: ${(verdict.confidence_score * 100).toFixed(0)}%`, 10, true);
          y += 2;
        }
        if (verdict.recommended_actions?.length) {
          write("Recommended Actions", 11, true);
          verdict.recommended_actions.forEach(a => write(`  • ${a}`, 9));
          y += 2;
        }
        if (verdict.consensus_areas?.length) {
          write("Consensus Areas", 11, true);
          verdict.consensus_areas.forEach(a => write(`  • ${a}`, 9));
          y += 2;
        }
        if (verdict.risks?.length) {
          write("Key Risks", 11, true, [200, 60, 60]);
          verdict.risks.forEach(r => write(`  • ${r}`, 9));
          y += 2;
        }
        if (verdict.opportunities?.length) {
          write("Opportunities", 11, true, [37, 99, 235]);
          verdict.opportunities.forEach(o => write(`  • ${o}`, 9));
          y += 2;
        }
        if (verdict.disagreements?.length) {
          write("Disagreements", 11, true);
          verdict.disagreements.forEach(d => write(`  • ${d}`, 9));
          y += 2;
        }
        hr();
      }

      // ── Transcript ──────────────────────────────────────────────────────────
      section("Debate Transcript");
      for (const msg of messages) {
        const name = msg.agent_name ?? "Unknown";
        const stage = msg.stage ? msg.stage.replace(/_/g, " ") : "";
        write(`${name}  [${stage}]`, 10, true, [80, 50, 180]);
        write(msg.content.slice(0, 1000), 9);
        y += 1.5;
      }

      doc.save(`decision-arena-${debate.id.slice(0, 8)}.pdf`);
      toast.success("PDF downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-[#111118] hover:bg-[#1a1a2e] border border-[#1e1e2e] text-slate-300 hover:text-white text-sm rounded-xl transition-all disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Export PDF
    </button>
  );
}
