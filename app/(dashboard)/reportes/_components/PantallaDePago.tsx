"use client";

// Plan gratis sin el periodo habilitado: la declaración ya está calculada (se ve
// solo el total y cuántas alertas hay) y se ofrece Kipu Pro para el 104 casillero
// por casillero. El pase del mes ya no se vende (los pagados siguen valiendo).
// El aviso de «solo lo emitido en Kipu» va completo, también en la app.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import Alertas104, { type Alerta104 } from "./Alertas104";
import { montoEC } from "@/lib/dinero";

interface Props {
  periodoFmt:       string;
  enCurso:          boolean;
  total:            { iva_a_pagar: number; saldo_a_favor: number };
  alertasCantidad?: number;        // alertas encontradas (incluye el aviso): el detalle es del 104 completo
  aviso?:           Alerta104 | null;   // SOLO_KIPU: se muestra entero
  onVolver:         () => void;
}

export default function PantallaDePago({ periodoFmt, enCurso, total, alertasCantidad = 0, aviso = null,
                                         onVolver }: Props) {
  const [precioPro, setPrecioPro] = useState<{ base: number; total: number } | null>(null);
  const otrasAlertas = alertasCantidad - (aviso ? 1 : 0);   // el aviso ya se ve: no se cuenta

  useEffect(() => {
    if (ES_APP_NATIVA) return;   // en la app no se muestran precios
    api.get("/api/v1/app/suscripcion/precio")
      .then((r) => setPrecioPro(r.data.data ?? null))
      .catch(() => setPrecioPro(null));
  }, []);

  const aFavor = total.iva_a_pagar === 0 && total.saldo_a_favor > 0;

  const cabecera = (
    <>
      <button
        type="button"
        onClick={onVolver}
        className="hidden items-center gap-1.5 text-xs transition-colors hover:underline lg:flex text-sutil"
      >
        <ArrowLeft size={14} /> Volver a reportes
      </button>

      {/* Lo que ya está calculado: solo el total */}
      <div className="rounded-2xl p-5 text-center space-y-2 bg-superficie border border-borde">
        <Calculator size={22} className="mx-auto text-acento" />
        <h1 className="text-lg font-bold text-texto">
          Tu declaración de {periodoFmt} {enCurso ? "va así hasta hoy" : "ya está calculada"}
        </h1>
        <p className="text-3xl font-bold tabular-nums text-texto">
          ${montoEC(aFavor ? total.saldo_a_favor : total.iva_a_pagar)}
        </p>
        <p className="text-xs text-sutil">
          {aFavor ? "Saldo a favor para el próximo periodo" : "IVA a pagar"}
        </p>
      </div>

      {aviso && <Alertas104 alertas={[aviso]} encabezado={false} />}
    </>
  );

  // App de las tiendas: el total (que es gratis) y un aviso neutro, sin precios
  // ni forma de contratar (ver components/SoloWeb.tsx)
  if (ES_APP_NATIVA) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        {cabecera}
        <p className="text-sm text-center text-sutil">
          Calculado con los comprobantes de {periodoFmt} que tienes en Kipu.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {cabecera}

      {otrasAlertas > 0 && (
        <div className="rounded-xl p-3.5 flex items-start gap-3 bg-alerta/10 border border-alerta/30">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-alerta" />
          <p className="text-sm text-texto">
            <strong>
              Encontramos {otrasAlertas === 1 ? "1 alerta" : `${otrasAlertas} alertas`} en tu declaración
              de {periodoFmt}.
            </strong>{" "}
            Retenciones que no llegaron, IVA sin crédito y más: míralas con Kipu Pro.
          </p>
        </div>
      )}

      <p className="text-sm text-center text-sutil">
        Para verla casillero por casillero, lista para copiar en el SRI:
      </p>

      <div className="rounded-2xl p-4 flex flex-col gap-3 bg-superficie border-2 border-acento">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-texto">
          <Sparkles className="text-acento" size={15} /> Kipu Pro
        </span>
        <p className="text-xl font-bold text-texto">
          {precioPro ? `$${montoEC(precioPro.total)}` : "Todo el año"}
          {precioPro && <span className="text-xs font-normal text-sutil"> al año</span>}
        </p>
        <ul className="text-xs space-y-1 text-sutil">
          {["El formulario 104 de cada periodo, casillero por casillero", "Las alertas de tu declaración",
            "Resumen para la renta", "Emisión sin límite y varios usuarios"]
            .map((t) => (
              <li key={t} className="flex gap-1.5"><CheckCircle2 size={13} className="shrink-0 mt-px text-exito" />{t}</li>
            ))}
        </ul>
        <Link href="/planes"
              className="mt-1 text-center py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] bg-acento">
          Ver planes
        </Link>
      </div>
    </div>
  );
}
