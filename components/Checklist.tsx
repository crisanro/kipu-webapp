"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, Circle, Mail, Building2,
  Shield, Store, ChevronRight, Rocket, Lock,
  Upload, UserCog
} from "lucide-react";
import api from "@/lib/api";
import { refrescarEmpresaActual } from "@/lib/empresa";
import { useAuthStore } from "@/store/auth.store";
import { useSandboxStore } from "@/store/sandbox.store";
import { usePermiso } from "@/hooks/usePermiso";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import { detalleError } from "@/lib/errores";

export interface HealthData {
  email_verificado:              boolean;
  ruc:                            boolean;
  firma_configurada:              boolean;
  firma_vigente:                  boolean;
  establecimientos_configurados: boolean;
  puntos_emision_configurados:    boolean;
  listo_produccion:              boolean;
  en_produccion:                 boolean;
  [key: string]: any;
}

interface Props {
  health:    HealthData;
  compact?:  boolean;
  onUpdate?: () => void;
}

interface ChecklistItem {
  key:       string;
  label:     string;
  desc:      string;
  done:      boolean;
  href:      string;
  icon:      React.ElementType;
  locked?:   boolean;
  action?:   () => void;
  noAcceso?: boolean;  // usuario no tiene permiso para esta acción
}

export default function Checklist({ health, compact = false, onUpdate }: Props) {
  const pathname = usePathname();
  const empresa = useAuthStore((s) => s.empresa);

  const puedeConfig     = usePermiso("configuracion");
  const puedeEstructura = usePermiso("estructura");
  const esAdmin         = empresa?.rol === "admin";   // pasar a producción es solo del administrador

  // ── Estado modal producción ─────────────────────────────────────
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodMsg, setProdMsg] = useState("");
  const [activando, setActivando] = useState(false);
  const [prodError, setProdError] = useState("");

  // ── Estado modal firma ──────────────────────────────────────────
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [p12File, setP12File]     = useState<File | null>(null);
  const [p12Pass, setP12Pass]     = useState("");
  const [firmaUploading, setFirmaUploading] = useState(false);
  const [firmaError, setFirmaError] = useState("");
  const [firmaMsg, setFirmaMsg]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const firmaOk = (health.firma_configurada && health.firma_vigente) ?? false;
  const pasos1a5Completos = health.listo_produccion ?? false;

  // ── Subir firma ─────────────────────────────────────────────────
  const subirFirma = async () => {
    if (!p12File || !p12Pass) {
      setFirmaError("Selecciona el archivo y escribe la contraseña.");
      return;
    }
    setFirmaUploading(true);
    setFirmaError("");
    try {
      const fd = new FormData();
      fd.append("file", p12File);
      fd.append("password", p12Pass);
      await api.post("/api/v1/app/emisor/firma", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFirmaMsg("✅ Firma configurada correctamente.");
      setShowFirmaModal(false);
      setP12File(null);
      setP12Pass("");
      onUpdate?.();
      void refrescarEmpresaActual();   // la barra lateral deja de decir "Sin firma"
    } catch (err: any) {
      setFirmaError(detalleError(err, "Error al subir la firma."));
    } finally {
      setFirmaUploading(false);
    }
  };

  const cerrarFirmaModal = () => {
    setShowFirmaModal(false);
    setP12File(null);
    setP12Pass("");
    setFirmaError("");
  };

  // ── Items ───────────────────────────────────────────────────────
  const items: ChecklistItem[] = [
    {
      key:      "email_verificado",
      label:    "Verificar email",
      desc:     "Necesario para acciones de seguridad",
      done:     health.email_verificado ?? false,
      href:     "/configuracion",
      icon:     Mail,
      noAcceso: !puedeConfig,
    },
    {
      key:      "datos_empresa",
      label:    "Datos de empresa",
      desc:     puedeConfig ? "RUC, razón social y dirección" : "Pide al administrador que complete este paso",
      done:     health.ruc ?? false,
      href:     "/configuracion",
      icon:     Building2,
      noAcceso: !puedeConfig,
    },
    {
      key:    "firma",
      label:  "Firma electrónica",
      desc:   puedeConfig ? "Certificado P12 vigente" : "Pide al administrador que complete este paso",
      done:   firmaOk,
      href:   "/configuracion#firma",
      icon:   Shield,
      action: !firmaOk ? () => setShowFirmaModal(true) : undefined,
      noAcceso: !puedeConfig,
    },
    {
      key:      "establecimiento",
      label:    "Establecimiento",
      desc:     puedeEstructura ? "Al menos un establecimiento activo" : "Pide al administrador que complete este paso",
      done:     health.establecimientos_configurados ?? false,
      href:     "/estructura",
      icon:     Store,
      noAcceso: !puedeEstructura,
    },
    {
      key:      "punto_emision",
      label:    "Punto de emisión",
      desc:     puedeEstructura ? "Al menos un punto de emisión activo" : "Pide al administrador que complete este paso",
      done:     health.puntos_emision_configurados ?? false,
      href:     "/estructura",
      icon:     Store,
      noAcceso: !puedeEstructura,
    },
    {
      key:      "activar_produccion",
      label:    "Activar producción",
      desc:     !esAdmin
                  ? "Solo el administrador puede pasar la empresa a producción"
                  : pasos1a5Completos
                  ? "¡Todo listo! Emite comprobantes reales ante el SRI"
                  : "Completa los pasos anteriores primero",
      done:     health.en_produccion ?? false,
      href:     "#",
      icon:     Rocket,
      locked:   !pasos1a5Completos,
      action:   pasos1a5Completos ? () => setShowProdModal(true) : undefined,
      noAcceso: !esAdmin,
    },
  ];

  const completados = items.filter((i) => i.done).length;
  const total       = items.length;
  const porcentaje  = Math.round((completados / total) * 100);

  if (health.en_produccion) return null;

  const handleClick = (e: React.MouseEvent, item: ChecklistItem) => {
    if (item.done || item.locked || item.noAcceso) {
      e.preventDefault();
      return;
    }
    if (item.action) {
      e.preventDefault();
      item.action();
      return;
    }
    const [path, hash] = item.href.split("#");
    if (hash && path === pathname) {
      e.preventDefault();
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ── Modal firma ─────────────────────────────────────────────────
  const modalFirma = (
    <Hoja
      abierta={showFirmaModal}
      onCerrar={cerrarFirmaModal}
      titulo={<span className="inline-flex items-center gap-2"><Shield size={18} className="text-acento" /> Subir firma electrónica</span>}
      descripcion="Certificado .p12 del BCE o SecurityData"
      tamano="sm"
      cerrable={!firmaUploading}
      pie={<>
        <Boton variante="secundario" onClick={cerrarFirmaModal} disabled={firmaUploading}>Cancelar</Boton>
        <Boton onClick={subirFirma} disabled={!p12File || !p12Pass} cargando={firmaUploading}>
          {firmaUploading ? "Subiendo…" : "Guardar firma"}
        </Boton>
      </>}
    >
        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors"
            style={{
              borderColor: p12File ? "var(--kipu-accent)" : "var(--kipu-border)",
              background: p12File
                ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)"
                : "transparent",
            }}
            onMouseEnter={e => {
              if (!p12File) e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-text) 30%, transparent)";
            }}
            onMouseLeave={e => {
              if (!p12File) e.currentTarget.style.borderColor = "var(--kipu-border)";
            }}
          >
            <Upload size={20} className="mx-auto mb-2" style={{ color: p12File ? "var(--kipu-accent)" : "var(--kipu-subtle)" }} />
            <p className="text-sm font-medium" style={{ color: p12File ? "var(--kipu-accent)" : "var(--kipu-muted)" }}>
              {p12File ? p12File.name : "Seleccionar archivo .p12"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--kipu-subtle)" }}>Solo archivos .p12</p>
            <input
              ref={fileRef}
              type="file"
              accept=".p12"
              className="hidden"
              onChange={e => { setP12File(e.target.files?.[0] ?? null); setFirmaError(""); }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kipu-subtle)" }}>
              Contraseña del certificado
            </label>
            <input
              type="password"
              value={p12Pass}
              onChange={e => { setP12Pass(e.target.value); setFirmaError(""); }}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{
                background: "var(--kipu-bg)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
              onKeyDown={e => { if (e.key === "Enter" && p12File && p12Pass) subirFirma(); }}
            />
          </div>

          {firmaError && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                color: "var(--kipu-danger)",
                background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
              }}
            >
              {firmaError}
            </p>
          )}
        </div>
    </Hoja>
  );

  // ── Pase a producción (Hoja) ────────────────────────────────────
  const pasarAProduccion = async () => {
    setActivando(true);
    setProdError("");
    try {
      await api.post("/api/v1/app/emisor/produccion");
      // Desde ya emite de verdad: fuera el sandbox antes de ir al dashboard
      useSandboxStore.getState().setSandbox(false);
      setProdMsg("¡Bienvenido a producción!");
      setShowProdModal(false);
      onUpdate?.();
      sessionStorage.removeItem("kipu:estructura");
      setTimeout(() => window.location.href = "/dashboard", 1500);
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setProdError(typeof detalle === "string" ? detalle : "No se pudo activar producción. Intenta de nuevo.");
    } finally {
      setActivando(false);
    }
  };

  const modalProduccion = (
    <Hoja
      abierta={showProdModal}
      onCerrar={() => { setShowProdModal(false); setProdError(""); }}
      titulo={<span className="inline-flex items-center gap-2"><Rocket size={18} className="text-exito" /> Confirmar pase a producción</span>}
      descripcion={<>Desde ahora tus comprobantes tendrán validez tributaria ante el SRI.
        Factura gratis, hasta 300 al mes (ampliable gratis).</>}
      tamano="sm"
      cerrable={!activando}
      pie={<>
        <Boton variante="secundario" onClick={() => { setShowProdModal(false); setProdError(""); }} disabled={activando}>
          Cancelar
        </Boton>
        <Boton onClick={pasarAProduccion} cargando={activando}>
          {activando ? "Activando…" : "Pasar a producción"}
        </Boton>
      </>}
    >
      {prodError && <p className="text-xs px-3 py-2 rounded-lg text-peligro bg-peligro-suave">{prodError}</p>}
    </Hoja>
  );

  // ── Mensajes post-acción ────────────────────────────────────────
  const mensajes = (prodMsg || firmaMsg) && (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{
        background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--kipu-success) 25%, transparent)",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--kipu-success)" }}>
        {prodMsg || firmaMsg}
      </p>
    </div>
  );

  // ── Render de un item ───────────────────────────────────────────
  const renderItem = (item: ChecklistItem, idx: number, isCompact: boolean) => {
    const { key, label, desc, done, href, icon: Icon, locked, noAcceso } = item;
    const isProduccion = key === "activar_produccion";
    const esActivo     = !done && !locked && !noAcceso;
    const esListo      = isProduccion && esActivo;
    const bloqueado    = done || locked || noAcceso;

    if (isCompact) {
      // En compact solo mostramos el "siguiente"
      return null;
    }

    return (
      <Link
        key={key}
        href={bloqueado ? "#" : href}
        onClick={(e) => handleClick(e, item)}
        className="flex items-center gap-4 px-5 py-4 transition-colors"
        style={{
          borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
          background: esListo
            ? "color-mix(in srgb, var(--kipu-success) 5%, transparent)"
            : "transparent",
          opacity: done ? 0.6 : (locked || noAcceso) ? 0.4 : 1,
          cursor: bloqueado ? "default" : "pointer",
          pointerEvents: bloqueado ? "none" : "auto",
        }}
        onMouseEnter={e => {
          if (esActivo)
            e.currentTarget.style.background = esListo
              ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
              : "color-mix(in srgb, var(--kipu-text) 4%, transparent)";
        }}
        onMouseLeave={e => {
          if (esActivo)
            e.currentTarget.style.background = esListo
              ? "color-mix(in srgb, var(--kipu-success) 5%, transparent)"
              : "transparent";
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: done
              ? "color-mix(in srgb, var(--kipu-success) 20%, transparent)"
              : (locked || noAcceso)
                ? "color-mix(in srgb, var(--kipu-text) 5%, transparent)"
                : esListo
                  ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                  : "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
          }}
        >
          {done ? (
            <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
          ) : noAcceso ? (
            <UserCog size={14} style={{ color: "var(--kipu-subtle)" }} />
          ) : locked ? (
            <Lock size={14} style={{ color: "var(--kipu-subtle)" }} />
          ) : (
            <Icon size={15} style={{ color: esListo ? "var(--kipu-success)" : "var(--kipu-subtle)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{
              color: done
                ? "var(--kipu-subtle)"
                : esListo
                  ? "var(--kipu-success)"
                  : (locked || noAcceso)
                    ? "var(--kipu-subtle)"
                    : "var(--kipu-text)",
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>{desc}</p>
        </div>
        {esActivo && (
          <ChevronRight size={14} className="shrink-0" style={{ color: esListo ? "var(--kipu-success)" : "var(--kipu-subtle)" }} />
        )}
      </Link>
    );
  };

  // ── Compact (dashboard) ─────────────────────────────────────────
  if (compact) {
    // Buscar el siguiente paso que el usuario SÍ puede hacer
    const pendiente = items.find((i) => !i.done && !i.locked && !i.noAcceso);
    // Si no hay paso accionable, mostrar el primer paso pendiente (aunque sea bloqueado)
    const siguiente = pendiente ?? items.find((i) => !i.done);

    return (
      <>
        {mensajes}
        <div
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
                Configura tu cuenta ({completados}/{total})
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>
                Completa estos pasos para emitir comprobantes
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--kipu-accent)" }}>{porcentaje}%</span>
          </div>

          <div
            className="h-1.5 rounded-full mb-3 overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${porcentaje}%`,
                background: porcentaje === 100 ? "var(--kipu-success)" : "var(--kipu-accent)",
              }}
            />
          </div>

          {siguiente && (
            <Link
              href={(siguiente.locked || siguiente.noAcceso) ? "#" : siguiente.href}
              onClick={(e) => handleClick(e, siguiente)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors group"
              style={{
                background: (siguiente.locked || siguiente.noAcceso)
                  ? "color-mix(in srgb, var(--kipu-text) 3%, transparent)"
                  : siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                border: siguiente.key === "activar_produccion" && !siguiente.locked
                  ? "1px solid color-mix(in srgb, var(--kipu-success) 25%, transparent)"
                  : "none",
                opacity: (siguiente.locked || siguiente.noAcceso) ? 0.5 : 1,
                cursor: (siguiente.locked || siguiente.noAcceso) ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => {
                if (!siguiente.locked && !siguiente.noAcceso)
                  e.currentTarget.style.background = siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 18%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
              }}
              onMouseLeave={e => {
                if (!siguiente.locked && !siguiente.noAcceso)
                  e.currentTarget.style.background = siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }}
            >
              <div className="flex items-center gap-2.5">
                {siguiente.noAcceso ? (
                  <UserCog size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
                ) : siguiente.locked ? (
                  <Lock size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
                ) : (
                  <Circle size={14} className="shrink-0" style={{ color: siguiente.key === "activar_produccion" ? "var(--kipu-success)" : "var(--kipu-subtle)" }} />
                )}
                <div>
                  <p className="text-xs font-medium" style={{ color: siguiente.noAcceso ? "var(--kipu-subtle)" : siguiente.key === "activar_produccion" ? "var(--kipu-success)" : "var(--kipu-text)" }}>
                    {siguiente.noAcceso ? `${siguiente.label} — requiere administrador` : `Siguiente: ${siguiente.label}`}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{siguiente.desc}</p>
                </div>
              </div>
              {!siguiente.locked && !siguiente.noAcceso && (
                <ChevronRight size={14} className="transition-colors" style={{ color: siguiente.key === "activar_produccion" ? "var(--kipu-success)" : "var(--kipu-subtle)" }} />
              )}
            </Link>
          )}
        </div>
        {modalFirma}
        {modalProduccion}
      </>
    );
  }

  // ── Vista completa (configuración) ──────────────────────────────
  return (
    <>
      {mensajes}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Pasos para emitir comprobantes
            </h2>
            <span className="text-xs font-bold" style={{ color: "var(--kipu-accent)" }}>
              {completados}/{total} completados
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "color-mix(in srgb, var(--kipu-text) 8%, transparent)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${porcentaje}%`,
                background: porcentaje === 100 ? "var(--kipu-success)" : "var(--kipu-accent)",
              }}
            />
          </div>
        </div>

        <div>
          {items.map((item, idx) => renderItem(item, idx, false))}
        </div>
      </div>
      {modalFirma}
      {modalProduccion}
    </>
  );
}