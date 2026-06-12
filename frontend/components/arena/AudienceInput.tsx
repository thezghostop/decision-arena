"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { injectAudienceQuestion, setAuthToken } from "@/lib/api";
import { wsManager } from "@/lib/websocket";
import { useI18n } from "@/lib/i18n";

interface AudienceInputProps {
  debateId: string;
  isComplete?: boolean;
  onSent?: () => void;
}

export function AudienceInput({ debateId, isComplete, onSent }: AudienceInputProps) {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    try {
      if (isComplete) {
        // For completed debates: send directly over the open Q&A WS
        wsManager.send({ type: "inject", question: q });
        toast.success("Question sent to the panel");
      } else {
        // For live debates: use REST inject endpoint (orchestrator is in memory)
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        setAuthToken(token);
        await injectAudienceQuestion({ debate_id: debateId, question: q });
        toast.success("Question injected into the debate");
      }
      setQuestion("");
      setOpen(false);
      onSent?.();
    } catch {
      toast.error("Failed to send question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        {isComplete ? t("audience.submit") + " follow-up" : t("audience.placeholder")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mt-3 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("audience.placeholder")}
                className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                maxLength={500}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
