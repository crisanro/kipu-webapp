// app/(dashboard)/dashboard/components/GraficoFacturacion.tsx
"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

interface Props {
  documentos: any[];
}

const fmt  = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fmtK = (n: any) => {
  const v = parseFloat(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{
        background: "var(--kipu-surface)",
        border:     "1px solid var(--kipu-border)",
      }}
    >
      <p className="mb-1" style={{ color: "var(--kipu-muted)" }}>Día {label}</p>
      <p className="font-bold text-sm" style={{ color: "var(--kipu-text)" }}>
        ${fmt(payload[0].value)}
      </p>
    </div>
  );
};

export default function GraficoFacturacion({ documentos }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const datos = Object.entries(
    documentos
      .filter((d: any) => d.estado === "AUTORIZADO" && ["FAC", "LIQ"].includes(d.tipo_doc))
      .reduce((acc: any, d: any) => {
        const dia = String(d.fecha ?? "").slice(8, 10);
        if (!acc[dia]) acc[dia] = 0;
        acc[dia] += parseFloat(String(d.total ?? 0));
        return acc;
      }, {})
  )
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  // Leer color del acento desde CSS para usarlo en las barras
  const accentColor  = mounted
    ? getComputedStyle(document.documentElement).getPropertyValue("--kipu-accent").trim()
    : "#059669";
  const accentColorH = mounted
    ? getComputedStyle(document.documentElement).getPropertyValue("--kipu-accent-h").trim()
    : "#047857";
  const mutedColor = mounted
    ? getComputedStyle(document.documentElement).getPropertyValue("--kipu-muted").trim()
    : "#4B5563";

  return (
    <div
      className="rounded-xl p-5 h-full"
      style={{
        background: "var(--kipu-surface)",
        border:     "1px solid var(--kipu-border)",
      }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
          Facturación del mes
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--kipu-muted)" }}>
          Total diario autorizado
        </p>
      </div>

      {datos.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={datos} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="dia"
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${fmtK(v)}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: `color-mix(in srgb, ${accentColor} 8%, transparent)` }}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {datos.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === datos.length - 1 ? accentColor : accentColorH}
                  opacity={0.75 + (i / datos.length) * 0.25}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "var(--kipu-bg)" }}
          >
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
            Sin datos aún este mes
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
            Emite tu primer comprobante
          </p>
        </div>
      )}
    </div>
  );
}