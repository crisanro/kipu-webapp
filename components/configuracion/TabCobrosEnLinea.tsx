"use client";
// Cobros en línea: la empresa conecta SU cuenta de Payphone o PagoPlux.
// Las credenciales nunca vuelven del servidor (solo los 4 últimos caracteres).
import { useEffect, useState } from "react";
import { CreditCard, Copy, CheckCircle2, RefreshCw, Unplug, KeyRound } from "lucide-react";
import api from "@/lib/api";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

interface Campo { key: string; label: string; secreto: boolean; requerido?: boolean }
interface Opcion { proveedor: string; nombre: string; campos: Campo[]; confirma_por_consulta: boolean }
interface Conexion {
  proveedor:       string;
  nombre:          string;
  activo:          boolean;
  link_automatico: boolean;
  credenciales:    Record<string, string | null>;
  webhook_url:     string;
}

const AYUDA: Record<string, { credenciales: string; webhook: string }> = {
  PAYPHONE: {
    credenciales: "El token y el Store ID están en Payphone Developer → tu aplicación.",
    webhook: "En Payphone solicita la \"Notificación externa\" y registra esta URL (la activan en 3 a 5 días "
           + "hábiles). Mientras tanto Kipu revisa cada hora si tus clientes pagaron.",
  },
  PAGOPLUX: {
    credenciales: "El Client ID y la Secret Key te los entrega PagoPlux para integraciones.",
    webhook: "Pega esta URL en tu panel de PagoPlux como URL de notificación de pagos.",
  },
};

const detalleError = (e: unknown, porDefecto: string): string =>
  (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? porDefecto;

const tarjeta = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
const input = {
  background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)",
};

export default function TabCobrosEnLinea() {
  const email = useAuthStore((s) => s.email) ?? "";
  const [opciones,   setOpciones]   = useState<Opcion[]>([]);
  const [conexiones, setConexiones] = useState<Conexion[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [editando,   setEditando]   = useState<string | null>(null);   // proveedor con el formulario abierto
  const [valores,    setValores]    = useState<Record<string, string>>({});
  const [copiado,    setCopiado]    = useState<string | null>(null);
  const [error,      setError]      = useState("");
  const [guardando,  setGuardando]  = useState(false);
  const [desconectando, setDesconectando] = useState<string | null>(null);   // proveedor pidiendo PIN

  const cargar = () =>
    Promise.all([
      api.get("/api/v1/app/cobros-en-linea/opciones"),
      api.get("/api/v1/app/cobros-en-linea/config"),
    ])
      .then(([o, c]) => {
        setOpciones(o.data.data ?? []);
        setConexiones(c.data.data ?? []);
      })
      .catch(e => console.error(e))
      .finally(() => setCargando(false));
  useEffect(() => { cargar(); }, []);

  const abrir = (p: string) => { setEditando(p); setValores({}); setError(""); };

  // Primera conexión: sin PIN (se avisa por correo a los administradores).
  // Cambiar credenciales: con PIN (los pagos irían a otra cuenta).
  const conectar = async (proveedor: string, pin?: string) => {
    const res = await api.put("/api/v1/app/cobros-en-linea/config", {
      proveedor, credenciales: valores, ...(pin ? { pin } : {}),
      activo: true, link_automatico: conexiones.find(c => c.proveedor === proveedor)?.link_automatico ?? true,
    });
    setConexiones(res.data.data ?? []);
    setEditando(null);
    setValores({});
  };

  const conectarPrimeraVez = async (proveedor: string) => {
    setGuardando(true); setError("");
    try {
      await conectar(proveedor);
    } catch (e) {
      setError(detalleError(e, "No se pudo conectar."));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarOpcion = async (c: Conexion, cambio: Partial<Conexion>) => {
    setError("");
    try {
      const res = await api.put("/api/v1/app/cobros-en-linea/config", {
        proveedor: c.proveedor, activo: cambio.activo ?? c.activo,
        link_automatico: cambio.link_automatico ?? c.link_automatico,
      });
      setConexiones(res.data.data ?? []);
    } catch (e) {
      setError(detalleError(e, "No se pudo guardar el cambio."));
    }
  };

  const regenerar = async (c: Conexion) => {
    if (!confirm(`¿Generar una URL nueva? La actual deja de funcionar y tendrás que pegar la nueva en ${c.nombre}.`)) return;
    try {
      const res = await api.post(`/api/v1/app/cobros-en-linea/config/${c.proveedor}/regenerar-webhook`);
      setConexiones(res.data.data ?? []);
    } catch (e) {
      setError(detalleError(e, "No se pudo generar la URL."));
    }
  };

  // Desconectar pide el PIN del correo (PinInput muestra el error si falla)
  const desconectar = async (proveedor: string, pin: string) => {
    await api.delete(`/api/v1/app/cobros-en-linea/config/${proveedor}?pin=${encodeURIComponent(pin)}`);
    setDesconectando(null);
    await cargar();
  };

  const copiar = async (texto: string, id: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  if (cargando) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={tarjeta}>
      <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
        <CreditCard size={18} className="mt-0.5 shrink-0" style={{ color: "var(--kipu-accent)" }} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>Cobros en línea</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
            Conecta tu cuenta de Payphone o PagoPlux: tus facturas por cobrar llevan un link de pago y,
            cuando tu cliente paga, la factura queda cobrada sola. El dinero va directo a tu cuenta.
          </p>
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-4 text-xs px-3 py-2 rounded-lg"
           style={{ color: "var(--kipu-danger)", background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)" }}>
          {error}
        </p>
      )}

      <div>
        {opciones.map((op, i) => {
          const c = conexiones.find(x => x.proveedor === op.proveedor);
          const abierto = editando === op.proveedor;
          const completos = op.campos.every(f => f.requerido === false || (valores[f.key] ?? "").trim());
          return (
            <div key={op.proveedor} className="px-5 py-4 space-y-3"
                 style={i > 0 ? { borderTop: "1px solid var(--kipu-border)" } : undefined}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{op.nombre}</span>
                  {c ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ color: c.activo ? "var(--kipu-success)" : "var(--kipu-subtle)",
                                   background: `color-mix(in srgb, ${c.activo ? "var(--kipu-success)" : "var(--kipu-subtle)"} 12%, transparent)` }}>
                      {c.activo ? "Conectada" : "Pausada"}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>No conectada</span>
                  )}
                </div>
                {!abierto && (
                  <button onClick={() => abrir(op.proveedor)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                          style={{ color: "var(--kipu-accent)", border: "1px solid color-mix(in srgb, var(--kipu-accent) 35%, transparent)" }}>
                    <KeyRound size={12} />
                    {c ? "Cambiar credenciales" : "Conectar"}
                  </button>
                )}
              </div>

              {/* Conectada: datos visibles, opciones y URL de avisos */}
              {c && !abierto && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {op.campos.map(f => (
                      <div key={f.key} className="flex justify-between gap-2 min-w-0">
                        <span style={{ color: "var(--kipu-subtle)" }}>{f.label}</span>
                        <span className="font-mono truncate" style={{ color: "var(--kipu-text)" }}>
                          {c.credenciales[f.key] ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "var(--kipu-muted)" }}>
                    <input type="checkbox" className="mt-0.5" checked={c.link_automatico}
                           onChange={e => cambiarOpcion(c, { link_automatico: e.target.checked })} />
                    Agregar el link de pago al correo de las facturas por cobrar
                  </label>
                  <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "var(--kipu-muted)" }}>
                    <input type="checkbox" className="mt-0.5" checked={c.activo}
                           onChange={e => cambiarOpcion(c, { activo: e.target.checked })} />
                    Usar {op.nombre} para los links de pago
                  </label>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>URL de avisos de pago</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate text-[11px] px-2.5 py-2 rounded-lg"
                            style={{ background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)", color: "var(--kipu-text)" }}>
                        {c.webhook_url}
                      </code>
                      <button onClick={() => copiar(c.webhook_url, op.proveedor)} title="Copiar"
                              className="p-2 rounded-lg shrink-0" style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
                        {copiado === op.proveedor ? <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>{AYUDA[op.proveedor]?.webhook}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => regenerar(c)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                            style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
                      <RefreshCw size={12} /> Nueva URL
                    </button>
                    <button onClick={() => setDesconectando(op.proveedor)}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                            style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-danger)" }}>
                      <Unplug size={12} /> Desconectar
                    </button>
                  </div>

                  {desconectando === op.proveedor && (
                    <div className="rounded-lg p-3" style={{ border: "1px solid color-mix(in srgb, var(--kipu-danger) 30%, transparent)" }}>
                      <p className="text-xs mb-3" style={{ color: "var(--kipu-muted)" }}>
                        Al desconectar {op.nombre}, tus facturas dejan de llevar link de pago y los links
                        pendientes ya no se podrán verificar.
                      </p>
                      <PinInput
                        tipoAccion="DESCONECTAR_PASARELA"
                        email={email}
                        label={`desconectar ${op.nombre}`}
                        onCancelar={() => setDesconectando(null)}
                        onConfirmar={pin => desconectar(op.proveedor, pin)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Formulario de credenciales + PIN */}
              {abierto && (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{AYUDA[op.proveedor]?.credenciales}</p>
                  {op.campos.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>
                        {f.label}{f.requerido === false && " (opcional)"}
                      </label>
                      <input
                        type={f.secreto ? "password" : "text"}
                        autoComplete="off"
                        value={valores[f.key] ?? ""}
                        onChange={e => setValores(v => ({ ...v, [f.key]: e.target.value }))}
                        className="w-full px-2.5 py-2 rounded-lg text-sm focus:outline-none"
                        style={input}
                      />
                    </div>
                  ))}
                  {completos && c ? (
                    // Cambiar credenciales de una pasarela ya conectada: con PIN
                    <PinInput
                      tipoAccion="CONFIGURAR_PASARELA"
                      email={email}
                      label={`cambiar las credenciales de ${op.nombre}`}
                      onCancelar={() => setEditando(null)}
                      onConfirmar={pin => conectar(op.proveedor, pin)}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditando(null)}
                              className="flex-1 py-2 rounded-lg text-xs"
                              style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}>
                        Cancelar
                      </button>
                      <button onClick={() => conectarPrimeraVez(op.proveedor)} disabled={!completos || guardando}
                              className="flex-1 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                              style={{ background: "var(--kipu-accent)" }}>
                        {guardando ? "Probando credenciales…" : "Conectar"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
