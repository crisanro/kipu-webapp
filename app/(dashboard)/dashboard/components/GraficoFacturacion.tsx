// app/(dashboard)/dashboard/components/GraficoFacturacion.tsx
"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import { compactoK, dosDecimales } from "@/lib/dinero";

interface Props {
  documentos: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl bg-superficie border border-borde"
    >
      <p className="mb-1 text-tenue">Día {label}</p>
      <p className="font-bold text-sm text-texto">
        ${dosDecimales(payload[0].value)}
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
      className="rounded-xl p-5 h-full bg-superficie border border-borde"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-texto">
          Facturación del mes
        </h2>
        <p className="text-xs mt-0.5 text-tenue">
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
              tickFormatter={(v: number) => `$${compactoK(v)}`}
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
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-fondo"
          >
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-tenue">
            Sin datos aún este mes
          </p>
          <p className="text-xs mt-1 text-sutil">
            Emite tu primer comprobante
          </p>
        </div>
      )}
    </div>
  );
}