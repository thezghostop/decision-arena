"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Brain, Users, Zap, Shield, Loader2, ArrowRight } from "lucide-react";
import { createDebate, setAuthToken, healthCheck } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAISettings } from "@/hooks/useAISettings";
import type { DebateMode } from "@/types";

export function ArenaSetup() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useI18n();
  const { toLLMConfig, settings } = useAISettings();
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<DebateMode>("standard");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  // Ping backend on mount so Render wakes up before the user hits Submit
  useEffect(() => { healthCheck(); }, []);

  const MODES: {
    id: DebateMode;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
  }[] = [
    {
      id: "standard",
      title: t("arena_modes.standard.title"),
      description: t("arena_modes.standard.description"),
      icon: Brain,
      color: "from-violet-600 to-purple-600",
    },
    {
      id: "boardroom",
      title: t("arena_modes.boardroom.title"),
      description: t("arena_modes.boardroom.description"),
      icon: Users,
      color: "from-blue-600 to-cyan-600",
    },
    {
      id: "shark_tank",
      title: t("arena_modes.shark_tank.title"),
      description: t("arena_modes.shark_tank.description"),
      icon: Zap,
      color: "from-orange-600 to-amber-600",
    },
    {
      id: "policy",
      title: t("arena_modes.policy.title"),
      description: t("arena_modes.policy.description"),
      icon: Shield,
      color: "from-green-600 to-emerald-600",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      toast.error(t("arena_setup.error_min_chars"));
      return;
    }

    setLoading(true);
    setLoadingStep(t("arena_setup.classifying"));
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      setAuthToken(token);

      setLoadingStep(t("arena_setup.assembling"));
      const debate = await createDebate({ question: question.trim(), mode, llm_config: toLLMConfig() });

      router.push(`/arena/${debate.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to start debate";
      toast.error(msg.includes("422") ? "Backend validation error — check backend logs" : msg);
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("arena_setup.title")}</h1>
        <p className="text-slate-400">{t("arena_setup.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("arena_setup.question_label")} <span className="text-red-400">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("arena_setup.question_placeholder")}
            rows={4}
            className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
            maxLength={1000}
          />
          <div className="flex justify-between mt-1">
            <span className={`text-xs ${question.length < 10 && question.length > 0 ? "text-red-400" : "text-slate-500"}`}>
              {question.length < 10 && question.length > 0
                ? t("arena_setup.chars_needed", { n: 10 - question.length })
                : ""}
            </span>
            <span className="text-xs text-slate-500">{question.length}/1000</span>
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            {t("arena_setup.mode_label")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === m.id
                    ? "border-violet-500 bg-violet-600/10"
                    : "border-[#1e1e2e] hover:border-violet-500/30 bg-[#111118]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-2`}
                >
                  <m.icon className="w-4 h-4 text-white" />
                </div>
                <p className="font-medium text-white text-sm">{m.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || question.trim().length < 10}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 glow-accent"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {loadingStep}
            </>
          ) : (
            <>
              {t("arena_setup.submit")} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
