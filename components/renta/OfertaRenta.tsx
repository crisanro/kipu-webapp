"use client";

// Oferta de Kipu Renta (pago único: el equipo de Kipu presenta la renta del año)
// en reportes de renta, en el dashboard durante la temporada (enero a marzo) y en
// /al-dia como opción "solo la renta". Se oculta si no está a la venta, si la
// empresa no es elegible o si la renta ya va incluida en su Kipu Al Día. Si ya la
// compró, lleva a ver el avance.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import api from "@/lib/api";
import { hoyEC } from "@/lib/fecha";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";

export interface EstadoRenta {
  disponible:         boolean;
  anio:               number;
  // Del Price de Stripe; null si no se pudo leer (sin él no se inventa un monto: se ve al pagar)
  precio:             { total: number; base: number; iva: number; tarifa_iva: number } | null;
  motivo_no_elegible: string | null;
  incluida_en_al_dia: boolean;
  aceptado:           boolean;
  comprado:           boolean;
  version_terminos:   string;
}

type Variante = "reportes" | "dashboard" | "al-dia";

export default function OfertaRenta({ variante, anio }: { variante: Variante; anio?: number }) {
  const enProduccion = useAuthStore((s) => s.empresa?.ambiente === 2);
  const [estado, setEstado] = useState<EstadoRenta | null>(null);

  useEffect(() => {
    // Kipu Renta se vende solo en la web: la app no tiene /renta
    if (!enProduccion || ES_APP_NATIVA) return;
    let vivo = true;
    api.get("/api/v1/app/renta/estado")
      .then((r) => { if (vivo) setEstado(r.data.data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [enProduccion]);

  if (!estado || !estado.disponible || estado.motivo_no_elegible || estado.incluida_en_al_dia) return null;
  if (anio !== undefined && anio !== estado.anio) return null;
  // En el dashboard, solo en temporada: cuando lo que se vende es la renta del año pasado
  if (variante === "dashboard" && estado.anio >= Number(hoyEC().slice(0, 4))) return null;
  if (variante === "al-dia" && estado.comprado) return null;

  const pago = estado.precio
    ? `por $${estado.precio.total.toFixed(2)}, IVA incluido, en un solo pago`
    : "en un solo pago (el precio lo ves al pagar)";
  const titulo = estado.comprado
    ? `Tu renta ${estado.anio} la está preparando el equipo de Kipu`
    : variante === "al-dia"
      ? "¿Solo necesitas la declaración de renta?"
      : `¿No quieres hacer tu renta ${estado.anio}? Te la declaramos`;
  const texto = estado.comprado
    ? "Mira en qué va y guarda tu clave del SRI si todavía no lo hiciste."
    : variante === "al-dia"
      ? `Sin el servicio mensual: el equipo de Kipu prepara y presenta tu renta ${estado.anio} ${pago}.`
      : `El equipo de Kipu revisa tus ingresos, gastos y retenciones, te manda el resumen y la presenta por ti, ${pago}.`;

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        background: "color-mix(in srgb, var(--kipu-accent) 8%, transparent)",
        border:     "1px solid color-mix(in srgb, var(--kipu-accent) 25%, transparent)",
      }}
    >
      <FileCheck2 size={20} className="shrink-0" style={{ color: "var(--kipu-accent)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{titulo}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{texto}</p>
      </div>
      <Link
        href="/renta"
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{ background: "var(--kipu-accent)" }}
      >
        {estado.comprado ? "Ver avance" : "Conocer Kipu Renta"} <ArrowRight size={13} />
      </Link>
    </div>
  );
}
