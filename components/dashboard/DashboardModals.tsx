"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, X, CheckCircle2, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

export function ModalLogout({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-xl p-5 max-w-sm w-full space-y-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--kipu-danger) 15%, transparent)" }}
          >
            <LogOut size={16} style={{ color: "var(--kipu-danger)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>
              ¿Cerrar sesión?
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-muted)" }}>
              Se cerrará tu sesión en este dispositivo.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{
              border: "1px solid var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--kipu-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--kipu-muted)")}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--kipu-danger)" }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelectorEmpresa({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { empresas, empresa, setEmpresa } = useAuthStore();
  const [cambiando, setCambiando] = useState<number | null>(null);

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
        obligado_contabilidad: data.obligado_contabilidad ?? null,
        periodo_iva: data.periodo_iva ?? null,
      });
      localStorage.setItem("kipu-ext-emisor", String(e.id));
      localStorage.setItem("kipu-ext-ruc", data.ruc);
      localStorage.setItem("kipu-ext-razon", data.razon_social);
      sessionStorage.clear();
      onClose();
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
    } finally {
      setCambiando(null);
    }
  };

  const empresasOrdenadas = [...empresas].sort((a, b) => {
    if (a.rol === "admin" && b.rol !== "admin") return -1;
    if (b.rol === "admin" && a.rol !== "admin") return 1;
    return (a.nombre_comercial || a.razon_social).localeCompare(b.nombre_comercial || b.razon_social);
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="rounded-xl w-full max-w-sm"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
            Cambiar empresa
          </h2>
          <button onClick={onClose} style={{ color: "var(--kipu-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {empresasOrdenadas.map((e) => {
            const activa = e.id === empresa?.id;
            return (
              <button
                key={e.id}
                onClick={() => cambiar(e)}
                disabled={!!cambiando}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: activa
                    ? "color-mix(in srgb, var(--kipu-accent) 10%, transparent)"
                    : "transparent",
                  borderBottom: "1px solid var(--kipu-border)",
                }}
                onMouseEnter={(elem) => !activa && (elem.currentTarget.style.background = "var(--kipu-bg)")}
                onMouseLeave={(elem) => !activa && (elem.currentTarget.style.background = "transparent")}
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
            );
          })}
        </div>
        <div className="p-3">
          <button
            onClick={() => {
              onClose();
              router.push("/nueva-empresa");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm transition-colors"
            style={{
              borderColor: "var(--kipu-border)",
              color: "var(--kipu-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--kipu-muted)";
              e.currentTarget.style.color = "var(--kipu-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--kipu-border)";
              e.currentTarget.style.color = "var(--kipu-muted)";
            }}
          >
            <Plus size={14} /> Agregar empresa
          </button>
        </div>
      </div>
    </div>
  );
}