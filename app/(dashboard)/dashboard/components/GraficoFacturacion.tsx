// app/(dashboard)/dashboard/components/GraficoFacturacion.tsx
"use client";
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">Día {label}</p>
      <p className="text-white font-bold text-sm">${fmt(payload[0].value)}</p>
    </div>
  );
};

export default function GraficoFacturacion({ documentos }: Props) {
  const datos = Object.entries(
    documentos
      .filter((d: any) => d.estado === "AUTORIZADO" && ["FAC","LIQ"].includes(d.tipo_doc))
      .reduce((acc: any, d: any) => {
        const dia = String(d.fecha ?? "").slice(8, 10);
        if (!acc[dia]) acc[dia] = 0;
        acc[dia] += parseFloat(String(d.total ?? 0));
        return acc;
      }, {})
  )
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Facturación del mes</h2>
        <p className="text-xs text-gray-500 mt-0.5">Total diario autorizado</p>
      </div>

      {datos.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={datos} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="dia"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${fmtK(v)}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {datos.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === datos.length - 1 ? "#818cf8" : "#6366f1"}
                  opacity={0.85 + (i / datos.length) * 0.15}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-gray-500">Sin datos aún este mes</p>
          <p className="text-xs text-gray-600 mt-1">Emite tu primer comprobante</p>
        </div>
      )}
    </div>
  );
}