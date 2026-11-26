"use client";

// Eliminar mi cuenta (Apple y Google exigen que se pueda desde la app).
// El backend (POST /api/v1/app/cuenta/eliminacion) la bloquea al instante y la
// borra a los 30 días. Por cada empresa dice qué pasa: salir, eliminarla (era el
// único usuario) o, si era el único admin y hay más usuarios, elegir entre
// dejar a otro como administrador o eliminarla para todos.
// Se usa en Configuración → Zona de riesgo (con empresa) y en /bienvenida (sin empresa todavía).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { AlertTriangle, Building2, Download, Loader2, LogOut, Trash2, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { guardarYCompartir } from "@/lib/nativo";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { CUENTA_ELIMINADA } from "@/lib/cuenta";
import PinInput from "@/components/PinInput";
import { detalleError } from "@/lib/errores";

type Accion = "SALIR" | "TRANSFERIR" | "ELIMINAR";

interface EmpresaEliminacion {
  emisor_id:    number;
  ruc:          string;
  razon_social: string;
  mi_rol:       string;
  accion:       Accion | null;          // null: el usuario elige
  candidatos:   { profile_id: string; email: string; nombre: string | null }[];
  suscripcion:  { plan: string; estado: string } | null;
}

interface Resumen {
  dias_gracia:       number;
  fecha_eliminacion: string;
  requiere_pin:      boolean;
  empresas:          EmpresaEliminacion[];
}

interface Eleccion { accion: "TRANSFERIR" | "ELIMINAR" | null; nuevo_admin_id: string }

const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
}

type ErrorApi = { response?: { data?: unknown } };

/** Mensaje del backend aunque la respuesta venga como Blob (descargas). */
async function conDetalle(err: unknown): Promise<never> {
  const resp = (err as ErrorApi)?.response;
  if (resp && resp.data instanceof Blob) {
    try { resp.data = JSON.parse(await resp.data.text()); } catch {}
  }
  throw err;
}

export default function EliminarCuenta({ onCancelar }: { onCancelar?: () => void }) {
  const router   = useRouter();
  const empresa  = useAuthStore((s) => s.empresa);
  const logout   = useAuthStore((s) => s.logout);
  const email    = auth.currentUser?.email ?? "";

  const [resumen,    setResumen]    = useState<Resumen | null>(null);
  const [error,      setError]      = useState("");
  const [elecciones, setElecciones] = useState<Record<number, Eleccion>>({});
  const [entiendo,   setEntiendo]   = useState(false);
  const [paso,       setPaso]       = useState<"revisar" | "pin" | "exportar">("revisar");
  const [enviando,   setEnviando]   = useState(false);

  useEffect(() => {
    let vivo = true;
    api.get("/api/v1/app/cuenta/eliminacion")
      .then((r) => { if (vivo) setResumen(r.data); })
      .catch((e) => { if (vivo) setError(detalleError(e, "No pudimos cargar tu cuenta. Intenta de nuevo.")); });
    return () => { vivo = false; };
  }, []);

  if (error && !resumen) {
    return <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>;
  }
  if (!resumen) {
    return <Loader2 size={18} className="animate-spin mx-auto" style={{ color: "var(--kipu-accent)" }} />;
  }

  const fecha       = fechaLarga(resumen.fecha_eliminacion);
  const porDecidir  = resumen.empresas.filter((e) => e.accion === null);
  const faltaElegir = porDecidir.some((e) => {
    const el = elecciones[e.emisor_id];
    return !el?.accion || (el.accion === "TRANSFERIR" && !el.nuevo_admin_id);
  });
  const accionFinal = (e: EmpresaEliminacion): Accion | null => e.accion ?? elecciones[e.emisor_id]?.accion ?? null;
  // Descargar los XML: solo de la empresa abierta (el backend exporta la activa)
  const exportable  = resumen.empresas.find((e) => e.emisor_id === empresa?.id && accionFinal(e) === "ELIMINAR");

  const elegir = (id: number, cambio: Partial<Eleccion>) =>
    setElecciones((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { accion: null, nuevo_admin_id: "" }), ...cambio },
    }));

  const eliminar = async (pin?: string) => {
    const decisiones = porDecidir.map((e) => ({
      emisor_id:      e.emisor_id,
      accion:         elecciones[e.emisor_id]!.accion,
      nuevo_admin_id: elecciones[e.emisor_id]!.accion === "TRANSFERIR" ? elecciones[e.emisor_id]!.nuevo_admin_id : null,
    }));
    // Los errores (PIN malo, falta decidir, Stripe) los muestra PinInput
    const r = await api.post("/api/v1/app/cuenta/eliminacion", { pin: pin ?? null, decisiones });
    // El login lo muestra. sessionStorage y no ?query: al cerrar sesión,
    // providers.tsx también redirige a /login y podría ganar esa redirección
    try {
      sessionStorage.setItem(CUENTA_ELIMINADA,
        r.data?.inmediata ? "" : fechaLarga(r.data?.fecha_eliminacion ?? resumen.fecha_eliminacion));
    } catch {}
    try { await signOut(auth); } catch {}
    logout();
    router.replace("/login");
  };

  const sinPin = async () => {
    setEnviando(true);
    setError("");
    try {
      await eliminar();
    } catch (e) {
      setError(detalleError(e, "No pudimos eliminar tu cuenta. Intenta de nuevo."));
      setEnviando(false);
    }
  };

  const descargarXml = async (pin: string) => {
    const r = await api.get("/api/v1/app/auth/exportar-facturas", {
      params: { pin }, responseType: "blob", timeout: 120000,
    }).catch(conDetalle);
    // Web: descarga; app: hoja de compartir para guardarlo (lib/nativo.ts)
    await guardarYCompartir(r.data, `comprobantes_${exportable?.ruc ?? "kipu"}.zip`, { titulo: "Tus comprobantes" });
    setPaso("revisar");
  };

  if (paso === "pin") {
    return (
      <PinInput
        tipoAccion="NUKE"
        email={email}
        label="eliminar tu cuenta"
        onConfirmar={eliminar}
        onCancelar={() => setPaso("revisar")}
      />
    );
  }
  if (paso === "exportar") {
    return (
      <PinInput
        tipoAccion="EXPORTAR_DATOS"
        email={email}
        label="descargar tus comprobantes"
        onConfirmar={descargarXml}
        onCancelar={() => setPaso("revisar")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl px-4 py-3"
           style={{ background: "color-mix(in srgb, var(--kipu-danger) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--kipu-danger) 25%, transparent)" }}>
        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
        <p className="text-sm" style={{ color: "var(--kipu-text)" }}>
          Tu cuenta se bloquea en este momento y el <strong>{fecha}</strong> borramos tus datos
          para siempre. Si cambias de opinión antes de esa fecha, escríbenos a soporte.
        </p>
      </div>

      {resumen.empresas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
            Qué pasa con tus empresas
          </p>
          {resumen.empresas.map((e) => {
            const el = elecciones[e.emisor_id];
            const final = accionFinal(e);
            return (
              <div key={e.emisor_id} className="rounded-xl p-3 space-y-2" style={caja}>
                <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--kipu-text)" }}>
                  <Building2 size={14} style={{ color: "var(--kipu-subtle)" }} />
                  {e.razon_social}
                  <span className="text-xs font-normal" style={{ color: "var(--kipu-subtle)" }}>{e.ruc}</span>
                </p>

                {e.accion === "SALIR" && (
                  <p className="flex items-start gap-1.5 text-xs" style={{ color: "var(--kipu-muted)" }}>
                    <LogOut size={13} className="shrink-0 mt-px" />
                    Sales de esta empresa. Sigue funcionando para los demás usuarios.
                  </p>
                )}

                {e.accion === null && (
                  <div className="space-y-2 text-xs" style={{ color: "var(--kipu-text)" }}>
                    <p style={{ color: "var(--kipu-muted)" }}>
                      Eres el único administrador y hay más usuarios. Elige qué pasa:
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name={`emp-${e.emisor_id}`} className="mt-0.5"
                             checked={el?.accion === "TRANSFERIR"}
                             onChange={() => elegir(e.emisor_id, { accion: "TRANSFERIR" })} />
                      <span className="flex-1 space-y-1.5">
                        <span className="flex items-center gap-1.5"><UserCheck size={13} /> Dejar a otro usuario como administrador</span>
                        {el?.accion === "TRANSFERIR" && (
                          <select
                            value={el.nuevo_admin_id}
                            onChange={(ev) => elegir(e.emisor_id, { nuevo_admin_id: ev.target.value })}
                            className="w-full rounded-lg px-2 py-1.5 text-xs"
                            style={{ ...caja, color: "var(--kipu-text)" }}
                          >
                            <option value="">Elige un usuario…</option>
                            {e.candidatos.map((c) => (
                              <option key={c.profile_id} value={c.profile_id}>
                                {c.nombre ? `${c.nombre} — ${c.email}` : c.email}
                              </option>
                            ))}
                          </select>
                        )}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name={`emp-${e.emisor_id}`} className="mt-0.5"
                             checked={el?.accion === "ELIMINAR"}
                             onChange={() => elegir(e.emisor_id, { accion: "ELIMINAR" })} />
                      <span className="flex items-center gap-1.5"><Trash2 size={13} /> Eliminar la empresa para todos</span>
                    </label>
                  </div>
                )}

                {final === "ELIMINAR" && (
                  <div className="text-xs space-y-1" style={{ color: "var(--kipu-danger)" }}>
                    <p className="flex items-start gap-1.5">
                      <Trash2 size={13} className="shrink-0 mt-px" />
                      Se elimina con sus comprobantes (XML y PDF), clientes, productos, cuentas y reportes.
                      Su firma electrónica y la clave del SRI se borran al instante.
                    </p>
                    {e.suscripcion && (
                      <p className="pl-5">La suscripción de esta empresa se cancela hoy.</p>
                    )}
                    <p className="pl-5" style={{ color: "var(--kipu-muted)" }}>
                      Los comprobantes autorizados siguen disponibles en el SRI; recuerda que debes conservarlos.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Antes de borrar: llevarse los XML (en la app, desde la web: la descarga llega con los plugins nativos) */}
      {exportable && !ES_APP_NATIVA && (
        <button
          type="button"
          onClick={() => setPaso("exportar")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-colors"
          style={{ ...caja, color: "var(--kipu-text)" }}
        >
          <Download size={15} /> Descargar mis comprobantes (XML) antes
        </button>
      )}
      {exportable && ES_APP_NATIVA && (
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Si necesitas tus comprobantes en XML, descárgalos antes desde app.kipu.ec.
        </p>
      )}

      <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: "var(--kipu-text)" }}>
        <input type="checkbox" className="mt-1" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
        Entiendo que después del {fecha} no se puede recuperar nada.
      </label>

      {error && <p className="text-xs" style={{ color: "var(--kipu-danger)" }}>{error}</p>}

      <div className="flex gap-3">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{ border: "1px solid var(--kipu-border)", color: "var(--kipu-muted)" }}
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          disabled={!entiendo || faltaElegir || enviando}
          onClick={() => (resumen.requiere_pin ? setPaso("pin") : sinPin())}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "var(--kipu-danger)" }}
        >
          {enviando && <Loader2 size={14} className="animate-spin" />}
          Eliminar mi cuenta
        </button>
      </div>
    </div>
  );
}
