// app/not-found.tsx
"use client";
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-fondo">
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-acento/10 border border-acento/20"
        >
          <FileQuestion className="text-acento" size={28} />
        </div>
        <h1 className="text-4xl font-bold mb-2 text-texto">404</h1>
        <p className="text-sm mb-6 text-tenue">
          Esta página no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors bg-acento"
        >
          <ArrowLeft size={14} />
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
