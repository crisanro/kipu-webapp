"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeft, User, Mail, Phone, MapPin, FileText,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Edit2, Save, X, Plus, Wallet, TrendingUp, TrendingDown, AlertCircle, Check,
  Copy, Key
} from "lucide-react";

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Exterior",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "var(--kipu-success)", bg: "color-mix(in srgb, var(--kipu-success) 10%, transparent)", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso",  color: "#818cf8",           bg: "color-mix(in srgb, #818cf8 10%, transparent)",           icon: Clock },
  FIRMADO:    { label: "En cola",     color: "#60a5fa",           bg: "color-mix(in srgb, #60a5fa 10%, transparent)",           icon: Clock },
  DEVUELTA:   { label: "Devuelto",    color: "var(--kipu-warning)", bg: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)", icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",   color: "var(--kipu-danger)",  bg: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",  icon: XCircle },
};

const fmt = (n: any) => parseFloat(n ?? 0).toFixed(2);

// ── Validaciones ──────────────────────────────────────────────────────────────
function validarEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function DetallePersonaPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [copiado, setCopiado] = useState(false);
  const [form,    setForm]    = useState({
    razon_social: "",
    email:        "",
    telefono:     "",
    direccion:    "",
  });

  const [cuentas,        setCuentas]        = useState<any[]>([]);
  const [resumenCuentas, setResumenCuentas] = useState({ por_cobrar: 0, por_pagar: 0 });
  const [loadingCuentas, setLoadingCuentas] = useState(true);

  // Validación reactiva del form de edición
  const emailOk      = validarEmail(form.email);
  const nombreOk     = form.razon_social.trim().length > 0;
  const puedeGuardar = emailOk && nombreOk && !saving;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes/detalle/${id}`);
      setData(res.data);
      setForm({
        razon_social: res.data.cliente.razon_social    ?? "",
        email:        res.data.cliente.email           ?? "",
        telefono:     res.data.cliente.telefono        ?? "",
        direccion:    res.data.cliente.direccion       ?? "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const cargarCuentas = useCallback(async () => {
    setLoadingCuentas(true);
    try {
      const res = await api.get(`/api/v1/app/cuentas/cliente/${id}`);
      setCuentas(res.data.data          ?? []);
      setResumenCuentas(res.data.resumen ?? { por_cobrar: 0, por_pagar: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCuentas(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    cargarCuentas();
  }, [cargar, cargarCuentas]);

  const copiarUid = async () => {
    const uidTarget = data?.cliente?.uid || (id as string);
    if (!uidTarget) return;
    await navigator.clipboard.writeText(uidTarget);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const cancelarEdicion = () => {
    setEditing(false);
    setError("");
    if (data?.cliente) {
      setForm({
        razon_social: data.cliente.razon_social ?? "",
        email:        data.cliente.email        ?? "",
        telefono:     data.cliente.telefono     ?? "",
        direccion:    data.cliente.direccion    ?? "",
      });
    }
  };

  const guardar = async () => {
    setError("");
    if (!nombreOk) { setError("El nombre es obligatorio."); return; }
    if (!emailOk)  { setError("El email no es válido."); return; }

    setSaving(true);
    try {
      await api.patch(`/api/v1/app/clientes/${id}`, {
        razon_social: form.razon_social.trim().toUpperCase(),
        email:        form.email.trim().toLowerCase(),
        telefono:     form.telefono.trim(),
        direccion:    form.direccion.trim().toUpperCase(),
      });
      await cargar();
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const nuevaFactura = () => {
    if (!data?.cliente) return;
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: {
        id:             data.cliente.id,
        razon_social:   data.cliente.razon_social,
        identificacion: data.cliente.identificacion,
        tipo_id:        data.cliente.tipo_identificacion_sri,
      },
      esConsumidorFinal:  false,
      items:              [],
      formaPago:          "01",
      camposAdicionales:  data.cliente.email
        ? [{ nombre: "Email", valor: data.cliente.email }]
        : [],
    }));
    router.push("/documentos/emitir/fac");
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-6 text-center">
        <User size={40} className="mx-auto mb-3" style={{ color: "var(--kipu-subtle)" }} />
        <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>Persona no encontrada.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm transition-colors"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Volver
        </button>
      </div>
    );
  }

  const { cliente, resumen, facturas } = data;

  // ── Campo editable inline ─────────────────────────────────────────────────
  const CampoEditable = ({
    icon: Icon, label, value, field, type = "text", placeholder = "",
    transform, validate, validError,
  }: {
    icon: any; label: string; value: string; field: string;
    type?: string; placeholder?: string;
    transform?: (v: string) => string;
    validate?: (v: string) => boolean;
    validError?: string;
  }) => {
    const isInvalid = editing && validate && form[field as keyof typeof form] && !validate(form[field as keyof typeof form]);
    return (
      <div className="flex justify-between items-center text-sm gap-4">
        <span className="flex items-center gap-2 shrink-0" style={{ color: "var(--kipu-subtle)" }}>
          <Icon size={13} /> {label}
        </span>
        {editing ? (
          <div className="flex-1 flex flex-col items-end gap-1">
            <div className="relative w-full max-w-[220px]">
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => {
                  const val = transform ? transform(e.target.value) : e.target.value;
                  setForm({ ...form, [field]: val });
                }}
                placeholder={placeholder}
                className="w-full px-2 py-1 rounded-lg text-xs text-right pr-6 transition-colors focus:outline-none"
                style={{
                  background: "var(--kipu-surface)",
                  border: isInvalid
                    ? "1px solid color-mix(in srgb, var(--kipu-danger) 70%, transparent)"
                    : "1px solid var(--kipu-border)",
                  color: "var(--kipu-text)",
                }}
                onFocus={e => {
                  if (!isInvalid) e.currentTarget.style.borderColor = "var(--kipu-accent)";
                }}
                onBlur={e => {
                  if (!isInvalid) e.currentTarget.style.borderColor = "var(--kipu-border)";
                }}
              />
              {validate && form[field as keyof typeof form] && !isInvalid && (
                <Check size={10} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-success)" }} />
              )}
            </div>
            {isInvalid && validError && (
              <p className="flex items-center gap-1 text-xs" style={{ color: "var(--kipu-danger)" }}>
                <AlertCircle size={10} /> {validError}
              </p>
            )}
          </div>
        ) : (
          <span className="text-right max-w-[60%] truncate" style={{ color: "var(--kipu-text)" }}>{value || "—"}</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--kipu-muted)" }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--kipu-text)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--kipu-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>{cliente.razon_social}</h1>
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
              {TIPO_ID[cliente.tipo_identificacion_sri] ?? "ID"}: {cliente.identificacion}
            </p>
          </div>
        </div>
        <button
          onClick={nuevaFactura}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors shrink-0"
          style={{ background: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nueva factura</span>
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Total facturado</p>
          <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>${fmt(resumen.suma_facturada)}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>solo autorizadas</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "var(--kipu-subtle)" }}>Facturas emitidas</p>
          <p className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>{resumen.total_documentos}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--kipu-subtle)" }}>total histórico</p>
        </div>
      </div>

      {/* Datos */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Datos</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              <Edit2 size={12} /> Editar
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelarEdicion}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-text)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-subtle)"}
              >
                <X size={12} /> Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={!puedeGuardar}
                className="flex items-center gap-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: "var(--kipu-accent)" }}
                onMouseEnter={e => {
                  if (puedeGuardar) e.currentTarget.style.color = "var(--kipu-accent-h)";
                }}
                onMouseLeave={e => {
                  if (puedeGuardar) e.currentTarget.style.color = "var(--kipu-accent)";
                }}
              >
                {saving ? (
                  <div
                    className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
                  />
                ) : (
                  <Save size={12} />
                )}
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* ID de usuario / UID de la persona */}
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}>
              <Key size={13} /> UID Usuario
            </span>
            <div className="flex items-center gap-2">
              <code
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--kipu-text) 5%, transparent)",
                  color: "var(--kipu-text)",
                }}
              >
                {cliente.uid || (id as string)}
              </code>
              <button
                type="button"
                onClick={copiarUid}
                className="p-1.5 rounded transition-colors flex items-center gap-1 text-xs"
                style={{
                  color: copiado ? "var(--kipu-success)" : "var(--kipu-subtle)",
                  background: "color-mix(in srgb, var(--kipu-text) 4%, transparent)",
                }}
                title="Copiar UID"
              >
                {copiado ? (
                  <>
                    <Check size={13} />
                    <span className="text-[10px]" style={{ color: "var(--kipu-success)" }}>Copiado</span>
                  </>
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          </div>

          {/* Tipo e identificación — no editables */}
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}><User size={13} /> Tipo</span>
            <span style={{ color: "var(--kipu-text)" }}>{TIPO_ID[cliente.tipo_identificacion_sri] ?? cliente.tipo_identificacion_sri}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: "var(--kipu-subtle)" }}><FileText size={13} /> Identificación</span>
            <span className="font-mono" style={{ color: "var(--kipu-text)" }}>{cliente.identificacion}</span>
          </div>

          {/* Campos editables */}
          <CampoEditable
            icon={User} label="Nombre" field="razon_social"
            value={cliente.razon_social}
            placeholder="APELLIDOS NOMBRES"
            transform={(v) => v.toUpperCase()}
          />
          <CampoEditable
            icon={Mail} label="Email" field="email"
            value={cliente.email} type="email"
            placeholder="persona@email.com"
            transform={(v) => v.toLowerCase()}
            validate={validarEmail}
            validError="Email inválido."
          />
          <CampoEditable
            icon={Phone} label="Teléfono" field="telefono"
            value={cliente.telefono}
            placeholder="0999999999"
            transform={(v) => v.replace(/\D/g, "")}
          />
          <CampoEditable
            icon={MapPin} label="Dirección" field="direccion"
            value={cliente.direccion}
            placeholder="AV. PRINCIPAL 123"
            transform={(v) => v.toUpperCase()}
          />
        </div>

        {error && (
          <div
            className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{
              color: "var(--kipu-danger)",
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            }}
          >
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>

      {/* Historial de facturas */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--kipu-border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Historial de facturas</h2>
        </div>
        {facturas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin facturas emitidas a esta persona.</p>
          </div>
        ) : (
          <div>
            {facturas.map((f: any, idx: number) => {
              const estado = ESTADO_CONFIG[f.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              const Icon   = estado.icon;
              return (
                <Link
                  key={f.id}
                  href={`/documentos/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: estado.bg }}
                  >
                    <Icon size={13} style={{ color: estado.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono" style={{ color: "var(--kipu-accent)" }}>{f.numero_doc}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{f.fecha_emision}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>${fmt(f.importe_total)}</p>
                    <p className="text-xs" style={{ color: estado.color }}>{estado.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Cuentas */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>Cuentas</h2>
          <div className="flex items-center gap-3">
            {resumenCuentas.por_cobrar > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--kipu-success)" }}>
                <TrendingUp size={11} /> ${resumenCuentas.por_cobrar.toFixed(2)} por cobrar
              </span>
            )}
            {resumenCuentas.por_pagar > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--kipu-danger)" }}>
                <TrendingDown size={11} /> ${resumenCuentas.por_pagar.toFixed(2)} por pagar
              </span>
            )}
            <Link
              href={`/cuentas?cliente=${id}`}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
            >
              <Plus size={12} /> Nueva
            </Link>
          </div>
        </div>
        {loadingCuentas ? (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
            />
          </div>
        ) : cuentas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Wallet size={28} className="mx-auto mb-2" style={{ color: "var(--kipu-subtle)" }} />
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin cuentas registradas.</p>
          </div>
        ) : (
          <div>
            {cuentas.map((c: any, idx: number) => {
              const ESTADO_COLOR: Record<string, string> = {
                PENDIENTE: "var(--kipu-warning)",
                PARCIAL:   "#60a5fa",
                PAGADO:    "var(--kipu-success)",
                ANULADO:   "var(--kipu-subtle)",
              };
              return (
                <Link
                  key={c.id}
                  href={`/cuentas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--kipu-border)" : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: c.tipo === "COBRAR"
                        ? "color-mix(in srgb, var(--kipu-success) 10%, transparent)"
                        : "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                      color: c.tipo === "COBRAR" ? "var(--kipu-success)" : "var(--kipu-danger)",
                    }}
                  >
                    {c.tipo === "COBRAR" ? "C" : "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--kipu-text)" }}>{c.concepto}</p>
                    <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                      {c.fecha_emision}
                      {c.fecha_vencimiento && ` · vence ${c.fecha_vencimiento}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>${c.saldo_pendiente.toFixed(2)}</p>
                    <p className="text-xs" style={{ color: ESTADO_COLOR[c.estado] ?? "var(--kipu-subtle)" }}>
                      {c.estado.toLowerCase()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}