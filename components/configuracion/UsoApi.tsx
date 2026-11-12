"use client";
// Medidor del cupo mensual de API: "Llevas 200 de 300 comprobantes por API este mes".
import { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge } from "lucide-react";
import api from "@/lib/api";

interface Uso {
  plan_pro:  boolean;
  limite:    number;
  usados:    number;
  restantes: number;
  aviso_en:  number | null;
  creditos:  number;
  cupo_plan_pro: number;
  mes:       string;
  reinicia:  string;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
               "septiembre", "octubre", "noviembre", "diciembre"];
const num = (n: number) => n.toLocaleString("es-EC");

export default function UsoApi() {
  const [uso, setUso] = useState<Uso | null>(null);

  useEffect(() => {
    api.get("/api/v1/app/apikeys/uso").then(r => setUso(r.data.data)).catch(() => {});
  }, []);

  if (!uso) return null;

  const [anio, mes] = uso.mes.split("-").map(Number);
  const nombreMes = MESES[mes - 1];
  const reinicia = new Date(`${uso.reinicia}T12:00:00`);
  const fechaReinicio = `${reinicia.getDate()} de ${MESES[reinicia.getMonth()]}`;
  const creditos = `${num(uso.creditos)} crédito${uso.creditos === 1 ? "" : "s"}`;

  // Sin plan Pro: cada comprobante por API usa 1 crédito
  if (!uso.plan_pro) {
    return (
      <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
        <div className="flex items-center gap-2">
          <Gauge size={15} style={{ color: "var(--kipu-subtle)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Uso de la API</h2>
        </div>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          Cada comprobante por API usa 1 crédito. Te quedan <strong style={{ color: "var(--kipu-text)" }}>{creditos}</strong>.
        </p>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Con el Plan Pro tienes {num(uso.cupo_plan_pro)} comprobantes por API incluidos cada mes.{" "}
          <Link href="/planes" className="underline" style={{ color: "var(--kipu-accent)" }}>Ver planes</Link>
        </p>
      </div>
    );
  }

  const pct = uso.limite ? Math.min(100, (uso.usados / uso.limite) * 100) : 0;
  const agotado = uso.restantes <= 0;
  const cerca = !agotado && uso.aviso_en !== null && uso.usados >= uso.aviso_en;
  const color = agotado ? "var(--kipu-danger)" : cerca ? "var(--kipu-warning)" : "var(--kipu-accent)";

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <Gauge size={15} style={{ color: "var(--kipu-subtle)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Uso de la API · {nombreMes} {anio}
          </h2>
        </div>
        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Se renueva el {fechaReinicio}</span>
      </div>

      <div>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          Llevas <strong style={{ color: "var(--kipu-text)" }}>{num(uso.usados)}</strong> de{" "}
          <strong style={{ color: "var(--kipu-text)" }}>{num(uso.limite)}</strong> comprobantes por API incluidos en tu Plan Pro
        </p>
        <div className="mt-2 h-2 rounded-full overflow-hidden"
             style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
             role="progressbar" aria-valuemin={0} aria-valuemax={uso.limite} aria-valuenow={Math.min(uso.usados, uso.limite)}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>

      <p className="text-xs" style={{ color: agotado || cerca ? color : "var(--kipu-subtle)" }}>
        {agotado ? (
          <>
            Llegaste al cupo del mes: ahora cada comprobante por API usa 1 crédito (te quedan {creditos}).{" "}
            <Link href="/planes" className="underline">Recargar créditos</Link>
          </>
        ) : cerca ? (
          <>Te quedan {num(uso.restantes)}. Al llegar a {num(uso.limite)} se usarán tus créditos (tienes {creditos}).</>
        ) : (
          <>Te quedan {num(uso.restantes)} este mes. Desde el panel web la emisión es ilimitada.</>
        )}
      </p>
    </div>
  );
}
