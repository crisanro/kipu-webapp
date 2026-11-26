"use client";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import HojaAcciones, { type Accion } from "@/components/ui/HojaAcciones";
import Seccion from "@/components/ui/Seccion";
import { DetalleNoDisponible } from "@/components/ui/Vacio";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { EsqueletoDetalle } from "@/components/ui/Esqueleto";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import { rutas } from "@/lib/rutas";
import { useLista } from "@/lib/useLista";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { compartir } from "@/lib/nativo";
import { useRef, useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import {
  ArrowLeft, FileText, CheckCircle2, AlertTriangle, Clock, Printer, Zap, Trash2,
  User, StickyNote, MoreVertical, Share2, ListChecks,
} from "lucide-react";
import { detalleError } from "@/lib/errores";
import { dolares, dosDecimales } from "@/lib/dinero";
import { NOMBRE_TIPO_ID } from "@/lib/identificacion";
import { etiquetaIva } from "@/lib/iva";

const fecha = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? etiquetaPeriodo(f, f) : f || "");

// /proformas/ver?id=… (antes /proformas/[id]; ver lib/rutas.ts)
export default function DetalleProformaPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetalleProforma key={id} id={id} />;
}

function DetalleProforma({ id }: { id: string }) {
  const avisos    = useAvisos();
  const confirmar = useConfirmar();
  const router    = useRouter();

  // Con caché: al volver de la factura la proforma aparece al instante (lib/useLista.ts)
  const res  = useLista<{ proforma?: any }>(`/api/v1/app/proformas/${id}`);
  const data = res.datos?.proforma;
  const [menu, setMenu] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleEliminar = async () => {
    const ok = await confirmar({
      titulo: "¿Eliminar proforma?",
      mensaje: `Se eliminará ${data?.numero ?? "la proforma"} permanentemente.`,
      textoConfirmar: "Eliminar", peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/v1/app/proformas/${id}`);
      avisos.info("Proforma eliminada");
      router.push("/proformas");
    } catch (err: any) {
      avisos.error(detalleError(err, "No se pudo eliminar la proforma."));
    }
  };

  // Resumen en texto para WhatsApp, correo… (en la app no se puede imprimir)
  const compartirResumen = async () => {
    if (!data) return;
    const lineas = [
      `Proforma ${data.numero}${data.emisor ? ` · ${data.emisor.nombre_comercial || data.emisor.razon_social}` : ""}`,
      ...(data.cliente ? [`Cliente: ${data.cliente.razon_social}`] : []),
      "",
      ...data.items.map((it: any) => `• ${it.cantidad} × ${it.descripcion}: ${dolares(it.total)}`),
      "",
      `Subtotal: ${dolares(data.subtotal)}`,
      `IVA: ${dolares(data.total_iva)}`,
      `TOTAL: ${dolares(data.total)}`,
      ...(data.fecha_validez ? [`Válida hasta: ${data.fecha_validez}`] : []),
    ];
    const texto = lineas.join("\n");
    const ok = await compartir({ titulo: `Proforma ${data.numero}`, texto });
    if (!ok) {
      try { await navigator.clipboard.writeText(texto); avisos.exito("Resumen copiado"); }
      catch { avisos.error("No se pudo compartir."); }
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
        descuento:       it.descuento ?? 0,   // la factura debe salir con el mismo total que la proforma
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
    // El cuerpo es innerHTML de React (ya escapado); el título se escapa aparte
    const titulo = String(data?.numero ?? "Proforma")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${titulo}</title>
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

  if (res.cargando) return <EsqueletoDetalle />;

  if (!data) return (
    <DetalleNoDisponible error={res.error} icono={FileText} que="la proforma"
      noEncontrado="Proforma no encontrada" onReintentar={() => void res.recargar()}
      volver={{ texto: "Ir a Proformas", onClick: () => router.push("/proformas") }} />
  );

  const vencida   = data.vencida && data.estado === "VIGENTE";
  const facturada = data.estado === "FACTURADA";
  const activa    = !facturada;

  const acciones: Accion[] = [
    { etiqueta: "Compartir resumen", descripcion: "Ítems y total por WhatsApp, correo…", icono: Share2, onClick: () => void compartirResumen() },
    ...(activa ? [{ etiqueta: "Eliminar proforma", descripcion: "No se puede deshacer", icono: Trash2, peligro: true,
                    onClick: () => void handleEliminar() }] : []),
  ];

  return (
    <TirarParaRefrescar alRefrescar={res.recargar}>
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">

      {/* Arriba: número, cliente, el total en grande y lo que se hace */}
      <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
        <div className="flex items-start gap-2">
          {/* En el celular la flecha atrás ya está en la barra superior */}
          <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                      className="-ml-2 -mt-1 hidden lg:inline-flex" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-sutil">Proforma · {fecha(data.fecha_emision)}</p>
            <h1 className="font-mono text-base font-semibold text-texto sm:text-lg">{data.numero}</h1>
            <p className="truncate text-sm text-tenue">{data.cliente?.razon_social ?? "Sin cliente"}</p>
          </div>
          {facturada ? <InsigniaEstado tono="exito" icono={CheckCircle2} className="shrink-0">Facturada</InsigniaEstado>
            : vencida ? <InsigniaEstado tono="peligro" icono={AlertTriangle} className="shrink-0">Vencida</InsigniaEstado>
            : <InsigniaEstado tono="info" icono={Clock} className="shrink-0">Vigente</InsigniaEstado>}
        </div>

        <p className="mt-4 text-3xl font-bold tabular-nums text-texto">{dolares(data.total)}</p>
        <p className={`mt-1 text-xs ${vencida ? "text-peligro-texto" : "text-tenue"}`}>
          {data.fecha_validez
            ? `${vencida ? "Venció" : "Válida hasta"} ${fecha(data.fecha_validez).toLowerCase()}`
            : "Sin fecha de vencimiento"}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activa && (
            <Boton onClick={handleFacturar} icono={<Zap size={16} />} className="flex-1 sm:flex-none">
              Convertir en factura
            </Boton>
          )}
          {/* En la app no hay ventana de impresión: se comparte el resumen */}
          {ES_APP_NATIVA ? (
            <Boton variante="secundario" onClick={() => void compartirResumen()} icono={<Share2 size={16} />} className="flex-1 sm:flex-none">
              Compartir
            </Boton>
          ) : (
            <Boton variante="secundario" onClick={handleImprimir} icono={<Printer size={16} />} className="flex-1 sm:flex-none">
              Imprimir / PDF
            </Boton>
          )}
          <BotonIcono etiqueta="Más acciones" icono={<MoreVertical size={20} />} variante="secundario" onClick={() => setMenu(true)} />
        </div>
      </section>

      {/* Facturada: ir a la factura */}
      {facturada && data.documento_emitido_id && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-exito/20 bg-exito-suave px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-exito-texto">
            <CheckCircle2 size={16} aria-hidden /> Esta proforma fue facturada
          </p>
          <Boton variante="secundario" tamano="sm" onClick={() => router.push(rutas.documento(data.documento_emitido_id))}>
            Ver factura
          </Boton>
        </div>
      )}

      {/* Ítems y totales */}
      <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
        <h2 className="flex items-center gap-2 border-b border-borde px-4 py-3 text-sm font-semibold text-texto">
          <ListChecks size={16} className="text-sutil" aria-hidden />
          {data.items.length === 1 ? "1 ítem" : `${data.items.length} ítems`}
        </h2>
        <div className="divide-y divide-borde">
          {data.items.map((it: any, i: number) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-texto">{it.descripcion}</p>
                <p className="text-xs text-sutil">{it.cantidad} × {dolares(it.precio_unitario)} · IVA {etiquetaIva(it.tipo_iva)}</p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm font-semibold text-texto">{dolares(it.total)}</p>
                {it.valor_iva > 0 && <p className="text-xs text-sutil">IVA {dolares(it.valor_iva)}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-borde px-4 py-3 text-sm tabular-nums">
          <div className="flex justify-between text-tenue"><span>Subtotal</span><span>{dolares(data.subtotal)}</span></div>
          <div className="flex justify-between text-tenue"><span>IVA</span><span>{dolares(data.total_iva)}</span></div>
          <div className="flex justify-between border-t border-borde pt-1.5 text-base font-bold text-texto">
            <span>Total</span><span>{dolares(data.total)}</span>
          </div>
        </div>
      </section>

      {/* Observaciones */}
      {data.notas && (
        <section className="rounded-xl border border-borde bg-superficie p-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-texto">
            <StickyNote size={16} className="text-alerta" aria-hidden /> Observaciones
          </h2>
          <p className="text-sm text-tenue">{data.notas}</p>
        </section>
      )}

      {/* Cliente */}
      {data.cliente && (
        <Seccion titulo="Cliente" icono={User} resumen={data.cliente.identificacion}>
          {[
            { label: "Nombre",         value: data.cliente.razon_social },
            { label: "Identificación", value: `${NOMBRE_TIPO_ID[data.cliente.tipo_identificacion_sri] ?? "ID"}: ${data.cliente.identificacion}` },
            ...(data.cliente.email    ? [{ label: "Email",    value: data.cliente.email    }] : []),
            ...(data.cliente.telefono ? [{ label: "Teléfono", value: data.cliente.telefono }] : []),
            ...(data.cliente.direccion && data.cliente.direccion !== "S/N"
              ? [{ label: "Dirección", value: data.cliente.direccion }]
              : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4 py-1 text-sm">
              <span className="shrink-0 text-tenue">{label}</span>
              <span className="min-w-0 break-words text-right text-texto">{value}</span>
            </div>
          ))}
        </Seccion>
      )}

      <HojaAcciones
        abierta={menu}
        onCerrar={() => setMenu(false)}
        titulo={`Proforma ${data.numero}`}
        acciones={acciones}
      />

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
                  <span>{NOMBRE_TIPO_ID[data.cliente.tipo_identificacion_sri] ?? "ID"}: {data.cliente.identificacion}</span>
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
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>${dosDecimales(it.precio_unitario)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{etiquetaIva(it.tipo_iva)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>${dosDecimales(it.subtotal)}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontWeight: "bold" }}>${dosDecimales(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div style={{ width: "240px", marginLeft: "auto", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11px", color: "#444", borderBottom: "1px solid #eee" }}>
                <span>Subtotal</span><span>${dosDecimales(data.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "11px", color: "#444", borderBottom: "1px solid #eee" }}>
                <span>IVA</span><span>${dosDecimales(data.total_iva)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: "15px", fontWeight: "bold", color: "#059669", borderTop: "2px solid #059669", marginTop: "4px" }}>
                <span>TOTAL</span><span>${dosDecimales(data.total)}</span>
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
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", fontSize: "10px", color: "#047857" }}>
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

    </div>
    </TirarParaRefrescar>
  );
}