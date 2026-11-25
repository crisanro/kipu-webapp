"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, CheckCircle2, Plus, Star } from "lucide-react";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import { useAuthStore } from "@/store/auth.store";
import { SESSION_EMPRESA_KEY } from "@/app/providers";
import api from "@/lib/api";

export function ModalLogout({ onConfirm, onCancel, cerrando = false }: {
  onConfirm: () => void;
  onCancel: () => void;
  cerrando?: boolean;
}) {
  // Se monta solo al pedir cerrar sesión (por eso abierta fija)
  return (
    <Hoja
      abierta
      onCerrar={onCancel}
      titulo="¿Cerrar sesión?"
      descripcion="Se cerrará tu sesión en este dispositivo."
      tamano="sm"
      cerrable={!cerrando}
      pie={<>
        <Boton variante="secundario" onClick={onCancel} disabled={cerrando} data-autofocus>Cancelar</Boton>
        <Boton variante="peligro" onClick={onConfirm} cargando={cerrando} icono={<LogOut size={16} />}>
          {cerrando ? "Cerrando…" : "Cerrar sesión"}
        </Boton>
      </>}
    />
  );
}

export function SelectorEmpresa({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { empresas, empresa, setEmpresa, setEmpresas } = useAuthStore();
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [guardandoDefault, setGuardandoDefault] = useState<number | null>(null);
  const [defaultId, setDefaultId] = useState<number | null>(
    () => (empresas as any[]).find((e) => e.es_default)?.id ?? null
  );

  const cambiar = async (e: any) => {
    if (e.id === empresa?.id) {
      onClose();
      return;
    }
    setCambiando(e.id);
    try {
      const res = await api.post("/api/v1/app/usuarios/empresas/cambiar", { emisor_id: e.id });
      const data = res.data.data;
      setEmpresa({
        id: e.id,
        ruc: data.ruc,
        razon_social: data.razon_social,
        nombre_comercial: e.nombre_comercial,
        ambiente: data.ambiente,
        tipo_emisor: data.tipo_emisor,
        rol: data.rol,
        permisos: data.permisos,
        firma_ok: e.firma_ok,
        suscripcion_activa: data.suscripcion_activa,
        suscripcion: data.suscripcion,
        balance_api: data.balance_api,
        emision_gratis: data.emision_gratis ?? false,
        emite_retenciones: data.emite_retenciones ?? false,
        obligado_contabilidad: data.obligado_contabilidad ?? e.obligado_contabilidad ?? null,
        periodo_iva: data.periodo_iva ?? e.periodo_iva ?? null,
      });
      localStorage.setItem("kipu-ext-emisor", String(e.id));
      localStorage.setItem("kipu-ext-ruc", data.ruc);
      localStorage.setItem("kipu-ext-razon", data.razon_social);
      sessionStorage.clear();
      // DESPUÉS del clear: recordar la empresa elegida para la recarga
      sessionStorage.setItem(SESSION_EMPRESA_KEY, String(e.id));
      onClose();
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
    } finally {
      setCambiando(null);
    }
  };

  const toggleDefault = async (e: any) => {
    const nuevo = defaultId === e.id ? null : e.id;
    setGuardandoDefault(e.id);
    try {
      await api.put("/api/v1/app/usuarios/empresas/default", { emisor_id: nuevo });
      setDefaultId(nuevo);
      setEmpresas((empresas as any[]).map((x) => ({ ...x, es_default: x.id === nuevo })));
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoDefault(null);
    }
  };

  const empresasOrdenadas = [...(empresas as any[])].sort((a, b) => {
    if (a.id === defaultId) return -1;
    if (b.id === defaultId) return 1;
    if (a.rol === "admin" && b.rol !== "admin") return -1;
    if (b.rol === "admin" && a.rol !== "admin") return 1;
    return (a.nombre_comercial || a.razon_social).localeCompare(b.nombre_comercial || b.razon_social);
  });

  // Se monta solo al abrir el selector (por eso abierta fija)
  return (
    <Hoja
      abierta
      onCerrar={onClose}
      titulo="Cambiar empresa"
      tamano="sm"
      pie={
        <button
          onClick={() => {
            onClose();
            router.push("/nueva-empresa");
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-borde text-sm text-tenue transition-colors hover:border-tenue hover:text-texto active:bg-presionado"
        >
          <Plus size={14} /> Agregar empresa
        </button>
      }
    >
        {/* Filas de borde a borde dentro de la hoja */}
        <div className="-mx-5 border-t border-borde">
          {empresasOrdenadas.map((e) => {
            const activa = e.id === empresa?.id;
            const esDefault = e.id === defaultId;
            return (
              <div
                key={e.id}
                className="flex items-center transition-colors"
                style={{
                  background: activa
                    ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                    : "transparent",
                  borderBottom: "1px solid var(--kipu-border)",
                }}
                onMouseEnter={(elem) => !activa && (elem.currentTarget.style.background = "var(--kipu-bg)")}
                onMouseLeave={(elem) => !activa && (elem.currentTarget.style.background = "transparent")}
              >
                {/* Cambiar de empresa */}
                <button
                  onClick={() => cambiar(e)}
                  disabled={!!cambiando}
                  className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-3 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: activa ? "var(--kipu-accent)" : "var(--kipu-border)",
                      color: activa ? "#ffffff" : "var(--kipu-muted)",
                    }}
                  >
                    {(e.nombre_comercial || e.razon_social)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--kipu-text)" }}>
                      {e.nombre_comercial || e.razon_social}
                    </p>
                    <p className="text-xs" style={{ color: "var(--kipu-muted)" }}>
                      {e.ruc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background:
                          e.rol === "admin"
                            ? "color-mix(in srgb, var(--kipu-accent) 15%, transparent)"
                            : "var(--kipu-border)",
                        color: e.rol === "admin" ? "var(--kipu-accent)" : "var(--kipu-muted)",
                      }}
                    >
                      {e.rol === "admin" ? "Admin" : "Invitado"}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background:
                          e.ambiente === 2
                            ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                            : "color-mix(in srgb, var(--kipu-warning) 15%, transparent)",
                        color: e.ambiente === 2 ? "var(--kipu-success)" : "var(--kipu-warning)",
                      }}
                    >
                      {e.ambiente === 2 ? "Prod" : "Pruebas"}
                    </span>
                    {activa && <CheckCircle2 size={14} style={{ color: "var(--kipu-accent)" }} />}
                    {cambiando === e.id && (
                      <div
                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                      />
                    )}
                  </div>
                </button>

                {/* Marcar como predeterminada */}
                <button
                  onClick={() => toggleDefault(e)}
                  disabled={guardandoDefault !== null}
                  title={esDefault ? "Quitar como predeterminada" : "Abrir esta empresa al iniciar sesión"}
                  aria-label={esDefault ? "Quitar como predeterminada" : "Abrir esta empresa al iniciar sesión"}
                  aria-pressed={esDefault}
                  className="shrink-0 pl-2 pr-5 py-3 min-h-11 flex items-center"
                  style={{ color: esDefault ? "var(--kipu-warning)" : "var(--kipu-muted)" }}
                >
                  {guardandoDefault === e.id ? (
                    <div
                      className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: "var(--kipu-warning)", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Star size={14} fill={esDefault ? "currentColor" : "none"} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
    </Hoja>
  );
}