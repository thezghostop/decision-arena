"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import kn from "@/messages/kn.json";

export type Locale = "en" | "hi" | "kn";

const messages: Record<Locale, Record<string, unknown>> = { en, hi, kn };

export const LOCALES: { code: Locale; label: string; script: string }[] = [
  { code: "en", label: "English", script: "EN" },
  { code: "hi", label: "हिन्दी", script: "हि" },
  { code: "kn", label: "ಕನ್ನಡ", script: "ಕ" },
];

// Deep get a value from a nested object by dot-notation key
function deepGet(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "da_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && saved in messages) setLocaleState(saved);
    } catch {
      // localStorage unavailable (SSR/private)
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let str = deepGet(messages[locale] as Record<string, unknown>, key);
      // Fall back to English if missing
      if (str === key)
        str = deepGet(messages.en as Record<string, unknown>, key);
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
