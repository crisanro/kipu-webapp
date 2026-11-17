"use client";

// Plan gratis sin Pro ni pase: la declaración ya está calculada (se ve el total)
// y se ofrece desbloquear el 104 casillero por casillero. Kipu Pro va como
// recomendado, al lado del pase de este periodo.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Loader2, Sparkles, Ticket } from "lucide-react";
import api from "@/lib/api";

const dinero = (n: number = 0) =>
  n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface OfertaPase {
  disponible:     boolean;
  motivo:         string | null;
  precio:         { total: number } | null;
  comprado:       boolean;
  pro:            boolean;
  periodo:        string;
  periodo_nombre: string;
}

interface Props {
  periodoFmt:    string;
  enCurso:       boolean;
  total:         { iva_a_pagar: number; saldo_a_favor: number };
  pase:          OfertaPase;
  esperandoPago: boolean;          // volvió de Stripe: el pase se activa en segundos
  alertasCantidad?: number;        // alertas encontradas: el detalle es del pase o de Pro
  onRecargar:    () => void;
  onVolver:      () => void;
}

const MAX_INTENTOS = 16;           // ~40 s esperando el aviso de Stripe

export default function PantallaDePago({
  periodoFmt, enCurso, total, pase, esperandoPago, alertasCantidad = 0, onRecargar, onVolver,
}: Props) {
  const [pagando, setPagando] = useState(false);
  const [error,   setError]   = useState("");
  const [intentos, setIntentos] = useState(0);
  const [precioPro, setPrecioPro] = useState<{ base: number; total: number } | null>(null);

  useEffect(() => {
    api.get("/api/v1/app/suscripcion/precio")
      .then((r) => setPrecioPro(r.data.data ?? null))
      .catch(() => setPrecioPro(null));
  }, []);

  // Stripe confirma el pago unos segundos después de volver: se vuelve a consultar
  useEffect(() => {
    if (!esperandoPago || intentos >= MAX_INTENTOS) return;
    const t = setTimeout(() => { setIntentos((n) => n + 1); onRecargar(); }, 2500);
    return () => clearTimeout(t);
  }, [esperandoPago, intentos, onRecargar]);

  const comprarPase = async () => {
    setPagando(true);
    setError("");
    try {
      const res = await api.post("/api/v1/app/declaraciones/pase/checkout", { periodo: pase.periodo });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof d === "string" ? d : "No se pudo abrir el pago. Intenta de nuevo.");
      setPagando(false);
    }
  };

  const aFavor = total.iva_a_pagar === 0 && total.saldo_a_favor > 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-1.5 text-xs transition-colors hover:underline"
        style={{ color: "var(--kipu-subtle)" }}
      >
        <ArrowLeft size={14} /> Volver a reportes
      </button>

      {/* Lo que ya está calculado */}
      <div className="rounded-2xl p-5 text-center space-y-2"
           style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
        <Calculator size={22} className="mx-auto" style={{ color: "var(--kipu-accent)" }} />
        <h1 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>
          Tu declaración de {periodoFmt} {enCurso ? "va así hasta hoy" : "ya está calculada"}
        </h1>
        <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--kipu-text)" }}>
          ${dinero(aFavor ? total.saldo_a_favor : total.iva_a_pagar)}
        </p>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          {aFavor ? "Saldo a favor para el próximo periodo" : "IVA a pagar"}
        </p>
      </div>

      {esperandoPago && intentos < MAX_INTENTOS ? (
        <div className="rounded-xl p-4 flex items-center gap-3"
             style={{ background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--kipu-success) 25%, transparent)" }}>
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: "var(--kipu-success)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
            Recibimos tu pago. Estamos activando tu pase: el formulario aparece en unos segundos.
          </p>
        </div>
      ) : (
        <>
          {alertasCantidad > 0 && (
            <div className="rounded-xl p-3.5 flex items-start gap-3"
                 style={{ background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--kipu-warning) 30%, transparent)" }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
              <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
                <strong>
                  Encontramos {alertasCantidad === 1 ? "1 alerta" : `${alertasCantidad} alertas`} en tu declaración
                  de {periodoFmt}.
                </strong>{" "}
                Retenciones que no llegaron, IVA sin crédito y más: desbloquéalas con el pase o con Kipu Pro.
              </p>
            </div>
          )}

          <p className="text-sm text-center" style={{ color: "var(--kipu-subtle)" }}>
            Para verla casillero por casillero, lista para copiar en el SRI:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kipu Pro: recomendado */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
                 style={{ background: "var(--kipu-surface)", border: "2px solid var(--kipu-accent)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                  <Sparkles size={15} style={{ color: "var(--kipu-accent)" }} /> Kipu Pro
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: "var(--kipu-accent)" }}>Recomendado</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
                {precioPro ? `$${dinero(precioPro.total)}` : "Todo el año"}
                {precioPro && <span className="text-xs font-normal" style={{ color: "var(--kipu-subtle)" }}> al año</span>}
              </p>
              <ul className="text-xs space-y-1" style={{ color: "var(--kipu-subtle)" }}>
                {["Los 12 meses desbloqueados", "Resumen para la renta", "Emisión sin límite y varios usuarios"]
                  .map((t) => (
                    <li key={t} className="flex gap-1.5"><CheckCircle2 size={13} className="shrink-0 mt-px"
                      style={{ color: "var(--kipu-success)" }} />{t}</li>
                  ))}
              </ul>
              <Link href="/planes"
                    className="mt-auto text-center py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                    style={{ background: "var(--kipu-accent)" }}>
                Ver Kipu Pro
              </Link>
            </div>

            {/* Pase de este periodo */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
                 style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                <Ticket size={15} style={{ color: "var(--kipu-subtle)" }} /> Pase del mes
              </span>
              <p className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
                {pase.precio ? `$${dinero(pase.precio.total)}` : "Pago único"}
                <span className="text-xs font-normal" style={{ color: "var(--kipu-subtle)" }}> solo {pase.periodo_nombre}</span>
              </p>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Desbloquea el formulario 104 de este periodo. Queda desbloqueado para siempre.
              </p>
              {pase.disponible ? (
                <button type="button" onClick={comprarPase} disabled={pagando}
                        className="mt-auto py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-[color-mix(in_srgb,var(--kipu-text)_6%,transparent)] active:scale-[0.98] disabled:opacity-60"
                        style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}>
                  {pagando && <Loader2 size={14} className="animate-spin" />}
                  {pagando ? "Abriendo el pago…" : "Comprar el pase"}
                </button>
              ) : (
                <p className="mt-auto text-xs rounded-lg px-3 py-2"
                   style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)", color: "var(--kipu-subtle)" }}>
                  {pase.motivo}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "var(--kipu-danger)" }}>{error}</p>
          )}
        </>
      )}
    </div>
  );
}
