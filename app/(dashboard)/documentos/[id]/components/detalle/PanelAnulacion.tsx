"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, XCircle, Copy, Ban, ExternalLink, Info, ChevronDown, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { type FacturaBase, formatearFecha, SRI_EN_LINEA_URL, MOTIVO_LABEL } from "./utils";

function CampoCopiable({ label, valor }: { label: string; valor: string | null | undefined }) {
  const [copiado, setCopiado] = useState(false);
  const vacio = !valor;

  const copiar = async () => {
    if (vacio) return;
    await navigator.clipboard.writeText(valor!);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2"
      style={{ borderTop: "1px solid var(--kipu-border)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>{label}</p>
        <p
          className="text-sm break-all"
          style={{ color: vacio ? "var(--kipu-warning)" : "var(--kipu-text)" }}
        >
          {vacio ? "No registrado en el comprobante" : valor}
        </p>
      </div>
      {!vacio && (
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${label}`}
          className="shrink-0 p-1.5 rounded-md transition-colors"
          style={{ color: copiado ? "var(--kipu-success)" : "var(--kipu-subtle)" }}
          onMouseEnter={e => { if (!copiado) e.currentTarget.style.color = "var(--kipu-text)"; }}
          onMouseLeave={e => { if (!copiado) e.currentTarget.style.color = "var(--kipu-subtle)"; }}
        >
          {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
      )}
    </div>
  );
}

export default function PanelAnulacion({ factura, onRecargar }: { factura: FacturaBase; onRecargar: () => void }) {
  const router = useRouter();
  const an     = factura.anulacion!;

  const [abierto,       setAbierto]       = useState(false);
  const [motivo,        setMotivo]        = useState(an.motivos[0] ?? "");
  const [confirmado,    setConfirmado]    = useState(false);
  const [enviando,      setEnviando]      = useState<null | "anular" | "aceptada" | "rechazada" | "sincronizar">(null);
  const [error,         setError]         = useState("");

  const cajaNeutra = {
    background: "var(--kipu-surface)",
    border: "1px solid var(--kipu-border)",
  };

  const Spinner = ({ color = "#FFFFFF" }: { color?: string }) => (
    <div
      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: color, borderTopColor: "transparent" }}
    />
  );

  const ErrorMsg = () => error ? (
    <p
      className="text-xs px-3 py-2 rounded-lg leading-relaxed"
      style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}
    >
      {error}
    </p>
  ) : null;

  // 1. Registrar anulación (Valida directo contra el SRI)
  const registrar = async () => {
    setError("");
    setEnviando("anular");
    try {
      await api.post(`/api/v1/app/documentos/${factura.id}/anular`, { motivo, confirmado });
      onRecargar();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo verificar o registrar la anulación.");
    } finally {
      setEnviando(null);
    }
  };

  // 2. Re-consultar estado de anulación al SRI
  const sincronizarAnulacion = async () => {
    setError("");
    setEnviando("sincronizar");
    try {
      const res = await api.post(`/api/v1/app/documentos/${factura.id}/anulacion/sincronizar`);
      if (res.data.cambio) {
        onRecargar();
      } else {
        setError(res.data.mensaje || "El SRI aún no refleja un cambio en esta anulación.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo consultar el estado con el SRI.");
    } finally {
      setEnviando(null);
    }
  };

  // 3. Resolución manual (por si el usuario lo confirma antes)
  const resolver = async (aceptada: boolean) => {
    setError("");
    setEnviando(aceptada ? "aceptada" : "rechazada");
    try {
      await api.post(`/api/v1/app/documentos/${factura.id}/anulacion/resolver`, { aceptada });
      onRecargar();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo actualizar la solicitud.");
    } finally {
      setEnviando(null);
    }
  };

  // ── A. Solicitud esperando al receptor ────────────────────────────────────
  if (an.estado === "PENDIENTE") {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "color-mix(in srgb, var(--kipu-warning) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--kipu-warning) 25%, transparent)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <Clock size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Anulación en espera del receptor
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
              {an.sri.razon_social_receptor || "El receptor"} tiene hasta el{" "}
              <span className="font-medium" style={{ color: "var(--kipu-text)" }}>
                {formatearFecha(an.limite_aceptacion)}
              </span>{" "}
              para aceptarla en el SRI. Mientras tanto el comprobante sigue vigente.
            </p>
          </div>
        </div>

        <ErrorMsg />

        <div className="space-y-2 pt-1">
          {/* Botón principal: Consulta en tiempo real al SRI */}
          <button
            type="button"
            onClick={sincronizarAnulacion}
            disabled={!!enviando}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--kipu-accent)" }}
          >
            {enviando === "sincronizar" ? <Spinner /> : <RefreshCw size={13} />}
            Verificar respuesta en el SRI
          </button>

          {/* Opciones alternativas manuales */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => resolver(true)}
              disabled={!!enviando}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs disabled:opacity-50"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)", background: "var(--kipu-surface)" }}
            >
              {enviando === "aceptada" ? <Spinner color="var(--kipu-muted)" /> : <CheckCircle2 size={13} />}
              Marcar Aceptada
            </button>
            <button
              type="button"
              onClick={() => resolver(false)}
              disabled={!!enviando}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs disabled:opacity-50"
              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)", background: "var(--kipu-surface)" }}
            >
              {enviando === "rechazada" ? <Spinner color="var(--kipu-muted)" /> : <XCircle size={13} />}
              Marcar Rechazada
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── B. No se puede anular ─────────────────────────────────────────────────
  if (!an.puede_anular) {
    if (!an.motivo_bloqueo) return null;
    return (
      <div className="rounded-xl p-4 flex items-start gap-2.5" style={cajaNeutra}>
        <Info size={15} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-subtle)" }} />
        <div className="space-y-2">
          <p className="text-xs leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
            {an.motivo_bloqueo}
          </p>
          {an.sugerir_nota_credito && (
            <button
              type="button"
              onClick={() => router.push(`/documentos/emitir/ncr?doc_id=${factura.id}`)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: "color-mix(in srgb, #c084fc 10%, transparent)",
                color: "#c084fc",
                border: "1px solid color-mix(in srgb, #c084fc 20%, transparent)",
              }}
            >
              Emitir nota de crédito
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── C. Formulario de Solicitud ────────────────────────────────────────────
  const urgente = an.dias_restantes <= 2;
  const plazoTexto = an.dias_restantes === 0
    ? "hoy es el último día"
    : an.dias_restantes === 1
      ? "queda 1 día"
      : `quedan ${an.dias_restantes} días`;

  return (
    <div className="rounded-xl overflow-hidden" style={cajaNeutra}>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        aria-expanded={abierto}
      >
        <Ban size={15} className="shrink-0" style={{ color: "var(--kipu-danger)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Anular comprobante</p>
          <p className="text-xs" style={{ color: urgente ? "var(--kipu-warning)" : "var(--kipu-subtle)" }}>
            Puedes anularlo hasta el {formatearFecha(an.fecha_limite)} · {plazoTexto}
          </p>
        </div>
        <ChevronDown
          size={15}
          className={abierto ? "rotate-180 transition-transform" : "transition-transform"}
          style={{ color: "var(--kipu-subtle)" }}
        />
      </button>

      {abierto && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--kipu-border)" }}>

          {(an.estado === "RECHAZADA" || an.estado === "VENCIDA") && (
            <p
              className="text-xs mt-3 px-3 py-2 rounded-lg"
              style={{ color: "var(--kipu-muted)", background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)" }}
            >
              {an.estado === "RECHAZADA"
                ? "El receptor rechazó la solicitud anterior. Puedes volver a solicitarla dentro del plazo."
                : "La solicitud anterior venció sin respuesta del receptor. Puedes volver a solicitarla dentro del plazo."}
            </p>
          )}

          {/* Paso 1: Datos para el SRI */}
          <div className="space-y-2 pt-3">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
              1. Ingresa la solicitud en el SRI
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--kipu-muted)" }}>
              Entra a SRI en línea, busca la opción de anulación de comprobantes electrónicos y copia estos datos:
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kipu-border)", borderTop: "none" }}>
              <CampoCopiable label="Tipo de comprobante"         valor={an.sri.tipo_comprobante} />
              <CampoCopiable label="Fecha de autorización"       valor={an.sri.fecha_autorizacion} />
              <CampoCopiable label="Clave de acceso"             valor={an.sri.clave_acceso} />
              <CampoCopiable label="Número de autorización"      valor={an.sri.numero_autorizacion} />
              <CampoCopiable label="Identificación del receptor" valor={an.sri.identificacion_receptor} />
              <CampoCopiable label="Correo del receptor"         valor={an.sri.email_receptor} />
            </div>
            <a
              href={SRI_EN_LINEA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              <ExternalLink size={12} /> Abrir SRI en línea
            </a>
          </div>

          {/* Paso 2: Verificar y Registrar en Kipu */}
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
              2. Verificar y registrar en Kipu
            </p>
            <label className="block text-xs" style={{ color: "var(--kipu-subtle)" }} htmlFor="motivo-anulacion">
              Motivo
            </label>
            <select
              id="motivo-anulacion"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
            >
              {an.motivos.map(m => (
                <option key={m} value={m}>{MOTIVO_LABEL[m] ?? m}</option>
              ))}
            </select>
            <label className="flex items-start gap-2 text-xs cursor-pointer pt-1" style={{ color: "var(--kipu-muted)" }}>
              <input
                type="checkbox"
                checked={confirmado}
                onChange={e => setConfirmado(e.target.checked)}
                className="mt-0.5"
              />
              Ya ingresé la solicitud de anulación en el portal del SRI.
            </label>

            <ErrorMsg />

            <button
              type="button"
              onClick={registrar}
              disabled={!confirmado || !!enviando}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--kipu-danger)" }}
            >
              {enviando === "anular" ? <Spinner /> : <Ban size={13} />}
              Verificar y registrar anulación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}