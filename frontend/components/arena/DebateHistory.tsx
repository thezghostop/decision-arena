"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { listDebates, setAuthToken } from "@/lib/api";
import { useDebateStore } from "@/store/debateStore";
import { Loader2, Clock, CheckCircle, ArrowRight, Brain } from "lucide-react";

const STATUS_STYLES = {
  completed: "text-green-400 bg-green-500/10 border-green-500/30",
  running: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  error: "text-red-400 bg-red-500/10 border-red-500/30",
};

export function DebateHistory() {
  const { getToken } = useAuth();
  const { debates, setDebates, isLoading, setLoading } = useDebateStore();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        setAuthToken(token);
        const data = await listDebates();
        if (mounted) setDebates(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Debates</h1>
          <p className="text-slate-400 mt-1">Your decision history</p>
        </div>
        <Link
          href="/arena"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition-colors"
        >
          New Debate <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : debates.length === 0 ? (
        <div className="text-center py-20 glass rounded-xl">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No debates yet</p>
          <Link
            href="/arena"
            className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
          >
            Start your first debate →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {debates.map((debate, i) => (
            <motion.div
              key={debate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/arena/${debate.id}`}>
                <div className="glass rounded-xl p-5 hover:border-violet-500/30 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
                        {debate.question}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500 capitalize flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(debate.created_at)}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {debate.mode.replace(/_/g, " ")}
                        </span>
                        {debate.panel.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {debate.panel.length} experts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${
                          STATUS_STYLES[debate.status] ?? STATUS_STYLES.pending
                        }`}
                      >
                        {debate.status === "completed" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {debate.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </div>
                  {debate.verdict && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-1 border-t border-[#1e1e2e] pt-2">
                      Verdict: {debate.verdict.recommendation}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
