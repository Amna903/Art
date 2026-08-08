"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      aria-pressed={mounted ? isDark : undefined}
      title={mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
      suppressHydrationWarning
      className={`inline-flex items-center justify-center w-11 h-11 text-on-surface hover:text-secondary transition-colors ${className}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }} suppressHydrationWarning>
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
