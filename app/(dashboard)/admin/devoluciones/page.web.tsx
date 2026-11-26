"use client";

// Devoluciones por cambio de Kipu Pro a Kipu Al Día (solo superadmin). Las que
// quedaron pendientes (pago por transferencia, o Stripe no pudo devolver a la
// tarjeta) se transfieren a mano y se marcan aquí con la referencia.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail, MessageCircle, RotateCw, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { detalleError } from "@/lib/errores";
import { dolares } from "@/lib/dinero";

interface Devolucion {
  id:                       number;
  emisor_id:                number;
  empresa:                  string;
  ruc:                      string;
  pagado:                   number;
  monto:                    number;
  dias_no_usados:           number | null;
  metodo:                   "TARJETA" | "TRANSFERENCIA";
  estado:                   string;
  error:                    string | null;
  referencia_transferencia: string | null;
  created_at:               string;
  resuelta_at:              string | null;
  contacto:                 string | null;
  email:                    string | null;
  whatsapp:                 string | null;
}

const ESTADO: Record<string, { texto: string; color: string }> = {
  PENDIENTE_TRANSFERENCIA: { texto: "Por transferir",           color: "var(--kipu-warning)" },
  DEVUELTA:                { texto: "Devuelta a la tarjeta",    color: "var(--kipu-success)" },
  TRANSFERIDA:             { texto: "Transferida",              color: "var(--kipu-success)" },
  SIN_DEVOLUCION:          { texto: "Sin devolución (< $1)",    color: "var(--kipu-subtle)" },
  PROCESANDO:              { texto: "Procesando",               color: "var(--kipu-info)" },
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });

function wa(numero: string): string {
  const d = numero.replace(/\D/g, "");
  return d.startsWith("0") ? `593${d.slice(1)}` : d;
}

type Lectura = { lista?: Devolucion[]; error?: string; prohibido?: boolean };

async function leer(soloPendientes: boolean): Promise<Lectura> {
  try {
    const res = await api.get("/api/v1/admin/al-dia/devoluciones", { params: { pendientes: soloPendientes } });
    return { lista: res.data.data ?? [] };
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 403) return { prohibido: true };
    return { error: status ? `Error ${status} al cargar las devoluciones.` : "Sin conexión con el backend." };
  }
}

export default function AdminDevolucionesPage() {
  const router = useRouter();
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [lista,     setLista]     = useState<Devolucion[] | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [refs,      setRefs]      = useState<Record<number, string>>({});
  const [marcando,  setMarcando]  = useState<number | null>(null);
  const [aviso,     setAviso]     = useState<string | null>(null);

  const aplicar = useCallback((r: Lectura) => {
    if (r.prohibido) { router.replace("/dashboard"); return; }
    if (r.lista) setLista(r.lista);
    setError(r.error ?? null);
    setCargando(false);
  }, [router]);

  useEffect(() => {
    let vivo = true;
    leer(soloPendientes).then((r) => { if (vivo) aplicar(r); });
    return () => { vivo = false; };
  }, [soloPendientes, aplicar]);

  const recargar = () => {
    setCargando(true);
    leer(soloPendientes).then(aplicar);
  };

  const cambiarFiltro = (pendientes: boolean) => {
    if (pendientes === soloPendientes) return;
    setCargando(true);
    setSoloPendientes(pendientes);
  };

  const marcar = async (d: Devolucion) => {
    const referencia = (refs[d.id] ?? "").trim();
    if (referencia.length < 3) return;
    setMarcando(d.id);
    setError(null);
    try {
      await api.post(`/api/v1/admin/al-dia/devoluciones/${d.id}/transferida`, { referencia });
      setAviso(`Devolución #${d.id} de ${d.empresa} marcada como transferida.`);
      setRefs((r) => ({ ...r, [d.id]: "" }));
      recargar();
    } catch (e) {
      setError(detalleError(e, "No se pudo marcar la devolución."));
    } finally {
      setMarcando(null);
    }
  };

  const pendientes = (lista ?? []).filter((d) => d.estado === "PENDIENTE_TRANSFERENCIA");
  const porTransferir = pendientes.reduce((s, d) => s + d.monto, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
            <Undo2 size={16} style={{ color: "var(--kipu-accent)" }} /> Devoluciones por cambio de Pro a Al Día
          </h2>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Las de tarjeta las hace Stripe solo. Aquí quedan las que hay que transferir a mano.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg p-0.5" style={{ border: "1px solid var(--kipu-border)" }}>
            {[{ v: true, t: "Por transferir" }, { v: false, t: "Todas" }].map(({ v, t }) => (
              <button
                key={t}
                type="button"
                onClick={() => cambiarFiltro(v)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={soloPendientes === v
                  ? { background: "var(--kipu-accent)", color: "#fff" }
                  : { color: "var(--kipu-subtle)" }}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={recargar}
            disabled={cargando}
            aria-label="Actualizar"
            className="p-2 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_6%,transparent)]"
            style={{ color: "var(--kipu-subtle)", border: "1px solid var(--kipu-border)" }}
          >
            <RotateCw size={14} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {soloPendientes && pendientes.length > 0 && (
        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
          <strong>{pendientes.length}</strong> por transferir · <strong>{dolares(porTransferir)}</strong> en total
        </p>
      )}

      {aviso && (
        <p className="text-xs rounded-lg px-3 py-2 flex items-center gap-2"
           style={{ background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", color: "var(--kipu-text)" }}>
          <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} /> {aviso}
        </p>
      )}
      {error && (
        <p className="text-xs rounded-lg px-3 py-2"
           style={{ background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)", color: "var(--kipu-danger)" }}>
          {error}
        </p>
      )}

      {lista === null ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-sm"
             style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-subtle)" }}>
          {soloPendientes ? "No hay devoluciones por transferir." : "Todavía no hay devoluciones."}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((d) => {
            const e = ESTADO[d.estado] ?? { texto: d.estado, color: "var(--kipu-subtle)" };
            const pendiente = d.estado === "PENDIENTE_TRANSFERENCIA";
            return (
              <div key={d.id} className="rounded-xl p-4 space-y-3"
                   style={{ background: "var(--kipu-surface)", border: `1px solid ${pendiente
                     ? "color-mix(in srgb, var(--kipu-warning) 40%, transparent)" : "var(--kipu-border)"}` }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--kipu-text)" }}>{d.empresa}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      RUC {d.ruc} · #{d.id} · {fecha(d.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums" style={{ color: "var(--kipu-text)" }}>{dolares(d.monto)}</p>
                    <span className="text-[11px] font-semibold" style={{ color: e.color }}>{e.texto}</span>
                  </div>
                </div>

                <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                  Pagó {dolares(d.pagado)} por Kipu Pro{d.dias_no_usados !== null && ` · le quedaban ${d.dias_no_usados} días`}
                  {" · "}{d.metodo === "TARJETA" ? "pagó con tarjeta" : "pagó por transferencia"}
                  {d.referencia_transferencia && ` · referencia ${d.referencia_transferencia}`}
                </p>

                {d.error && (
                  <p className="text-[11px] rounded-md px-2.5 py-1.5"
                     style={{ background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", color: "var(--kipu-text)" }}>
                    {d.error}
                  </p>
                )}

                {pendiente && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1"
                       style={{ borderTop: "1px solid var(--kipu-border)" }}>
                    <div className="flex items-center gap-3 text-xs flex-wrap pt-2 sm:pt-0" style={{ color: "var(--kipu-subtle)" }}>
                      <span>{d.contacto ?? "Sin contacto"}</span>
                      {d.whatsapp && (
                        <a href={`https://wa.me/${wa(d.whatsapp)}?text=${encodeURIComponent(
                             `Hola, te escribimos de Kipu por la devolución de ${dolares(d.monto)} de tu Kipu Pro. ¿A qué cuenta bancaria te la transferimos?`)}`}
                           target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: "var(--kipu-accent)" }}>
                          <MessageCircle size={12} /> {d.whatsapp}
                        </a>
                      )}
                      {d.email && (
                        <a href={`mailto:${d.email}`} className="inline-flex items-center gap-1 hover:underline"
                           style={{ color: "var(--kipu-accent)" }}>
                          <Mail size={12} /> {d.email}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 sm:ml-auto">
                      <input
                        value={refs[d.id] ?? ""}
                        onChange={(ev) => setRefs((r) => ({ ...r, [d.id]: ev.target.value }))}
                        placeholder="Referencia de la transferencia"
                        maxLength={100}
                        className="flex-1 sm:w-56 px-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
                      />
                      <button
                        type="button"
                        onClick={() => marcar(d)}
                        disabled={marcando === d.id || (refs[d.id] ?? "").trim().length < 3}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "var(--kipu-accent)" }}
                      >
                        {marcando === d.id && <Loader2 size={12} className="animate-spin" />}
                        Marcar transferida
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
