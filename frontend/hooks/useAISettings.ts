"use client";

import { useState, useEffect, useCallback } from "react";

export type AIProvider = "server" | "ollama" | "groq" | "openai" | "gemini";

export interface OllamaModel {
  name: string;
  size: number;
  parameter_size: string;
}

export interface AISettings {
  provider: AIProvider;
  // Ollama
  ollamaBaseUrl: string;
  ollamaModel: string;
  // Cloud BYOK
  apiKey: string;
  groqModel: string;
}

const STORAGE_KEY = "da_ai_settings";

const DEFAULTS: AISettings = {
  provider: "server",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "",
  apiKey: "",
  groqModel: "llama-3.1-8b-instant",
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULTS);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const save = useCallback((patch: Partial<AISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Fetch models directly from the local Ollama daemon. */
  const fetchOllamaModels = useCallback(async (baseUrl?: string) => {
    const url = (baseUrl ?? settings.ollamaBaseUrl).replace(/\/$/, "");
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models: OllamaModel[] = (data.models ?? []).map((m: any) => ({
        name: m.name,
        size: m.size ?? 0,
        parameter_size: m.details?.parameter_size ?? "",
      }));
      setOllamaModels(models);
      // Auto-select first model if none chosen
      setSettings((prev) => {
        if (!prev.ollamaModel && models.length > 0) {
          const next = { ...prev, ollamaModel: models[0].name };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    } catch (err: any) {
      setOllamaError(
        err?.name === "TimeoutError"
          ? "Ollama not reachable — is it running?"
          : String(err?.message ?? err)
      );
    } finally {
      setOllamaLoading(false);
    }
  }, [settings.ollamaBaseUrl]);

  /** Build the payload to attach to debate creation requests. */
  const toLLMConfig = useCallback(() => {
    if (settings.provider === "server") return undefined;
    return {
      provider: settings.provider,
      api_key: settings.provider !== "ollama" ? settings.apiKey || undefined : undefined,
      ollama_base_url: settings.provider === "ollama" ? settings.ollamaBaseUrl : undefined,
      ollama_model: settings.provider === "ollama" ? settings.ollamaModel : undefined,
      groq_model: settings.provider === "groq" ? settings.groqModel : undefined,
    };
  }, [settings]);

  return {
    settings,
    save,
    ollamaModels,
    ollamaLoading,
    ollamaError,
    fetchOllamaModels,
    toLLMConfig,
  };
}
