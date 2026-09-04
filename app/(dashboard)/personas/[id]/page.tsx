// app/(dashboard)/personas/[id]/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeft, User, Mail, Phone, MapPin, FileText,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Loader2, Edit2, Save, X, Plus, Wallet, TrendingUp, TrendingDown, AlertCircle, Check
} from "lucide-react";
import { clsx } from "clsx";

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Exterior",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  AUTORIZADO: { label: "Autorizado", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  RECIBIDA:   { label: "En proceso", color: "text-indigo-400 bg-indigo-400/10",   icon: Clock },
  FIRMADO:    { label: "En cola",    color: "text-blue-400 bg-blue-400/10",       icon: Clock },
  DEVUELTA:   { label: "Devuelto",   color: "text-amber-400 bg-amber-400/10",     icon: AlertTriangle },
  RECHAZADO:  { label: "Rechazado",  color: "text-red-400 bg-red-400/10",         icon: XCircle },
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
  const emailOk     = validarEmail(form.email);
  const nombreOk    = form.razon_social.trim().length > 0;
  const puedeGuardar = emailOk && nombreOk && !saving;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/clientes/detalle/${id}`);
      setData(res.data);
      setForm({
        razon_social: res.data.cliente.razon_social     ?? "",
        email:        res.data.cliente.email            ?? "",
        telefono:     res.data.cliente.telefono         ?? "",
        direccion:    res.data.cliente.direccion        ?? "",
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

  const cancelarEdicion = () => {
    setEditing(false);
    setError("");
    // Restaurar form al estado guardado
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
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-6 text-center">
        <User size={40} className="text-gray-700 mx-auto mb-3" />
        <p className="text-gray-500">Persona no encontrada.</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-400 text-sm">Volver</button>
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
        <span className="text-gray-500 flex items-center gap-2 shrink-0">
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
                className={`w-full px-2 py-1 rounded-lg bg-gray-800 border text-white text-xs focus:outline-none text-right pr-6 ${
                  isInvalid ? "border-red-500/70" : "border-gray-700 focus:border-indigo-500"
                }`}
              />
              {validate && form[field as keyof typeof form] && !isInvalid && (
                <Check size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400" />
              )}
            </div>
            {isInvalid && validError && (
              <p className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={10} /> {validError}
              </p>
            )}
          </div>
        ) : (
          <span className="text-white text-right max-w-[60%] truncate">{value || "—"}</span>
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
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{cliente.razon_social}</h1>
            <p className="text-sm text-gray-500">
              {TIPO_ID[cliente.tipo_identificacion_sri] ?? "ID"}: {cliente.identificacion}
            </p>
          </div>
        </div>
        <button
          onClick={nuevaFactura}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nueva factura</span>
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturado</p>
          <p className="text-2xl font-bold text-white">${fmt(resumen.suma_facturada)}</p>
          <p className="text-xs text-gray-600 mt-0.5">solo autorizadas</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Facturas emitidas</p>
          <p className="text-2xl font-bold text-white">{resumen.total_documentos}</p>
          <p className="text-xs text-gray-600 mt-0.5">total histórico</p>
        </div>
      </div>

      {/* Datos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Edit2 size={12} /> Editar
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelarEdicion}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <X size={12} /> Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={!puedeGuardar}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Tipo e identificación — nunca editables */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><User size={13} /> Tipo</span>
            <span className="text-white">{TIPO_ID[cliente.tipo_identificacion_sri] ?? cliente.tipo_identificacion_sri}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-2"><FileText size={13} /> Identificación</span>
            <span className="text-white font-mono">{cliente.identificacion}</span>
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
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>

      {/* Historial de facturas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial de facturas</h2>
        </div>
        {facturas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-600">Sin facturas emitidas a esta persona.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {facturas.map((f: any) => {
              const estado = ESTADO_CONFIG[f.estado_sri] ?? ESTADO_CONFIG.FIRMADO;
              const Icon   = estado.icon;
              return (
                <Link
                  key={f.id}
                  href={`/documentos/${f.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center shrink-0", estado.color.split(" ")[1])}>
                    <Icon size={13} className={estado.color.split(" ")[0]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-indigo-400">{f.numero_doc}</p>
                    <p className="text-xs text-gray-500">{f.fecha_emision}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">${fmt(f.importe_total)}</p>
                    <p className={clsx("text-xs", estado.color.split(" ")[0])}>{estado.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Cuentas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuentas</h2>
          <div className="flex items-center gap-3">
            {resumenCuentas.por_cobrar > 0 && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <TrendingUp size={11} /> ${resumenCuentas.por_cobrar.toFixed(2)} por cobrar
              </span>
            )}
            {resumenCuentas.por_pagar > 0 && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <TrendingDown size={11} /> ${resumenCuentas.por_pagar.toFixed(2)} por pagar
              </span>
            )}
            <Link
              href={`/cuentas?cliente=${id}`}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus size={12} /> Nueva
            </Link>
          </div>
        </div>
        {loadingCuentas ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-indigo-400" />
          </div>
        ) : cuentas.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Wallet size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Sin cuentas registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {cuentas.map((c: any) => {
              const ESTADO_COLOR: Record<string, string> = {
                PENDIENTE: "text-amber-400",
                PARCIAL:   "text-blue-400",
                PAGADO:    "text-emerald-400",
                ANULADO:   "text-gray-500",
              };
              return (
                <Link
                  key={c.id}
                  href={`/cuentas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    c.tipo === "COBRAR" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                  )}>
                    {c.tipo === "COBRAR" ? "C" : "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{c.concepto}</p>
                    <p className="text-xs text-gray-500">
                      {c.fecha_emision}
                      {c.fecha_vencimiento && ` · vence ${c.fecha_vencimiento}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">${c.saldo_pendiente.toFixed(2)}</p>
                    <p className={clsx("text-xs", ESTADO_COLOR[c.estado] ?? "text-gray-500")}>
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