"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, FileText, KeyRound, Loader2, MessageCircle, Send, Upload } from "lucide-react";
import api from "@/lib/api";
import { caja, campo, detalle, Etiqueta, fecha, Vence, type Yo } from "../_comun";

interface Gestion {
  id: number; tipo: string; nombre: string; estado: string; vencimiento: string; dias: number;
  valor_a_pagar: number | null; resumen: string | null; resumen_enviado_at: string | null;
  numero_formulario: string | null; tiene_comprobante: boolean; presentado_at: string | null; contador: string | null;
}
interface Detalle {
  emisor: { id: number; ruc: string; razon_social: string; nombre_comercial: string | null; periodo_iva: string; regimen: string | null; direccion: string };
  contacto: { nombre: string | null; email: string | null; whatsapp: string | null } | null;
  suscripcion: { estado: string; cancela: boolean; pagado_hasta: string | null };
  clave_guardada_at: string | null;
  asignaciones: { contador: string; desde: string; hasta: string | null; motivo: string | null; asignado_por: string | null }[];
  gestiones: Gestion[];
  accesos_clave: { accion: string; motivo: string; email: string | null; fecha: string }[];
}
interface Contador { id: string; nombre: string; activo: boolean }

function waLink(numero: string | null) {
  if (!numero) return null;
  const n = numero.replace(/\D/g, "");
  return `https://wa.me/${n.startsWith("0") ? "593" + n.slice(1) : n}`;
}

// ── Una declaración y sus acciones ────────────────────────────────────────────
function FilaGestion({ g, emisorId, alCambiar }: { g: Gestion; emisorId: number; alCambiar: () => void }) {
  const [modo,     setModo]     = useState<"" | "resumen" | "presentar">("");
  const [resumen,  setResumen]  = useState(g.resumen ?? "");
  const [valor,    setValor]    = useState(g.valor_a_pagar?.toString() ?? "");
  const [numero,   setNumero]   = useState("");
  const [pdf,      setPdf]      = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error,    setError]    = useState("");
  const [ahora]                 = useState(() => Date.now());
  const base = `/api/v1/admin/al-dia/clientes/${emisorId}/gestiones/${g.id}`;
  const abierta = g.estado === "PENDIENTE" || g.estado === "RESUMEN_ENVIADO";

  const accion = async (fn: () => Promise<unknown>) => {
    setEnviando(true);
    setError("");
    try {
      await fn();
      setModo("");
      alCambiar();
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo guardar."));
    } finally {
      setEnviando(false);
    }
  };

  const enviarResumen = () => accion(() => api.post(`${base}/resumen`, { resumen, valor_a_pagar: Number(valor || 0) }));
  const presentar = () => accion(() => {
    const datos = new FormData();
    datos.append("valor_a_pagar", String(Number(valor || 0)));
    if (numero.trim()) datos.append("numero_formulario", numero.trim());
    if (pdf) datos.append("comprobante", pdf);
    return api.post(`${base}/presentada`, datos, { headers: { "Content-Type": "multipart/form-data" } });
  });
  const verComprobante = async () => {
    try {
      const r = await api.get(`${base}/comprobante`);
      window.open(r.data.url, "_blank", "noopener");
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo abrir el comprobante."));
    }
  };

  return (
    <div className="py-3 space-y-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>{g.nombre}</span>
        <Etiqueta estado={g.estado} />
        <Vence dias={g.dias} estado={g.estado} />
        <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>vence {fecha(g.vencimiento)}</span>
      </div>

      {g.resumen_enviado_at && g.estado !== "PRESENTADO" && (
        <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
          Resumen enviado el {new Date(g.resumen_enviado_at).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
          {g.valor_a_pagar !== null && ` · $${g.valor_a_pagar.toFixed(2)}`}
          {ahora - new Date(g.resumen_enviado_at).getTime() < 864e5 && " · espera 24 h antes de presentar"}
        </p>
      )}
      {g.estado === "PRESENTADO" && (
        <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
          Presentada el {fecha(g.presentado_at)}{g.contador && ` por ${g.contador}`}
          {g.valor_a_pagar !== null && ` · a pagar $${g.valor_a_pagar.toFixed(2)}`}
          {g.numero_formulario && ` · formulario ${g.numero_formulario}`}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {abierta && (
          <>
            <button type="button" onClick={() => setModo(modo === "resumen" ? "" : "resumen")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{ ...caja, color: "var(--kipu-text)" }}>
              <Send size={13} /> {g.resumen_enviado_at ? "Reenviar resumen" : "Enviar resumen"}
            </button>
            <button type="button" onClick={() => setModo(modo === "presentar" ? "" : "presentar")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white" style={{ background: "var(--kipu-accent)" }}>
              <Upload size={13} /> Marcar presentada
            </button>
            <button type="button" disabled={enviando}
                    onClick={() => confirm("¿Marcar que este período no se presenta porque no pagó el servicio? Se le avisa por WhatsApp.") &&
                      accion(() => api.post(`${base}/no-pagado`))}
                    className="px-2.5 py-1.5 rounded-lg" style={{ color: "var(--kipu-danger)" }}>
              No pagó
            </button>
          </>
        )}
        {g.estado === "NO_PAGADO" && (
          <button type="button" disabled={enviando} onClick={() => accion(() => api.post(`${base}/reabrir`))}
                  className="px-2.5 py-1.5 rounded-lg" style={{ ...caja, color: "var(--kipu-text)" }}>
            Ya pagó: reabrir
          </button>
        )}
        {g.tiene_comprobante && (
          <button type="button" onClick={verComprobante} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                  style={{ ...caja, color: "var(--kipu-text)" }}>
            <FileText size={13} /> Ver comprobante
          </button>
        )}
      </div>

      {modo === "resumen" && (
        <div className="space-y-2 rounded-lg p-3" style={campo}>
          <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={3} maxLength={1500}
                    placeholder="Ej.: Ventas $1.200,00 · Compras con IVA $300,00 · Retenciones $12,00"
                    className="w-full text-sm bg-transparent focus:outline-none" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs" style={{ color: "var(--kipu-muted)" }}>Valor a pagar $</label>
            <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal"
                   className="w-28 px-2 py-1.5 rounded text-sm" style={campo} />
            <button type="button" onClick={enviarResumen} disabled={enviando || resumen.trim().length < 5}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: "var(--kipu-accent)" }}>
              {enviando ? "Enviando..." : "Enviar por WhatsApp y correo"}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>
            El cliente recibe el resumen, el valor y la fecha límite, y tiene 24 horas para avisar si algo no está bien.
          </p>
        </div>
      )}

      {modo === "presentar" && (
        <div className="space-y-2 rounded-lg p-3" style={campo}>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs" style={{ color: "var(--kipu-muted)" }}>Valor a pagar $</label>
            <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal"
                   className="w-28 px-2 py-1.5 rounded text-sm" style={campo} />
            <label className="text-xs" style={{ color: "var(--kipu-muted)" }}>N.º formulario</label>
            <input value={numero} onChange={e => setNumero(e.target.value)} inputMode="numeric" maxLength={40}
                   className="w-40 px-2 py-1.5 rounded text-sm" style={campo} />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--kipu-muted)" }}>
            <input type="file" accept="application/pdf" onChange={e => setPdf(e.target.files?.[0] ?? null)} className="text-xs" />
            Comprobante del SRI (PDF)
          </label>
          <button type="button" onClick={presentar} disabled={enviando}
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: "var(--kipu-accent)" }}>
            {enviando ? "Guardando..." : "Guardar y avisar al cliente"}
          </button>
          <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>
            Al cliente le llega el comprobante por correo y un WhatsApp con el valor y la fecha límite. En su Kipu queda declarada.
          </p>
        </div>
      )}
      {error && <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
    </div>
  );
}

// ── Ver la clave del SRI (con motivo) ─────────────────────────────────────────
function VerClave({ emisorId, alVer }: { emisorId: number; alVer: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [clave,  setClave]  = useState("");
  const [error,  setError]  = useState("");
  const [abierto, setAbierto] = useState(false);

  // Se oculta sola al minuto
  useEffect(() => {
    if (!clave) return;
    const t = setTimeout(() => setClave(""), 60_000);
    return () => clearTimeout(t);
  }, [clave]);

  const ver = async () => {
    setError("");
    try {
      const r = await api.post(`/api/v1/admin/al-dia/${emisorId}/clave-sri/ver`, { motivo });
      setClave(r.data.clave);
      setMotivo("");
      alVer();
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo ver la clave."));
    }
  };

  if (clave) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <code className="px-2 py-1 rounded text-sm" style={campo}>{clave}</code>
        <button type="button" onClick={() => navigator.clipboard.writeText(clave)} className="inline-flex items-center gap-1 text-xs underline"
                style={{ color: "var(--kipu-accent)" }}>
          <Copy size={12} /> Copiar
        </button>
        <span className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>Se oculta en 1 minuto</span>
      </div>
    );
  }
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center gap-1 text-sm underline"
              style={{ color: "var(--kipu-accent)" }}>
        <KeyRound size={14} /> Ver clave
      </button>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <input value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={300} autoFocus
               placeholder="¿Para qué? Ej.: IVA de octubre" className="flex-1 min-w-48 px-2 py-1.5 rounded text-sm" style={campo} />
        <button type="button" onClick={ver} disabled={motivo.trim().length < 5}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: "var(--kipu-accent)" }}>
          Ver
        </button>
      </div>
      <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>Queda registrado con tu nombre; el cliente lo ve.</p>
      {error && <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
    </div>
  );
}

// ── Asignar contador (superadmin) ─────────────────────────────────────────────
function Asignar({ emisorId, alCambiar }: { emisorId: number; alCambiar: () => void }) {
  const [contadores, setContadores] = useState<Contador[]>([]);
  const [elegido, setElegido] = useState("");
  const [motivo,  setMotivo]  = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    let vivo = true;
    api.get("/api/v1/admin/al-dia/contadores")
      .then(r => { if (vivo) setContadores((r.data.data as Contador[]).filter(c => c.activo)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const asignar = async () => {
    setError("");
    try {
      await api.post(`/api/v1/admin/al-dia/clientes/${emisorId}/asignar`, { contador_id: elegido, motivo: motivo || null });
      setElegido("");
      setMotivo("");
      alCambiar();
    } catch (err: unknown) {
      setError(detalle(err, "No se pudo asignar."));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select value={elegido} onChange={e => setElegido(e.target.value)} className="px-2 py-1.5 rounded text-sm" style={campo}>
        <option value="">Asignar a…</option>
        {contadores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opcional)" maxLength={300}
             className="flex-1 min-w-40 px-2 py-1.5 rounded text-sm" style={campo} />
      <button type="button" onClick={asignar} disabled={!elegido}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: "var(--kipu-accent)" }}>
        Asignar
      </button>
      {error && <p className="w-full text-xs" style={{ color: "var(--kipu-danger)" }}>{error}</p>}
    </div>
  );
}

export default function ClienteAlDiaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const emisorId = Number(id);
  const [d,     setD]     = useState<Detalle | null>(null);
  const [yo,    setYo]    = useState<Yo | null>(null);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    try {
      const r = await api.get(`/api/v1/admin/al-dia/clientes/${emisorId}`);
      setD(r.data.data);
    } catch (err: unknown) {
      setError(detalle(err, "No pudimos cargar el cliente."));
    }
  }, [emisorId]);

  useEffect(() => {
    let vivo = true;
    Promise.all([api.get("/api/v1/admin/al-dia/yo"), api.get(`/api/v1/admin/al-dia/clientes/${emisorId}`)])
      .then(([y, c]) => { if (vivo) { setYo(y.data.data); setD(c.data.data); } })
      .catch((err: unknown) => {
        if (!vivo) return;
        // Sin acceso (no es del equipo o el cliente no está asignado): a la lista
        if ((err as { response?: { status?: number } })?.response?.status === 403) router.replace("/equipo");
        else setError(detalle(err, "No pudimos cargar el cliente."));
      });
    return () => { vivo = false; };
  }, [emisorId, router]);

  if (!d) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        {error ? <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
               : <Loader2 size={22} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} />}
      </div>
    );
  }

  const wa = waLink(d.contacto?.whatsapp ?? null);
  const actual = d.asignaciones.find(a => !a.hasta);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <Link href="/equipo" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--kipu-muted)" }}>
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Cliente */}
      <div className="rounded-xl p-5 space-y-2" style={caja}>
        <h1 className="text-lg font-bold" style={{ color: "var(--kipu-text)" }}>{d.emisor.razon_social}</h1>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          RUC {d.emisor.ruc} · IVA {d.emisor.periodo_iva === "SEMESTRAL" ? "semestral" : "mensual"}
          {d.emisor.regimen && ` · ${d.emisor.regimen}`}
        </p>
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
          {d.contacto?.nombre ?? "—"} · {d.contacto?.email ?? "sin correo"}
          {wa && (
            <> · <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline"
                    style={{ color: "var(--kipu-accent)" }}><MessageCircle size={13} /> {d.contacto?.whatsapp}</a></>
          )}
        </p>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Suscripción {d.suscripcion.estado.toLowerCase()} · pagado hasta {fecha(d.suscripcion.pagado_hasta)}
          {d.suscripcion.cancela && " · cancela al fin del período"}
        </p>
      </div>

      {/* Clave del SRI */}
      <div className="rounded-xl p-5 space-y-2" style={caja}>
        <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>Clave del SRI</p>
        {d.clave_guardada_at
          ? <VerClave emisorId={emisorId} alVer={recargar} />
          : <p className="text-sm" style={{ color: "var(--kipu-warning)" }}>El cliente todavía no la guarda (Kipu Al Día → Tu clave del SRI).</p>}
        {d.accesos_clave.length > 0 && (
          <ul className="text-xs space-y-0.5 pt-1" style={{ color: "var(--kipu-subtle)" }}>
            {d.accesos_clave.slice(0, 5).map((a, i) => (
              <li key={i}>{new Date(a.fecha).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })} · {a.accion} · {a.email ?? "sistema"} — {a.motivo}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Declaraciones */}
      <div className="rounded-xl px-5 pt-4 pb-2" style={caja}>
        <p className="font-semibold text-sm pb-2" style={{ color: "var(--kipu-text)" }}>Declaraciones</p>
        {d.gestiones.length === 0
          ? <p className="text-sm pb-3" style={{ color: "var(--kipu-muted)" }}>Nada que declarar por ahora.</p>
          : d.gestiones.map(g => <FilaGestion key={g.id} g={g} emisorId={emisorId} alCambiar={recargar} />)}
      </div>

      {/* Contador */}
      <div className="rounded-xl p-5 space-y-3" style={caja}>
        <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>
          Contador: {actual ? actual.contador : <span style={{ color: "var(--kipu-warning)" }}>sin asignar</span>}
        </p>
        {yo?.es_superadmin && <Asignar emisorId={emisorId} alCambiar={recargar} />}
        {d.asignaciones.length > 0 && (
          <ul className="text-xs space-y-0.5" style={{ color: "var(--kipu-subtle)" }}>
            {d.asignaciones.map((a, i) => (
              <li key={i}>
                {a.contador}: {fecha(a.desde)} → {a.hasta ? fecha(a.hasta) : "hoy"}
                {a.asignado_por && ` · asignó ${a.asignado_por}`}{a.motivo && ` · ${a.motivo}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
