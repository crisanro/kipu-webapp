"use client";
import { useState } from "react";

interface Tab {
  label: string;
  code: string;
  lang?: string;
}

interface CodeBlockProps {
  tabs?: Tab[];
  code?: string;
  lang?: string;
  filename?: string;
}

export function CodeBlock({ tabs, code, lang, filename }: CodeBlockProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  const items: Tab[] = tabs ?? [{ label: lang ?? "code", code: code ?? "" }];
  const current = items[active];

  function copy() {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden text-sm my-6 bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2 bg-[#161b27]">
        <div className="flex items-center gap-1">
          {items.length > 1
            ? items.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setActive(i)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    i === active
                      ? "bg-indigo-600/30 text-indigo-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))
            : filename && (
                <span className="text-xs text-slate-500 font-mono">
                  {filename}
                </span>
              )}
        </div>
        <button
          onClick={copy}
          className="text-xs text-slate-500 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-5 text-slate-300 leading-relaxed">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}