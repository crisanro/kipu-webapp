"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, FileText, CheckCircle2,
  AlertTriangle, Clock, Printer, Zap, Trash2,
  User, Calendar, Hash, StickyNote,
} from "lucide-react";

const fmt  = (n: number) => `$${n.toFixed(2)}`;
const fmt2 = (n: number) => n.toFixed(2);

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Exterior",
};

export default function DetalleProformaPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [eliminando,   setEliminando]   = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/app/proformas/${id}`);
      setData(res.data.proforma);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await api.delete(`/api/v1/app/proformas/${id}`);
      router.push("/proformas");
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Error al eliminar.");
    } finally {
      setEliminando(false);
    }
  };

  const handleFacturar = () => {
    if (!data) return;
    const prefill: any = {
      items: data.items.map((it: any) => ({
        descripcion:     it.descripcion,
        cantidad:        it.cantidad,
        precio:          it.precio_unitario,
        tipo_iva:        String(it.tipo_iva),
        descuento:       0,
        tipo_descuento:  "$",
        unidad:          "UNIDAD",
        codigo:          "",
      })),
      formaPago:         "01",
      camposAdicionales: [],
      esConsumidorFinal: !data.cliente,
    };
    if (data.cliente) {
      prefill.cliente = {
        id:             data.cliente.id,
        razon_social:   data.cliente.razon_social,
        identificacion: data.cliente.identificacion,
        tipo_id:        data.cliente.tipo_identificacion_sri,
      };
      if (data.cliente.email) {
        prefill.camposAdicionales = [{ nombre: "Email", valor: data.cliente.email }];
      }
    }
    prefill._proforma_id = id;
    sessionStorage.setItem("kipu:prefill", JSON.stringify(prefill));
    router.push("/documentos/emitir/fac");
  };

  const handleImprimir = () => {
    const contenido = printRef.current;
    if (!contenido) return;
    const ventana = window.open("", "_blank", "width=900,height=700");
    if (!ventana) return;
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${data?.numero ?? "Proforma"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
          .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
          thead tr { background: #059669; color: #fff; }
          thead th { padding: 7px 8px; text-align: left; font-weight: 600; }
          thead th.right { text-align: right; }
          tbody tr:nth-child(even) { background: #f0faf6; }
          tbody td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
          tbody td.right { text-align: right; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 10mm; }
          }
        </style>
      </head>
      <body>${contenido.innerHTML}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => { ventana.print(); }, 400);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
      />
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center">
      <FileText size={40} className="mx-auto mb-3" style={{ color: "var(--kipu-subtle)" }} />
      <p style={{ color: "var(--kipu-muted)" }}>Proforma no encontrada.</p>
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

  const vencida   = data.vencida && data.estado === "VIGENTE";
  const facturada = data.estado === "FACTURADA";
  const activa    = !facturada;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">

      {/* Header */}
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
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{
                color: "var(--kipu-accent)",
                background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
              }}
            >
              PRO
            </span>
            <h1 className="text-xl font-bold font-mono" style={{ color: "var(--kipu-text)" }}>{data.numero}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {facturada && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  color: "var(--kipu-success)",
                  background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
                }}
              >
                <CheckCircle2 size={10} /> Facturada
              </span>
            )}
            {!facturada && !vencida && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  color: "#818cf8",
                  background: "color-mix(in srgb, #818cf8 10%, transparent)",
                }}
              >
                <Clock size={10} /> Vigente
              </span>
            )}
            {vencida && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  color: "var(--kipu-danger)",
                  background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
                }}
              >
                <AlertTriangle size={10} /> Vencida
              </span>
            )}
            <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
              {data.cliente?.razon_social ?? "Sin cliente"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>{fmt(data.total)}</p>
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{data.fecha_emision}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleImprimir}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
          style={{
            background: "var(--kipu-surface)",
            color: "var(--kipu-text)",
            border: "1px solid var(--kipu-border)",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 5%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-surface)"}
        >
          <Printer size={13} /> Imprimir / PDF
        </button>
        {activa && (
          <>
            <button
              onClick={handleFacturar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium transition-colors"
              style={{ background: "var(--kipu-accent)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--kipu-accent-h)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--kipu-accent)"}
            >
              <Zap size={13} /> Convertir en factura
            </button>
            <button
              onClick={() => setShowEliminar(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{
                background: "var(--kipu-surface)",
                color: "var(--kipu-muted)",
                border: "1px solid var(--kipu-border)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--kipu-danger)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
                e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-danger) 30%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--kipu-muted)";
                e.currentTarget.style.background = "var(--kipu-surface)";
                e.currentTarget.style.borderColor = "var(--kipu-border)";
              }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </>
        )}
      </div>

      {/* Cliente */}
      {data.cliente && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <User size={14} style={{ color: "var(--kipu-accent)" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Cliente</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Nombre",         value: data.cliente.razon_social },
              { label: "Identificación", value: `${TIPO_ID[data.cliente.tipo_identificacion_sri] ?? "ID"}: ${data.cliente.identificacion}` },
              ...(data.cliente.email    ? [{ label: "Email",     value: data.cliente.email    }] : []),
              ...(data.cliente.telefono ? [{ label: "Teléfono",  value: data.cliente.telefono }] : []),
              ...(data.cliente.direccion && data.cliente.direccion !== "S/N"
                ? [{ label: "Dirección", value: data.cliente.direccion }]
                : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>{label}</p>
                <p className="font-medium truncate" style={{ color: "var(--kipu-text)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fechas */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} style={{ color: "var(--kipu-accent)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Fechas</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Emisión</p>
            <p className="font-medium" style={{ color: "var(--kipu-text)" }}>{data.fecha_emision}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Válida hasta</p>
            <p
              className="font-medium"
              style={{ color: vencida ? "var(--kipu-danger)" : "var(--kipu-text)" }}
            >
              {data.fecha_validez ?? "Sin vencimiento"}
              {vencida && " ⚠️"}
            </p>
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "2px solid var(--kipu-border)" }}
        >
          <Hash size={14} style={{ color: "var(--kipu-accent)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
            Ítems ({data.items.length})
          </h2>
        </div>
        <div>
          {data.items.map((it: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{it.descripcion}</p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  {it.cantidad} × {fmt(it.precio_unitario)} · IVA {it.tipo_iva}%
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>{fmt(it.total)}</p>
                {it.valor_iva > 0 && (
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>IVA {fmt(it.valor_iva)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div
          className="px-4 py-3 space-y-1.5"
          style={{ borderTop: "2px solid var(--kipu-border)" }}
        >
          <div className="flex justify-between text-sm" style={{ color: "var(--kipu-muted)" }}>
            <span>Subtotal</span><span>{fmt(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: "var(--kipu-muted)" }}>
            <span>IVA</span><span>{fmt(data.total_iva)}</span>
          </div>
          <div
            className="flex justify-between text-base font-bold pt-1.5"
            style={{ borderTop: "1px solid var(--kipu-border)" }}
          >
            <span style={{ color: "var(--kipu-text)" }}>Total</span>
            <span style={{ color: "var(--kipu-accent)" }}>{fmt(data.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {data.notas && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={14} style={{ color: "var(--kipu-warning)" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>Observaciones</h2>
          </div>
          <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>{data.notas}</p>
        </div>
      )}

      {/* Facturada — link al documento */}
      {facturada && data.documento_emitido_id && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-success) 20%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--kipu-success)" }}>Esta proforma fue facturada</p>
          </div>
          <button
            onClick={() => router.push(`/documentos/${data.documento_emitido_id}`)}
            className="text-xs transition-colors"
            style={{ color: "var(--kipu-accent)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
          >
            Ver factura →
          </button>
        </div>
      )}

      {/* DIV oculto para imprimir */}
      <div className="hidden">
        <div ref={printRef}>
          <div className="page" style={{ padding: "32px", fontFamily: "Arial, sans-serif", color: "#111" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #059669", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>
                  {data.emisor?.nombre_comercial || data.emisor?.razon_social}
                </div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", lineHeight: "1.6" }}>
                  <div>RUC: {data.emisor?.ruc}</div>
                  <div>{data.emisor?.direccion}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "26px", fontWeight: "bold", color: "#059669", letterSpacing: "3px" }}>PROFORMA</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#111", marginTop: "4px" }}>{data.numero}</div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>Fecha: {data.fecha_emision}</div>
                {data.fecha_validez && (
                  <div style={{ fontSize: "10px", color: "#666" }}>Válida hasta: {data.fecha_validez}</div>
                )}
              </div>
            </div>

            {/* Cliente */}
            {data.cliente && (
              <div style={{ background: "#f0faf6", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px 14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "9px", textTransform: "uppercase", color: "#888", fontWeight: "bold", letterSpacing: "0.5px", marginBottom: "6px" }}>Cliente</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#111" }}>{data.cliente.razon_social}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "3px", lineHeight: "1.6" }}>
                  <span>{TIPO_ID[data.cliente.tipo_identificacion_sri] ?? "ID"}: {data.cliente.identificacion}</span>
                  {data.cliente.email    && <span style={{ marginLeft: "12px" }}>{data.cliente.email}</span>}
                  {data.cliente.telefono && <span style={{ marginLeft: "12px" }}>{data.cliente.telefono}</span>}
                  {data.cliente.direccion && data.cliente.direccion !== "S/N" && <div>{data.cliente.direccion}</div>}
                </div>
              </div>
            )}

            {/* Tabla */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#059669", color: "#fff" }}>
                  <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Descripción</th>
                  <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, width: "60px" }}>Cant.</th>
                  <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, width: "80px" }}>P. Unit.</th>
                  <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, width: "60px" }}>IVA</th>
                  <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, width: "80px" }}>Subtotal</th>
                  <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, width: "80px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it: any, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f0faf6" }}>
                    <td style={{ padding: "7px 8px", borderBottom: "1px solid #e5e7eb" }}>{it.descripcion}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{it.cantidad}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>${fmt2(it.precio_unitario)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{it.tipo_iva}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>${fmt2(it.subtotal)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontWeight: "bold" }}>${fmt2(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div style={{ width: "240px", marginLeft: "auto", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11px", color: "#444", borderBottom: "1px solid #eee" }}>
                <span>Subtotal</span><span>${fmt2(data.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11px", color: "#444", borderBottom: "1px solid #eee" }}>
                <span>IVA</span><span>${fmt2(data.total_iva)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: "15px", fontWeight: "bold", color: "#059669", borderTop: "2px solid #059669", marginTop: "4px" }}>
                <span>TOTAL</span><span>${fmt2(data.total)}</span>
              </div>
            </div>

            {/* Notas */}
            {data.notas && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "10px 12px", marginBottom: "16px" }}>
                <div style={{ fontWeight: "bold", color: "#92400e", marginBottom: "4px", fontSize: "10px" }}>Observaciones</div>
                <div style={{ fontSize: "10px", color: "#555" }}>{data.notas}</div>
              </div>
            )}

            {/* Validez */}
            {data.fecha_validez && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", fontSize: "10px", color: "#1d4ed8" }}>
                Esta proforma es válida hasta el <strong>{data.fecha_validez}</strong>. Los precios pueden variar después de esta fecha.
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px", textAlign: "center", fontSize: "9px", color: "#aaa" }}>
              Documento generado por Kipu.ec · Este documento no tiene validez tributaria
            </div>
          </div>
        </div>
      </div>

      {/* Modal eliminar */}
      {showEliminar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="rounded-xl w-full max-w-sm p-5 space-y-4"
            style={{
              background: "var(--kipu-surface)",
              border: "1px solid var(--kipu-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
                }}
              >
                <Trash2 size={16} style={{ color: "var(--kipu-danger)" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--kipu-text)" }}>¿Eliminar proforma?</p>
                <p className="text-xs mt-1" style={{ color: "var(--kipu-muted)" }}>
                  Se eliminará <span className="font-mono" style={{ color: "var(--kipu-text)" }}>{data.numero}</span> permanentemente.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEliminar(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-colors"
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
                onClick={handleEliminar}
                disabled={eliminando}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "var(--kipu-danger)" }}
              >
                {eliminando ? (
                  <div
                    className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#FFFFFF", borderTopColor: "transparent" }}
                  />
                ) : (
                  <Trash2 size={14} />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}