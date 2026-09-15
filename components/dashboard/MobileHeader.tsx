"use client";

import Image from "next/image";
import { Menu, Bell } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface MobileHeaderProps {
  mounted: boolean;
  resolvedTheme?: string;
  noLeidas: number;
  onOpenSidebar: () => void;
  onOpenDrawer: () => void;
}

export function MobileHeader({
  mounted,
  resolvedTheme,
  noLeidas,
  onOpenSidebar,
  onOpenDrawer,
}: MobileHeaderProps) {
  return (
    <header
      className="lg:hidden flex items-center gap-3 px-4 py-3"
      style={{
        background: "var(--kipu-surface)",
        borderBottom: "2px solid var(--kipu-border)",
      }}
    >
      <button onClick={onOpenSidebar} style={{ color: "var(--kipu-muted)" }}>
        <Menu size={20} />
      </button>

      {mounted ? (
        <Image
          src={resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo.svg"}
          alt="Kipu"
          width={80}
          height={26}
          priority
        />
      ) : (
        <div className="w-[80px] h-[26px]" />
      )}

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle compact />
        <button
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "var(--kipu-muted)" }}
          onClick={onOpenDrawer}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kipu-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Bell size={20} />
          {noLeidas > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-white text-[9px] font-bold"
              style={{ background: "var(--kipu-accent)" }}
            >
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}