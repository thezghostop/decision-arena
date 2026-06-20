"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { listExperts } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AgentConfig, DebateCategory } from "@/types";

const ICON_PRESETS = ["🧑‍💼", "🧑‍🔬", "🧑‍🎓", "🧑‍⚕️", "🧑‍🍳", "🧑‍🌾", "🧑‍🎨", "🦉", "🦊", "⭐", "💡", "🔥"];
const COLOR_PRESETS = ["#7C3AED", "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"];
const MIN_PANEL = 2;
const MAX_PANEL = 6;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "expert";
}

interface PanelEditorProps {
  category: DebateCategory;
  suggestedPanel: AgentConfig[];
  onConfirm: (panel: AgentConfig[]) => void;
  onBack: () => void;
  loading?: boolean;
}

export function PanelEditor({ category, suggestedPanel, onConfirm, onBack, loading }: PanelEditorProps) {
  const { t } = useI18n();
  const [panel, setPanel] = useState<AgentConfig[]>(suggestedPanel);
  const [library, setLibrary] = useState<AgentConfig[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [slotIndex, setSlotIndex] = useState<number | "add" | null>(null);
  const [tab, setTab] = useState<"library" | "custom">("library");
  const [error, setError] = useState("");

  // Custom persona form state
  const [cName, setCName] = useState("");
  const [cRole, setCRole] = useState("");
  const [cBias, setCBias] = useState("");
  const [cStyle, setCStyle] = useState("");
  const [cDomains, setCDomains] = useState("");
  const [cIcon, setCIcon] = useState(ICON_PRESETS[0]);
  const [cColor, setCColor] = useState(COLOR_PRESETS[0]);

  useEffect(() => {
    listExperts()
      .then(setLibrary)
      .catch(() => toast.error(t("panel_editor.library_error")))
      .finally(() => setLibraryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCustomForm = () => {
    setCName("");
    setCRole("");
    setCBias("");
    setCStyle("");
    setCDomains("");
    setCIcon(ICON_PRESETS[0]);
    setCColor(COLOR_PRESETS[0]);
  };

  const openSlot = (idx: number | "add") => {
    setSlotIndex(idx);
    setTab("library");
    setError("");
    resetCustomForm();
  };

  const closeSlot = () => {
    setSlotIndex(null);
    setError("");
  };

  const applyAgent = (agent: AgentConfig) => {
    if (slotIndex === null) return;
    const replacingId = slotIndex !== "add" ? panel[slotIndex]?.id : null;
    if (panel.some((a) => a.id === agent.id && a.id !== replacingId)) {
      setError(t("panel_editor.error_duplicate"));
      return;
    }
    if (slotIndex === "add") {
      setPanel((p) => [...p, agent]);
    } else {
      setPanel((p) => p.map((a, i) => (i === slotIndex ? agent : a)));
    }
    closeSlot();
  };

  const handleSubmitCustom = () => {
    if (cName.trim().length < 2 || cRole.trim().length < 2 || cBias.trim().length < 10) {
      setError(t("panel_editor.error_custom_required"));
      return;
    }
    const domains = cDomains
      .split(",")
      .map((d) => d.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 8);
    const agent: AgentConfig = {
      // Backend AgentConfig.id caps at 64 chars ("custom_" + slug + "_xxxx" = 12 char overhead).
      id: `custom_${slugify(cName).slice(0, 52)}_${Math.random().toString(36).slice(2, 6)}`,
      name: cName.trim().slice(0, 80),
      role: cRole.trim().slice(0, 80),
      icon: cIcon,
      color: cColor,
      bias: cBias.trim().slice(0, 300),
      communication_style: (cStyle.trim() || "balanced").slice(0, 60),
      expertise_domains: domains.length > 0 ? domains : [cRole.trim().slice(0, 40) || "general"],
      is_custom: true,
    };
    applyAgent(agent);
  };

  const removeAgent = (idx: number) => {
    if (panel.length <= MIN_PANEL) {
      setError(t("panel_editor.error_min", { n: MIN_PANEL }));
      return;
    }
    setPanel((p) => p.filter((_, i) => i !== idx));
  };

  const handleConfirm = () => {
    if (panel.length < MIN_PANEL || panel.length > MAX_PANEL) return;
    onConfirm(panel);
  };

  const availableLibrary = library.filter((e) => !panel.some((p) => p.id === e.id));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("panel_editor.title")}</h1>
        <p className="text-slate-400">{t("panel_editor.subtitle")}</p>
        <p className="text-xs text-violet-400 mt-1">{t("panel_editor.category_label", { category })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {panel.map((agent, idx) => (
          <div key={agent.id} className="p-4 rounded-xl border border-[#1e1e2e] bg-[#111118] relative">
            <button
              type="button"
              onClick={() => removeAgent(idx)}
              className="absolute top-2 right-2 text-slate-500 hover:text-red-400 transition-colors"
              aria-label={t("panel_editor.remove")}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: `${agent.color}26` }}
              >
                {agent.icon}
              </div>
              <div>
                <p className="font-medium text-white text-sm">{agent.name}</p>
                <p className="text-xs text-slate-400">
                  {agent.role}
                  {agent.is_custom && (
                    <span className="ml-1.5 text-[10px] text-violet-400 align-middle">
                      {t("panel_editor.custom_badge")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{agent.bias}</p>
            <button
              type="button"
              onClick={() => openSlot(idx)}
              className="w-full text-xs py-1.5 rounded-lg border border-[#1e1e2e] hover:border-violet-500/40 text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> {t("panel_editor.swap")}
            </button>
          </div>
        ))}

        {panel.length < MAX_PANEL && (
          <button
            type="button"
            onClick={() => openSlot("add")}
            className="p-4 rounded-xl border border-dashed border-[#1e1e2e] hover:border-violet-500/40 text-slate-400 hover:text-violet-300 flex flex-col items-center justify-center gap-1.5 min-h-[132px] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">{t("panel_editor.add_expert")}</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {t("panel_editor.size_hint", { min: MIN_PANEL, max: MAX_PANEL, n: panel.length })}
      </p>

      <AnimatePresence>
        {slotIndex !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-600/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("library")}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      tab === "library" ? "bg-violet-600 text-white" : "bg-[#1e1e2e] text-slate-400"
                    }`}
                  >
                    {t("panel_editor.tab_library")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("custom")}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      tab === "custom" ? "bg-violet-600 text-white" : "bg-[#1e1e2e] text-slate-400"
                    }`}
                  >
                    {t("panel_editor.tab_custom")}
                  </button>
                </div>
                <button type="button" onClick={closeSlot} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              {tab === "library" ? (
                libraryLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("panel_editor.loading_library")}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                    {availableLibrary.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => applyAgent(e)}
                        className="p-3 rounded-lg border border-[#1e1e2e] hover:border-violet-500/40 bg-[#0b0b11] text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{e.icon}</span>
                          <span className="text-xs font-medium text-white">{e.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{e.role}</p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder={t("panel_editor.custom_name_placeholder")}
                      maxLength={80}
                      className="bg-[#0b0b11] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                    <input
                      value={cRole}
                      onChange={(e) => setCRole(e.target.value)}
                      placeholder={t("panel_editor.custom_role_placeholder")}
                      maxLength={80}
                      className="bg-[#0b0b11] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <textarea
                    value={cBias}
                    onChange={(e) => setCBias(e.target.value)}
                    placeholder={t("panel_editor.custom_bias_placeholder")}
                    rows={2}
                    maxLength={300}
                    className="w-full bg-[#0b0b11] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={cStyle}
                      onChange={(e) => setCStyle(e.target.value)}
                      placeholder={t("panel_editor.custom_style_placeholder")}
                      maxLength={60}
                      className="bg-[#0b0b11] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                    <input
                      value={cDomains}
                      onChange={(e) => setCDomains(e.target.value)}
                      placeholder={t("panel_editor.custom_domains_placeholder")}
                      maxLength={200}
                      className="bg-[#0b0b11] border border-[#1e1e2e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1">
                      {ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setCIcon(icon)}
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-sm border ${
                            cIcon === icon ? "border-violet-500 bg-violet-600/20" : "border-[#1e1e2e]"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${cColor === color ? "border-white" : "border-transparent"}`}
                          style={{ backgroundColor: color }}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitCustom}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {t("panel_editor.custom_add")}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-[#1e1e2e] hover:border-violet-500/30 text-slate-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("panel_editor.back")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || panel.length < MIN_PANEL || panel.length > MAX_PANEL}
          className="flex-[2] py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 glow-accent transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {t("panel_editor.creating")}
            </>
          ) : (
            <>
              {t("panel_editor.confirm")} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
