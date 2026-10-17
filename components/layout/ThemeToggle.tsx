"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? t(isDark ? "Switch to light mode" : "Switch to dark mode") : t("Toggle theme")}
      aria-pressed={mounted ? isDark : undefined}
      title={mounted ? t(isDark ? "Light mode" : "Dark mode") : t("Theme")}
      suppressHydrationWarning
      className={`inline-flex items-center justify-center w-11 h-11 text-on-surface hover:text-secondary transition-colors ${className}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }} suppressHydrationWarning>
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
