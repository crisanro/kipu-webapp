// app/not-found.tsx
"use client";
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--kipu-bg)" }}>
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
          }}
        >
          <FileQuestion size={28} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--kipu-text)" }}>404</h1>
        <p className="text-sm mb-6" style={{ color: "var(--kipu-muted)" }}>
          Esta página no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
          style={{ background: "var(--kipu-accent)" }}
        >
          <ArrowLeft size={14} />
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
