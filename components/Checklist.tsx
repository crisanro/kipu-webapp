"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2, Circle, Mail, Building2,
  Shield, Store, ChevronRight, Rocket, Lock,
  Upload, Loader2, X
} from "lucide-react";
import api from "@/lib/api";
import PinInput from "@/components/PinInput";
import { useAuthStore } from "@/store/auth.store";

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
  key:      string;
  label:    string;
  desc:     string;
  done:     boolean;
  href:     string;
  icon:     React.ElementType;
  locked?:  boolean;
  action?:  () => void;
}

export default function Checklist({ health, compact = false, onUpdate }: Props) {
  const pathname = usePathname();
  const email = useAuthStore((s) => s.email) ?? "";

  // ── Estado modal producción ─────────────────────────────────────
  const [showProdModal, setShowProdModal] = useState(false);
  const [prodMsg, setProdMsg] = useState("");

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
    } catch (err: any) {
      setFirmaError(err?.response?.data?.detail ?? "Error al subir la firma.");
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
      key:   "email_verificado",
      label: "Verificar email",
      desc:  "Necesario para acciones de seguridad",
      done:  health.email_verificado ?? false,
      href:  "/configuracion",
      icon:  Mail,
    },
    {
      key:   "datos_empresa",
      label: "Datos de empresa",
      desc:  "RUC, razón social y dirección",
      done:  health.ruc ?? false,
      href:  "/configuracion",
      icon:  Building2,
    },
    {
      key:    "firma",
      label:  "Firma electrónica",
      desc:   "Certificado P12 vigente",
      done:   firmaOk,
      href:   "/configuracion#firma",
      icon:   Shield,
      action: !firmaOk ? () => setShowFirmaModal(true) : undefined,
    },
    {
      key:   "establecimiento",
      label: "Establecimiento",
      desc:  "Al menos un establecimiento activo",
      done:  health.establecimientos_configurados ?? false,
      href:  "/estructura",
      icon:  Store,
    },
    {
      key:   "punto_emision",
      label: "Punto de emisión",
      desc:  "Al menos un punto de emisión activo",
      done:  health.puntos_emision_configurados ?? false,
      href:  "/estructura",
      icon:  Store,
    },
    {
      key:    "activar_produccion",
      label:  "Activar producción",
      desc:   pasos1a5Completos
                ? "¡Todo listo! Emite comprobantes reales ante el SRI"
                : "Completa los pasos anteriores primero",
      done:   health.en_produccion ?? false,
      href:   "#",
      icon:   Rocket,
      locked: !pasos1a5Completos,
      action: pasos1a5Completos ? () => setShowProdModal(true) : undefined,
    },
  ];

  const completados = items.filter((i) => i.done).length;
  const total       = items.length;
  const porcentaje  = Math.round((completados / total) * 100);

  if (health.en_produccion) return null;

  const handleClick = (e: React.MouseEvent, item: ChecklistItem) => {
    if (item.done || item.locked) {
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
  const modalFirma = showFirmaModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl w-full max-w-sm p-6 relative"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--kipu-accent) 12%, transparent)", color: "var(--kipu-accent)" }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--kipu-text)" }}>
                Subir firma electrónica
              </h3>
              <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                Certificado .p12 del BCE o SecurityData
              </p>
            </div>
          </div>
          <button
            onClick={cerrarFirmaModal}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--kipu-subtle)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Drop zone */}
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

          {/* Password */}
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

          {/* Error */}
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

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={cerrarFirmaModal}
              className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
              style={{
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-muted)",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-muted)"}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={subirFirma}
              disabled={firmaUploading || !p12File || !p12Pass}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--kipu-accent)" }}
            >
              {firmaUploading ? (
                <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
              ) : (
                "Guardar firma"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Modal producción ────────────────────────────────────────────
  const modalProduccion = showProdModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl w-full max-w-sm p-6 relative"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="text-center mb-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "color-mix(in srgb, var(--kipu-success) 12%, transparent)", color: "var(--kipu-success)" }}
          >
            <Rocket size={20} />
          </div>
          <h3 className="text-sm font-bold mb-0.5" style={{ color: "var(--kipu-text)" }}>
            Confirmar pase a producción
          </h3>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Ingresa el PIN enviado a tu correo.
          </p>
        </div>
        <PinInput
          tipoAccion="ACTIVAR_PRODUCCION"
          email={email}
          label="activar producción"
          onCancelar={() => setShowProdModal(false)}
          onConfirmar={async (pin) => {
            await api.post(`/api/v1/app/emisor/produccion?pin=${pin}`);
            setProdMsg("¡Bienvenido a producción!");
            setShowProdModal(false);
            onUpdate?.();
            sessionStorage.removeItem("kipu:estructura");
            setTimeout(() => window.location.href = "/dashboard", 1500);
          }}
        />
      </div>
    </div>
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

  // ── Compact (dashboard) ─────────────────────────────────────────
  if (compact) {
    const pendiente = items.find((i) => !i.done && !i.locked);
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
              href={siguiente.locked ? "#" : siguiente.href}
              onClick={(e) => handleClick(e, siguiente)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors group"
              style={{
                background: siguiente.locked
                  ? "color-mix(in srgb, var(--kipu-text) 3%, transparent)"
                  : siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                border: siguiente.key === "activar_produccion"
                  ? "1px solid color-mix(in srgb, var(--kipu-success) 25%, transparent)"
                  : "none",
                opacity: siguiente.locked ? 0.5 : 1,
                cursor: siguiente.locked ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => {
                if (!siguiente.locked)
                  e.currentTarget.style.background = siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 18%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 10%, transparent)";
              }}
              onMouseLeave={e => {
                if (!siguiente.locked)
                  e.currentTarget.style.background = siguiente.key === "activar_produccion"
                    ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
              }}
            >
              <div className="flex items-center gap-2.5">
                {siguiente.locked ? (
                  <Lock size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
                ) : (
                  <Circle size={14} className="shrink-0" style={{ color: siguiente.key === "activar_produccion" ? "var(--kipu-success)" : "var(--kipu-subtle)" }} />
                )}
                <div>
                  <p className="text-xs font-medium" style={{ color: siguiente.key === "activar_produccion" ? "var(--kipu-success)" : "var(--kipu-text)" }}>
                    Siguiente: {siguiente.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{siguiente.desc}</p>
                </div>
              </div>
              {!siguiente.locked && (
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
          {items.map((item, idx) => {
            const { key, label, desc, done, href, icon: Icon, locked } = item;
            const isProduccion = key === "activar_produccion";
            const esActivo     = !done && !locked;
            const esListo      = isProduccion && esActivo;

            return (
              <Link
                key={key}
                href={done || locked ? "#" : href}
                onClick={(e) => handleClick(e, item)}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                  background: esListo
                    ? "color-mix(in srgb, var(--kipu-success) 5%, transparent)"
                    : "transparent",
                  opacity: done ? 0.6 : locked ? 0.4 : 1,
                  cursor: done || locked ? "default" : "pointer",
                  pointerEvents: done || locked ? "none" : "auto",
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
                      : locked
                        ? "color-mix(in srgb, var(--kipu-text) 5%, transparent)"
                        : esListo
                          ? "color-mix(in srgb, var(--kipu-success) 15%, transparent)"
                          : "color-mix(in srgb, var(--kipu-text) 8%, transparent)",
                  }}
                >
                  {done ? (
                    <CheckCircle2 size={16} style={{ color: "var(--kipu-success)" }} />
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
                          : locked
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
          })}
        </div>
      </div>
      {modalFirma}
      {modalProduccion}
    </>
  );
}