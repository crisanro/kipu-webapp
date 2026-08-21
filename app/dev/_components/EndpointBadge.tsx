const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-900/40 text-emerald-400 border-emerald-700/40",
  POST: "bg-indigo-900/40 text-indigo-400 border-indigo-700/40",
  PUT: "bg-amber-900/40 text-amber-400 border-amber-700/40",
  DELETE: "bg-rose-900/40 text-rose-400 border-rose-700/40",
  PATCH: "bg-purple-900/40 text-purple-400 border-purple-700/40",
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${
        METHOD_STYLES[method] ?? "bg-slate-800 text-slate-400 border-slate-700"
      }`}
    >
      {method}
    </span>
  );
}

export function AlertBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-indigo-700/50 bg-indigo-950/30 text-indigo-200",
    warning: "border-amber-700/50 bg-amber-950/30 text-amber-200",
    tip: "border-emerald-700/50 bg-emerald-950/30 text-emerald-200",
  };
  const icons = { info: "ℹ", warning: "⚠", tip: "✦" };

  return (
    <div className={`flex gap-3 border rounded-lg px-4 py-3 my-6 ${styles[type]}`}>
      <span className="mt-0.5 text-sm shrink-0">{icons[type]}</span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}