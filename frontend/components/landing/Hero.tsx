"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDebateStore } from "@/store/debateStore";
import { classifyQuestion } from "@/lib/api";
import { ArrowRight, Zap, Sparkles } from "lucide-react";
import type { DebateMode } from "@/types";

const EXAMPLE_QUESTIONS = [
  "Should I start a SaaS startup or take a corporate job?",
  "Should India adopt a Universal Basic Income?",
  "Should we use React or Angular for our new platform?",
  "Should I pursue a PhD or join the industry?",
  "Should our company go remote-first permanently?",
];

const MODES: { key: DebateMode; label: string; icon: string; desc: string; color: string }[] = [
  {
    key: "standard",
    label: "Standard Debate",
    icon: "⚖️",
    desc: "Expert panel debates your decision",
    color: "#7C3AED",
  },
  {
    key: "boardroom",
    label: "Boardroom",
    icon: "🏢",
    desc: "You're the CEO. Execs challenge you.",
    color: "#2563EB",
  },
  {
    key: "shark_tank",
    label: "Shark Tank",
    icon: "🦈",
    desc: "AI investors evaluate your startup",
    color: "#06B6D4",
  },
  {
    key: "policy",
    label: "Policy Arena",
    icon: "🏛️",
    desc: "Economists & politicians debate policy",
    color: "#10B981",
  },
];

export function Hero() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [selectedMode, setSelectedMode] = useState<DebateMode>("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    setQuestion: storeSetQuestion,
    setMode,
    setPanel,
    setCategory,
    setIsClassifying,
  } = useDebateStore();

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;
    setIsLoading(true);

    try {
      storeSetQuestion(question.trim());
      setMode(selectedMode);
      setIsClassifying(true);

      const result = await classifyQuestion(question.trim(), selectedMode);
      setCategory(result.category);
      setPanel(result.suggestedPanel);

      router.push("/arena");
    } catch (err) {
      console.error("Classification failed:", err);
      // Still navigate — arena page will handle retry
      router.push("/arena");
    } finally {
      setIsLoading(false);
      setIsClassifying(false);
    }
  };

  const useExample = () => {
    const next = EXAMPLE_QUESTIONS[exampleIdx % EXAMPLE_QUESTIONS.length];
    setQuestion(next);
    setExampleIdx((i) => i + 1);
    inputRef.current?.focus();
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
      {/* Main headline */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12 max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-arena-purple font-medium mb-6 border border-arena-purple/30">
          <Sparkles className="w-3 h-3" />
          Powered by Groq · Multi-Agent Debate Engine
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          <span className="text-white">Don&apos;t just decide.</span>
          <br />
          <span className="text-gradient">Decide better.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Convene an AI council of expert agents who debate, challenge, and
          stress-test your most important decisions — uncovering blind spots
          you never knew existed.
        </p>
      </motion.div>

      {/* Mode selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl"
      >
        {MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => setSelectedMode(mode.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
              selectedMode === mode.key
                ? "border-opacity-100 text-white"
                : "border-white/10 text-slate-400 hover:text-white hover:border-white/20 bg-white/[0.03]"
            }`}
            style={
              selectedMode === mode.key
                ? {
                    borderColor: mode.color,
                    background: `${mode.color}18`,
                    color: mode.color,
                    boxShadow: `0 0 12px ${mode.color}30`,
                  }
                : undefined
            }
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Question input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-strong rounded-2xl p-1.5 glow-purple">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder={`Enter your decision question... (e.g. "${EXAMPLE_QUESTIONS[0]}")`}
              className="w-full bg-transparent text-white placeholder:text-slate-500 text-base resize-none outline-none p-4 pb-16 min-h-[100px] max-h-[200px]"
              rows={3}
            />
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <button
                onClick={useExample}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Try an example
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!question.trim() || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                  boxShadow: question.trim() ? "0 0 20px rgba(124,58,237,0.4)" : "none",
                }}
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Summoning panel…
                  </>
                ) : (
                  <>
                    Enter the Arena
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-600 mt-3">
          Press Enter to submit · Shift+Enter for new line
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="flex items-center gap-8 mt-16 text-center"
      >
        {[
          { label: "Expert Agents", value: "14+" },
          { label: "Debate Modes", value: "4" },
          { label: "Logical Fallacies Detected", value: "8 types" },
          { label: "Decision Categories", value: "6" },
        ].map((stat) => (
          <div key={stat.label} className="hidden md:block">
            <p className="text-2xl font-bold text-gradient-gold">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
