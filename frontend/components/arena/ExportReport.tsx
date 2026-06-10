"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { exportDebateReport, setAuthToken } from "@/lib/api";

export function ExportReport({ debateId }: { debateId: string }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      setAuthToken(token);

      const downloadUrl = await exportDebateReport(debateId);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `decision-arena-${debateId}.pdf`;
      a.target = "_blank";
      a.click();
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export report");
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
