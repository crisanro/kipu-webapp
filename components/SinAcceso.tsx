"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function SinAcceso() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
        }}
      >
        <ShieldX size={28} style={{ color: "var(--kipu-danger)" }} />
      </div>
      <h2 className="font-semibold text-lg mb-1" style={{ color: "var(--kipu-text)" }}>
        Sin acceso
      </h2>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--kipu-subtle)" }}>
        No tienes permisos para ver esta sección. Contacta al administrador de tu empresa.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg text-sm transition-colors"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
          color: "var(--kipu-text)",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--kipu-surface)";
        }}
      >
        Ir al Dashboard
      </Link>
    </div>
  );
}