"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-2 rounded-lg transition-colors"
        style={{
          color: "var(--kipu-muted)",
          background: "transparent",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kipu-border)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
      style={{ color: "var(--kipu-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--kipu-text)";
        e.currentTarget.style.background = "var(--kipu-border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--kipu-muted)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}