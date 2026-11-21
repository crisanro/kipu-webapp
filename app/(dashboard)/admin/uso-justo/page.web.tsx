"use client";

// Uso justo del plan gratis (solo superadmin):
//   - Solicitudes de ampliación que no se aprobaron solas: aprobar (al nivel
//     pedido o a otro) o rechazar con una nota que ve el cliente.
//   - Nivel de una empresa (se busca por RUC o nombre): ver su uso y sus
//     criterios, y ponerle el nivel a mano.
// Niveles: 1 = 300/100, 2 = 600/200, 3 = 1.000/330 (mes / día).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gauge, Loader2, RotateCw, Search, XCircle } from "lucide-react";
import api from "@/lib/api";

interface Criterio {
  ok:             boolean;
  valor?:         number;
  requerido?:     number;
  maximo?:        number;
  texto?:         string;
  rechazados?:    number;
  con_respuesta?: number;
}
type Criterios = Record<string, Criterio>;

interface Solicitud {
  id:            number;
  emisor_id:     number;
  razon_social:  string;
  ruc:           string;
  nivel_actual:  number;
  nivel_pedido:  number;
  estado:        "PENDIENTE" | "APROBADA" | "RECHAZADA";
  aprobada_sola: boolean;
  criterios:     Criterios | null;
  nota:          string | null;
  resuelta_por:  string | null;
  created_at:    string;
  resuelta_at:   string | null;
}

interface Encontrada {
  id:                     number;
  ruc:                    string;
  razon_social:           string;
  nombre_comercial:       string | null;
  ambiente:               number;
  uso_justo_nivel:        number;
  uso_justo_nivel_manual: boolean;
}

interface Empresa {
  id:           number;
  ruc:          string;
  razon_social: string;
  ambiente:     number;
  nivel:      number;
  manual:     boolean;
  siguiente:  number | null;
  cumple:     boolean;
  criterios:  Criterios;
  limite_mes: number;
  limite_dia: number;
  usados_mes: number;
  usados_hoy: number;
}

type Estado = Solicitud["estado"];
const FILTROS: { v: Estado; t: string }[] = [
  { v: "PENDIENTE", t: "Pendientes" }, { v: "APROBADA", t: "Aprobadas" }, { v: "RECHAZADA", t: "Rechazadas" },
];
const LIMITES: Record<number, string> = { 1: "300 / 100", 2: "600 / 200", 3: "1.000 / 330" };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });

const detalle = (e: unknown, porDefecto: string) => {
  const det = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof det === "string" ? det : porDefecto;
};

function textoCriterio(clave: string, c: Criterio): string {
  if (clave === "dias") return `${c.valor} ${c.texto} (pide ${c.requerido})`;
  if (clave === "meses_con_autorizados") return `${c.valor} meses con autorizados (pide ${c.requerido})`;
  if (clave === "rechazos_pct") return `${c.valor} % rechazados (${c.rechazados} de ${c.con_respuesta}, máx. ${c.maximo} %)`;
  if (clave === "correo_verificado") return "Correo verificado";
  return clave;
}

function ListaCriterios({ criterios }: { criterios: Criterios | null }) {
  if (!criterios || Object.keys(criterios).length === 0) return null;
  return (
    <ul className="space-y-1">
      {Object.entries(criterios).map(([k, c]) => (
        <li key={k} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kipu-muted)" }}>
          {c.ok
            ? <CheckCircle2 size={12} style={{ color: "var(--kipu-success)" }} />
            : <XCircle size={12} style={{ color: "var(--kipu-danger)" }} />}
          {textoCriterio(k, c)}
        </li>
      ))}
    </ul>
  );
}

const inputStyle = { background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" };

type Lectura = { lista?: Solicitud[]; error?: string; prohibido?: boolean };

async function leer(estado: Estado): Promise<Lectura> {
  try {
    const res = await api.get("/api/v1/admin/uso-justo/solicitudes", { params: { estado } });
    return { lista: res.data.data ?? [] };
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 403) return { prohibido: true };
    return { error: status ? `Error ${status} al cargar las solicitudes.` : "Sin conexión con el backend." };
  }
}

export default function AdminUsoJustoPage() {
  const router = useRouter();
  const [filtro,    setFiltro]    = useState<Estado>("PENDIENTE");
  const [lista,     setLista]     = useState<Solicitud[] | null>(null);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [aviso,     setAviso]     = useState<string | null>(null);
  const [notas,     setNotas]     = useState<Record<number, string>>({});
  const [niveles,   setNiveles]   = useState<Record<number, number>>({});
  const [resolviendo, setResolviendo] = useState<number | null>(null);

  // Nivel de una empresa
  const [busqueda,  setBusqueda]  = useState("");
  const [encontradas, setEncontradas] = useState<Encontrada[] | null>(null);
  const [empresa,   setEmpresa]   = useState<Empresa | null>(null);
  const [buscando,  setBuscando]  = useState(false);
  const [nuevoNivel, setNuevoNivel] = useState(2);
  const [manual,    setManual]    = useState(true);
  const [notaNivel, setNotaNivel] = useState("");
  const [guardando, setGuardando] = useState(false);

  const aplicar = useCallback((r: Lectura) => {
    if (r.prohibido) { router.replace("/dashboard"); return; }
    if (r.lista) setLista(r.lista);
    setError(r.error ?? null);
    setCargando(false);
  }, [router]);

  useEffect(() => {
    let vivo = true;
    leer(filtro).then((r) => { if (vivo) aplicar(r); });
    return () => { vivo = false; };
  }, [filtro, aplicar]);

  const recargar = () => { setCargando(true); leer(filtro).then(aplicar); };

  const resolver = async (s: Solicitud, aprobar: boolean) => {
    setResolviendo(s.id);
    setError(null);
    try {
      const nivel = niveles[s.id] ?? s.nivel_pedido;
      await api.post(`/api/v1/admin/uso-justo/solicitudes/${s.id}/resolver`, {
        aprobar, nivel: aprobar ? nivel : undefined, nota: (notas[s.id] ?? "").trim() || undefined,
      });
      setAviso(aprobar
        ? `${s.razon_social} pasó al nivel ${nivel}. Ya le llegó la notificación.`
        : `Solicitud de ${s.razon_social} rechazada. Ya le llegó la notificación.`);
      recargar();
    } catch (e) {
      setError(detalle(e, "No se pudo resolver la solicitud."));
    } finally {
      setResolviendo(null);
    }
  };

  const buscar = async () => {
    const q = busqueda.trim();
    if (q.length < 3) return;
    setBuscando(true);
    setError(null);
    setEmpresa(null);
    try {
      const res = await api.get("/api/v1/admin/uso-justo/empresas", { params: { q } });
      const lista: Encontrada[] = res.data.data ?? [];
      setEncontradas(lista);
      if (lista.length === 1) await abrir(lista[0].id);
    } catch (e) {
      setEncontradas(null);
      setError(detalle(e, "No se pudo buscar."));
    } finally {
      setBuscando(false);
    }
  };

  const abrir = async (id: number) => {
    setError(null);
    try {
      const res = await api.get(`/api/v1/admin/uso-justo/empresas/${id}`);
      setEmpresa(res.data.data);
      setNuevoNivel(res.data.data.nivel);
    } catch (e) {
      setEmpresa(null);
      setError(detalle(e, "No se encontró la empresa."));
    }
  };

  const guardarNivel = async () => {
    setGuardando(true);
    setError(null);
    try {
      if (!empresa) return;
      await api.post(`/api/v1/admin/uso-justo/empresas/${empresa.id}/nivel`, {
        nivel: nuevoNivel, manual, nota: notaNivel.trim() || undefined,
      });
      setAviso(`${empresa.razon_social}: nivel ${nuevoNivel}${manual ? " (a mano)" : ""}.`);
      setNotaNivel("");
      await abrir(empresa.id);
    } catch (e) {
      setError(detalle(e, "No se pudo cambiar el nivel."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--kipu-text)" }}>
            <Gauge size={16} style={{ color: "var(--kipu-accent)" }} /> Uso justo del plan gratis
          </h2>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Nivel 1: 300/100 · nivel 2: 600/200 · nivel 3: 1.000/330 (mes / día). Las que cumplen suben solas;
            aquí quedan las que no.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg p-0.5" style={{ border: "1px solid var(--kipu-border)" }}>
            {FILTROS.map(({ v, t }) => (
              <button
                key={v}
                type="button"
                onClick={() => { if (v !== filtro) { setCargando(true); setFiltro(v); } }}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={filtro === v ? { background: "var(--kipu-accent)", color: "#fff" } : { color: "var(--kipu-subtle)" }}
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

      {/* ── Solicitudes ─────────────────────────────────────────────────── */}
      {lista === null ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-xl p-8 text-center text-sm"
             style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-subtle)" }}>
          {filtro === "PENDIENTE" ? "No hay solicitudes por revisar." : "No hay solicitudes en este estado."}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((s) => {
            const pendiente = s.estado === "PENDIENTE";
            return (
              <div key={s.id} className="rounded-xl p-4 space-y-3"
                   style={{ background: "var(--kipu-surface)", border: `1px solid ${pendiente
                     ? "color-mix(in srgb, var(--kipu-warning) 40%, transparent)" : "var(--kipu-border)"}` }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/admin/emisores/${s.emisor_id}`}
                          className="text-sm font-semibold truncate hover:underline block" style={{ color: "var(--kipu-text)" }}>
                      {s.razon_social}
                    </Link>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      RUC {s.ruc} · empresa {s.emisor_id} · #{s.id} · {fecha(s.created_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                    Nivel {s.nivel_actual} → {s.nivel_pedido}
                  </p>
                </div>

                <ListaCriterios criterios={s.criterios} />

                {!pendiente && (
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {s.aprobada_sola ? "Se aprobó sola (cumplía todo)" : `Resuelta por ${s.resuelta_por ?? "—"}`}
                    {s.resuelta_at && ` · ${fecha(s.resuelta_at)}`}
                    {s.nota && ` · nota: ${s.nota}`}
                  </p>
                )}

                {pendiente && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3"
                       style={{ borderTop: "1px solid var(--kipu-border)" }}>
                    <input
                      value={notas[s.id] ?? ""}
                      onChange={(ev) => setNotas((n) => ({ ...n, [s.id]: ev.target.value }))}
                      placeholder="Nota para el cliente (opcional; la ve si rechazas)"
                      maxLength={500}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={inputStyle}
                    />
                    <div className="flex gap-2">
                      <select
                        value={niveles[s.id] ?? s.nivel_pedido}
                        onChange={(ev) => setNiveles((n) => ({ ...n, [s.id]: Number(ev.target.value) }))}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={inputStyle}
                        aria-label="Nivel al aprobar"
                      >
                        {[2, 3].filter((n) => n > s.nivel_actual).map((n) => (
                          <option key={n} value={n}>Nivel {n}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => resolver(s, true)}
                        disabled={resolviendo === s.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: "var(--kipu-success)" }}
                      >
                        {resolviendo === s.id && <Loader2 size={12} className="animate-spin" />}
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => resolver(s, false)}
                        disabled={resolviendo === s.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ border: "1px solid var(--kipu-danger)", color: "var(--kipu-danger)" }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Nivel de una empresa ────────────────────────────────────────── */}
      <div className="rounded-xl p-4 space-y-3"
           style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Nivel de una empresa</p>
        <form onSubmit={(ev) => { ev.preventDefault(); buscar(); }} className="flex gap-2">
          <input
            value={busqueda}
            onChange={(ev) => setBusqueda(ev.target.value)}
            placeholder="RUC o nombre de la empresa"
            maxLength={100}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={buscando || busqueda.trim().length < 3}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" }}
          >
            {buscando ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Ver
          </button>
        </form>

        {encontradas && encontradas.length === 0 && (
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Ninguna empresa coincide.</p>
        )}
        {encontradas && encontradas.length > 1 && (
          <ul className="space-y-1">
            {encontradas.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => abrir(x.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--kipu-text)_6%,transparent)]"
                  style={{ border: `1px solid ${empresa?.id === x.id ? "var(--kipu-accent)" : "var(--kipu-border)"}`,
                           color: "var(--kipu-text)" }}
                >
                  <span className="font-medium">{x.razon_social}</span>
                  <span style={{ color: "var(--kipu-subtle)" }}>
                    {" · "}RUC {x.ruc} · {x.ambiente === 2 ? "producción" : "pruebas"} · nivel {x.uso_justo_nivel}
                    {x.uso_justo_nivel_manual && " (a mano)"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {empresa && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
              {empresa.razon_social}
              <span className="text-xs font-normal" style={{ color: "var(--kipu-subtle)" }}>
                {" · "}RUC {empresa.ruc} · {empresa.ambiente === 2 ? "producción" : "pruebas"}
              </span>
            </p>
            <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
              <strong style={{ color: "var(--kipu-text)" }}>Nivel {empresa.nivel}</strong>
              {empresa.manual && " (puesto a mano: no sube solo)"} · {empresa.limite_mes} al mes / {empresa.limite_dia} al día
              {" · "}lleva {empresa.usados_mes} este mes y {empresa.usados_hoy} hoy
            </p>
            {empresa.siguiente && (
              <div className="space-y-1">
                <p className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                  Para el nivel {empresa.siguiente}: {empresa.cumple ? "cumple" : "no cumple"}
                </p>
                <ListaCriterios criterios={empresa.criterios} />
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3"
                 style={{ borderTop: "1px solid var(--kipu-border)" }}>
              <select
                value={nuevoNivel}
                onChange={(ev) => setNuevoNivel(Number(ev.target.value))}
                className="px-2 py-1.5 rounded-lg text-xs outline-none"
                style={inputStyle}
                aria-label="Nuevo nivel"
              >
                {[1, 2, 3].map((n) => <option key={n} value={n}>Nivel {n} ({LIMITES[n]})</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kipu-muted)" }}>
                <input type="checkbox" checked={manual} onChange={(ev) => setManual(ev.target.checked)} />
                A mano (la subida automática no lo toca)
              </label>
              <input
                value={notaNivel}
                onChange={(ev) => setNotaNivel(ev.target.value)}
                placeholder="Motivo (queda en la auditoría)"
                maxLength={500}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={guardarNivel}
                disabled={guardando}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--kipu-accent)" }}
              >
                {guardando && <Loader2 size={12} className="animate-spin" />}
                Guardar nivel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
