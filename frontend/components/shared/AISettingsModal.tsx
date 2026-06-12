"use client";

import { useEffect, useRef, useState } from "react";
import { X, RefreshCw, Check, AlertCircle, Cpu, Cloud, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAISettings,
  type AIProvider,
  type AISettings,
  type OllamaModel,
} from "@/hooks/useAISettings";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: AIProvider; label: string; desc: string; icon: "local" | "cloud" }[] = [
  { id: "server",  label: "Server Default",  desc: "Use whatever the server is configured with", icon: "cloud" },
  { id: "ollama",  label: "Ollama (local)",   desc: "Run models privately on your machine",       icon: "local" },
  { id: "groq",    label: "Groq  (BYOK)",     desc: "Blazing-fast cloud inference, your key",     icon: "cloud" },
  { id: "openai",  label: "OpenAI (BYOK)",    desc: "GPT-4o with your own API key",               icon: "cloud" },
  { id: "gemini",  label: "Gemini (BYOK)",    desc: "Google Gemini 2.5 Flash, your key",          icon: "cloud" },
];

const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

export function AISettingsModal({ open, onClose }: Props) {
  const { settings, save, ollamaModels, ollamaLoading, ollamaError, fetchOllamaModels } =
    useAISettings();

  const [local, setLocal] = useState<AISettings>(settings);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync when modal opens
  useEffect(() => {
    if (open) {
      setLocal(settings);
      setSaved(false);
      if (settings.provider === "ollama") fetchOllamaModels(settings.ollamaBaseUrl);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<AISettings>) => setLocal((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    save(local);
    setSaved(true);
    setTimeout(onClose, 800);
  };

  const handleProviderChange = (p: AIProvider) => {
    patch({ provider: p });
    if (p === "ollama") fetchOllamaModels(local.ollamaBaseUrl);
  };

  const handleRefreshOllama = () => fetchOllamaModels(local.ollamaBaseUrl);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2a2a3e] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-violet-400" />
            <h2 className="text-white font-semibold text-base">AI Provider</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Provider picker */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Choose Provider</p>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                    local.provider === p.id
                      ? "border-violet-500 bg-violet-600/10"
                      : "border-[#2a2a3e] bg-[#111118] hover:border-violet-500/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    p.icon === "local" ? "bg-emerald-500/15" : "bg-violet-500/15"
                  )}>
                    {p.icon === "local"
                      ? <Cpu className="w-4 h-4 text-emerald-400" />
                      : <Cloud className="w-4 h-4 text-violet-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{p.label}</div>
                    <div className="text-xs text-slate-400 truncate">{p.desc}</div>
                  </div>
                  {local.provider === p.id && (
                    <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ollama config */}
          {local.provider === "ollama" && (
            <div className="space-y-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Ollama URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={local.ollamaBaseUrl}
                    onChange={(e) => patch({ ollamaBaseUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="flex-1 bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    onClick={handleRefreshOllama}
                    disabled={ollamaLoading}
                    title="Fetch available models"
                    className="px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3e] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", ollamaLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              {ollamaError && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {ollamaError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Model
                  {ollamaModels.length > 0 && (
                    <span className="ml-2 text-emerald-400">({ollamaModels.length} available)</span>
                  )}
                </label>
                {ollamaModels.length > 0 ? (
                  <div className="relative">
                    <select
                      value={local.ollamaModel}
                      onChange={(e) => patch({ ollamaModel: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60 appearance-none pr-8"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                          {m.parameter_size ? ` · ${m.parameter_size}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={local.ollamaModel}
                    onChange={(e) => patch({ ollamaModel: e.target.value })}
                    placeholder="e.g. qwen2.5:14b  (click ↻ to list)"
                    className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                  />
                )}
              </div>
            </div>
          )}

          {/* Cloud BYOK config */}
          {["groq", "openai", "gemini"].includes(local.provider) && (
            <div className="space-y-4 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
              {local.provider === "groq" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Groq Model</label>
                  <div className="relative">
                    <select
                      value={local.groqModel}
                      onChange={(e) => patch({ groqModel: e.target.value })}
                      className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60 appearance-none pr-8"
                    >
                      {GROQ_MODELS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  {local.provider === "groq" ? "Groq" : local.provider === "openai" ? "OpenAI" : "Gemini"} API Key
                </label>
                <input
                  type="password"
                  value={local.apiKey}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                  placeholder={
                    local.provider === "groq"
                      ? "gsk_..."
                      : local.provider === "openai"
                      ? "sk-..."
                      : "AIza..."
                  }
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 font-mono"
                />
                <p className="text-xs text-slate-500">Stored locally in your browser — never sent to our servers except to run your debates.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e2e] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all",
              saved
                ? "bg-emerald-600 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white"
            )}
          >
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
