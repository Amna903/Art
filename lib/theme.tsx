"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

type Ctx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "nuart-theme";

function readInitial(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-swapping");
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {}
  window.setTimeout(() => {
    root.classList.remove("theme-swapping");
  }, 320);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readInitial());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "light", toggle: () => {}, setTheme: () => {} };
  return ctx;
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s? s==='dark' : m;var r=document.documentElement;r.classList.toggle('dark', d);r.style.colorScheme = d ? 'dark' : 'light';}catch(e){}})();`;
