"use client";
// Cobros en línea: la empresa conecta SU cuenta de Payphone o PagoPlux.
// Las credenciales nunca vuelven del servidor (solo los 4 últimos caracteres).
import { useConfirmar } from "@/components/ui/Confirmar";
import { useEffect, useState } from "react";
import { Copy, CheckCircle2, RefreshCw, Unplug, KeyRound } from "lucide-react";
import api from "@/lib/api";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { Campo, Entrada, EntradaClave } from "@/components/ui/Campo";
import { useAvisos } from "@/components/ui/Avisos";
import { detalleError } from "@/lib/errores";
import { useCopiar } from "@/lib/useCopiar";
import { cn } from "@/components/ui/cn";

interface CampoCred { key: string; label: string; secreto: boolean; requerido?: boolean }
interface Opcion { proveedor: string; nombre: string; campos: CampoCred[]; confirma_por_consulta: boolean }
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

/** Casilla con texto: toda la fila se toca. */
function Casilla({ marcada, onCambio, children }: { marcada: boolean; onCambio: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-acento"
             checked={marcada} onChange={(e) => onCambio(e.target.checked)} />
      <span className="text-sm text-tenue">{children}</span>
    </label>
  );
}

export default function TabCobrosEnLinea() {
  const confirmar = useConfirmar();
  const avisos    = useAvisos();
  const email = useAuthStore((s) => s.email) ?? "";
  const [opciones,   setOpciones]   = useState<Opcion[]>([]);
  const [conexiones, setConexiones] = useState<Conexion[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [editando,   setEditando]   = useState<string | null>(null);   // proveedor con el formulario abierto
  const [valores,    setValores]    = useState<Record<string, string>>({});
  const { copiar, copiado } = useCopiar();
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
      activo: true, link_automatico: conexiones.find(c => c.proveedor === proveedor)?.link_automatico ?? false,
    });
    setConexiones(res.data.data ?? []);
    setEditando(null);
    setValores({});
    avisos.exito("Cuenta conectada");
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
    if (!(await confirmar({
      titulo: "¿Generar una URL nueva?",
      mensaje: `La actual deja de funcionar y tendrás que pegar la nueva en ${c.nombre}.`,
      textoConfirmar: "Generar URL nueva", peligro: true,
    }))) return;
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

  if (cargando) return null;

  return (
    <div className="space-y-4">
      <p className="px-1 text-xs leading-relaxed text-sutil tactil:text-sm">
        Conecta tu cuenta de Payphone o PagoPlux. Al emitir una factura por cobrar puedes marcar
        &quot;Cobrar con link de pago&quot;: el link va en la factura y, cuando tu cliente paga, queda
        cobrada sola. Es opcional, factura por factura. El dinero va directo a tu cuenta.
      </p>

      {error && (
        <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto" role="alert">{error}</p>
      )}

      {opciones.map((op) => {
        const c = conexiones.find(x => x.proveedor === op.proveedor);
        const abierto = editando === op.proveedor;
        const completos = op.campos.every(f => f.requerido === false || (valores[f.key] ?? "").trim());
        return (
          <section key={op.proveedor} className="space-y-4 rounded-xl border border-borde bg-superficie p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-texto">{op.nombre}</h3>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium",
                  !c ? "text-sutil" : c.activo ? "bg-exito-suave text-exito-texto" : "bg-presionado text-tenue")}>
                  {!c ? "No conectada" : c.activo ? "Conectada" : "Pausada"}
                </span>
              </div>
              {!abierto && (
                <Boton variante="secundario" tamano="sm" icono={<KeyRound size={14} />} onClick={() => abrir(op.proveedor)}>
                  {c ? "Cambiar credenciales" : "Conectar"}
                </Boton>
              )}
            </div>

            {/* Conectada: datos visibles, opciones y URL de avisos */}
            {c && !abierto && (
              <div className="space-y-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                  {op.campos.map(f => (
                    <div key={f.key} className="flex min-w-0 justify-between gap-2">
                      <dt className="text-sutil">{f.label}</dt>
                      <dd className="truncate font-mono text-texto">{c.credenciales[f.key] ?? "—"}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <Casilla marcada={c.link_automatico} onCambio={(v) => cambiarOpcion(c, { link_automatico: v })}>
                    Marcar &quot;Cobrar con link de pago&quot; por defecto al emitir facturas por cobrar
                  </Casilla>
                  <Casilla marcada={c.activo} onCambio={(v) => cambiarOpcion(c, { activo: v })}>
                    Usar {op.nombre} para los links de pago
                  </Casilla>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-texto">URL de avisos de pago</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-presionado px-3 py-2.5 text-xs text-texto">
                      {c.webhook_url}
                    </code>
                    <BotonIcono
                      etiqueta={copiado === op.proveedor ? "Copiada" : "Copiar la URL"}
                      icono={copiado === op.proveedor ? <CheckCircle2 size={16} className="text-exito" /> : <Copy size={16} />}
                      variante="secundario"
                      onClick={() => copiar(c.webhook_url, null, op.proveedor)}
                    />
                  </div>
                  <p className="text-xs text-sutil">{AYUDA[op.proveedor]?.webhook}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Boton variante="secundario" tamano="sm" icono={<RefreshCw size={14} />} onClick={() => regenerar(c)}>
                    Nueva URL
                  </Boton>
                  <Boton variante="secundario" tamano="sm" icono={<Unplug size={14} />} className="text-peligro"
                         onClick={() => setDesconectando(op.proveedor)}>
                    Desconectar
                  </Boton>
                </div>

                {desconectando === op.proveedor && (
                  <div className="rounded-lg border border-peligro/30 p-3">
                    <p className="mb-3 text-xs text-tenue">
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
                <p className="text-xs text-sutil">{AYUDA[op.proveedor]?.credenciales}</p>
                {op.campos.map(f => (
                  <Campo key={f.key} etiqueta={f.label} opcional={f.requerido === false}>
                    {f.secreto ? (
                      <EntradaClave
                        autoComplete="off"
                        value={valores[f.key] ?? ""}
                        onChange={e => setValores(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <Entrada
                        autoComplete="off"
                        value={valores[f.key] ?? ""}
                        onChange={e => setValores(v => ({ ...v, [f.key]: e.target.value }))}
                      />
                    )}
                  </Campo>
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
                  <div className="grid grid-cols-2 gap-2">
                    <Boton variante="secundario" onClick={() => setEditando(null)}>Cancelar</Boton>
                    <Boton onClick={() => conectarPrimeraVez(op.proveedor)} disabled={!completos} cargando={guardando}>
                      {guardando ? "Probando…" : "Conectar"}
                    </Boton>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
