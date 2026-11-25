"use client";
import { useEffect, useState, type ReactNode } from "react";
import { rutas } from "@/lib/rutas";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import {
  fechaCatalogo, obtenerCatalogoRetenciones, type CatalogoRetenciones,
} from "@/lib/catalogos/retenciones";
import { fmt, FORMA_PAGO, TIPO_ID, type FacturaBase } from "./DetalleShared";

interface Props { factura: FacturaBase; }

const TIPO_IMPUESTO: Record<string, string> = {
  "1": "Renta",
  "2": "IVA",
  "6": "ISD",
};

const DOCS_SUSTENTO: Record<string, string> = {
  "01": "Factura",
  "03": "Liquidación de Compra",
  "04": "Nota de Crédito",
  "05": "Nota de Débito",
  "07": "Comprobante de Retención",
};

const TIPO_SUJETO: Record<string, string> = { "01": "Persona natural", "02": "Sociedad" };

const REGIMEN: Record<string, string> = {
  "01": "General",
  "02": "Paraíso fiscal",
  "03": "Régimen fiscal preferente",
};

// Campos adicionales con otra etiqueta en pantalla (el XML no cambia)
const ETIQUETA_ADICIONAL: Record<string, string> = {
  "RUC Proveedor": "Proveedor del sistema de facturación",
};

// Partes del XML que se muestran (un nodo repetido llega como objeto o como lista)
type Uno<T> = T | T[] | null | undefined;
type Num = string | number;

interface RetencionXml {
  codigo?: string; codigoRetencion?: string; codigoPorcentaje?: string;
  baseImponible?: Num; porcentajeRetener?: Num; tarifa?: Num; valorRetenido?: Num; valor?: Num;
  // RET v1.0: cada impuesto traía su documento sustento
  codDocSustento?: string; numDocSustento?: string; fechaEmisionDocSustento?: string;
}

interface DocSustentoXml {
  codSustento?: string; codDocSustento?: string; fechaEmisionDocSustento?: string;
  pagoLocExt?: string; paisEfecPago?: string; tipoRegi?: string;
  aplicConvDobTrib?: string; pagExtSujRetNorLeg?: string; pagoRegFis?: string;
  totalSinImpuestos?: Num; importeTotal?: Num;
  impuestosDocSustento?: { impuestoDocSustento?: Uno<{ valorImpuesto?: Num }> };
  retenciones?: { retencion?: Uno<RetencionXml> };
  pagos?: { pago?: Uno<{ formaPago?: string }> };
}

interface CampoAdicional { "@nombre"?: string; "#text"?: string }

const lista = <T,>(v: Uno<T>): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const num   = (v?: Num) => parseFloat(String(v ?? 0)) || 0;

// Catálogo vigente a la fecha del documento sustento: solo para las descripciones.
// Si no carga, se muestran los códigos.
function useCatalogo(fecha?: string) {
  const [cat, setCat] = useState<CatalogoRetenciones | null>(null);
  useEffect(() => {
    let vigente = true;
    obtenerCatalogoRetenciones(fechaCatalogo(fecha))
      .then(c => { if (vigente) setCat(c); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [fecha]);
  return cat;
}

function descRetencion(cat: CatalogoRetenciones | null, codigo: string, codRet: string): string | null {
  if (!cat) return null;
  if (codigo === "1") {
    const c = cat.renta.codigos.find(x => x.codigo === codRet);
    return c ? c.descripcion.replace(/^Pago a no residentes\s*-\s*/i, "") : null;
  }
  const tabla = codigo === "2" ? cat.iva : codigo === "6" ? cat.isd : [];
  return tabla.find(x => x.codigo === codRet)?.descripcion ?? null;
}

const conDesc = (codigo: string, desc?: string | null) => (desc ? `${codigo} · ${desc}` : codigo);

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
    >
      <h2 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Filas({ filas }: { filas: { label: string; value: ReactNode }[] }) {
  return (
    <div className="space-y-2 text-sm">
      {filas.filter(f => f.value != null && f.value !== "").map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <span style={{ color: "var(--kipu-muted)" }}>{label}</span>
          <span className="text-right max-w-[60%]" style={{ color: "var(--kipu-text)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DetalleRET({ factura }: Props) {
  const router = useRouter();
  // App de las tiendas: sin enlace a Recibidos si el plan no los incluye
  const sinRecibidos = rutaFueraDelPlan("/documentos/recibidos", useAuthStore((s) => s.empresa));
  const datos   = factura.datos ?? {};
  const trib    = datos.infoTributaria    ?? {};
  const infoRET = datos.infoCompRetencion ?? {};

  // RET v2.0.0: las retenciones van dentro de cada docSustento; v1.0: en impuestos
  const sustentos   = lista<DocSustentoXml>(datos.docsSustento?.docSustento);
  const retenciones = sustentos.length
    ? sustentos.flatMap(s => lista(s.retenciones?.retencion))
    : lista<RetencionXml>(datos.impuestos?.impuesto);

  const cat = useCatalogo(sustentos[0]?.fechaEmisionDocSustento ?? infoRET.fechaEmision);

  const valor = (i: RetencionXml) => num(i.valorRetenido ?? i.valor);
  const totalRetenido = retenciones.reduce((s, i) => s + valor(i), 0);
  const porTipo = ["1", "2", "6"]
    .map(cod => ({ cod, lineas: retenciones.filter(i => String(i.codigo) === cod) }))
    .filter(t => t.lineas.length > 0)
    .map(t => ({ cod: t.cod, total: t.lineas.reduce((s, i) => s + valor(i), 0) }));

  const adicionales = lista<CampoAdicional>(datos.infoAdicional?.campoAdicional)
    .filter(a => a["@nombre"] !== "PROVEEDOR_SISTEMA_INFORMATICO");

  const nombreSustento = (cod: string) => cat?.sustento.find(s => s.codigo === cod)?.descripcion;
  const nombrePais     = (cod: string) => cat?.paises.find(p => p.codigo === cod)?.nombre;
  const nombreRegimen  = (cod: string) =>
    cat?.regimen_fiscal_exterior.find(r => r.codigo === cod)?.descripcion ?? REGIMEN[cod];

  return (
    <>
      {/* Total retenido */}
      {retenciones.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-info) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-info) 20%, transparent)",
          }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-info)" }}>
              Total retenido
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kipu-subtle)" }}>
              {porTipo.map(t => `${TIPO_IMPUESTO[t.cod]} $${fmt(t.total)}`).join(" · ")}
            </p>
          </div>
          <span className="text-2xl font-bold" style={{ color: "var(--kipu-info)" }}>${fmt(totalRetenido)}</span>
        </div>
      )}

      {/* Emisor */}
      <Tarjeta titulo="Emisor">
        <Filas filas={[
          { label: "Razón Social",    value: trib.razonSocial },
          { label: "RUC",             value: trib.ruc },
          { label: "Dirección",       value: trib.dirMatriz },
          { label: "Establecimiento", value: `${trib.estab}-${trib.ptoEmi}` },
          { label: "Ambiente",        value: trib.ambiente == 2 ? "🟢 Producción" : "🟡 Pruebas" },
        ]} />
      </Tarjeta>

      {/* Sujeto retenido */}
      <Tarjeta titulo="Sujeto Retenido">
        <Filas filas={[
          { label: "Razón Social",       value: infoRET.razonSocialSujetoRetenido },
          { label: "Tipo ID",            value: TIPO_ID[infoRET.tipoIdentificacionSujetoRetenido] ?? infoRET.tipoIdentificacionSujetoRetenido },
          { label: "Identificación",     value: infoRET.identificacionSujetoRetenido },
          { label: "Tipo de sujeto",     value: infoRET.tipoSujetoRetenido && (TIPO_SUJETO[infoRET.tipoSujetoRetenido] ?? infoRET.tipoSujetoRetenido) },
          { label: "Parte relacionada",  value: infoRET.parteRel },
          { label: "Período Fiscal",     value: infoRET.periodoFiscal },
        ]} />
      </Tarjeta>

      {/* Documento sustento */}
      {(sustentos.length > 0 || factura.doc_origen_emitido || factura.doc_origen_recibido) && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-info) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-info) 20%, transparent)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--kipu-info)" }}>
                Documento Sustento
              </h2>
              {(factura.doc_origen_emitido || factura.doc_origen_recibido) && (
                <>
                  <p className="text-sm font-mono font-medium" style={{ color: "var(--kipu-text)" }}>
                    {(factura.doc_origen_emitido ?? factura.doc_origen_recibido).numero_doc}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    {factura.doc_origen_emitido ? "Liquidación de Compra" : factura.doc_origen_recibido.razon_social_proveedor}
                    {" · "}${fmt((factura.doc_origen_emitido ?? factura.doc_origen_recibido).importe_total)}
                  </p>
                </>
              )}
            </div>
            {factura.doc_origen_emitido ? (
              <button
                type="button"
                onClick={() => router.push(rutas.documento(factura.doc_origen_emitido.id))}
                className="text-xs transition-colors shrink-0"
                style={{ color: "var(--kipu-info)" }}
              >
                Ver →
              </button>
            ) : factura.doc_origen_recibido && !sinRecibidos ? (
              <button
                type="button"
                onClick={() => router.push(rutas.recibido(factura.doc_origen_recibido_id ?? ""))}
                className="text-xs transition-colors shrink-0"
                style={{ color: "var(--kipu-info)" }}
              >
                Ver factura recibida →
              </button>
            ) : null}
          </div>

          {sustentos.map((s, n) => {
            const exterior = s.pagoLocExt === "02";
            const iva = lista(s.impuestosDocSustento?.impuestoDocSustento)
              .reduce((t, i) => t + num(i.valorImpuesto), 0);
            return (
              <div
                key={n}
                className="pt-3"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--kipu-info) 20%, transparent)" }}
              >
                <Filas filas={[
                  { label: "Documento",       value: `${DOCS_SUSTENTO[s.codDocSustento ?? ""] ?? s.codDocSustento} · ${s.fechaEmisionDocSustento}` },
                  { label: "Código sustento", value: s.codSustento && conDesc(s.codSustento, nombreSustento(s.codSustento)) },
                  { label: "Pago",            value: exterior ? "Exterior" : "Local" },
                  ...(exterior ? [
                    { label: "País del pago",           value: s.paisEfecPago && conDesc(s.paisEfecPago, nombrePais(s.paisEfecPago)) },
                    { label: "Régimen fiscal",          value: s.tipoRegi && conDesc(s.tipoRegi, nombreRegimen(s.tipoRegi)) },
                    { label: "Convenio doble tributación", value: s.aplicConvDobTrib },
                    { label: "Sujeto a retención por norma legal", value: s.pagExtSujRetNorLeg },
                    { label: "Pago a régimen fiscal preferente",   value: s.pagoRegFis },
                  ] : []),
                  { label: "Subtotal",      value: `$${fmt(s.totalSinImpuestos)}` },
                  { label: "IVA",           value: `$${fmt(iva)}` },
                  { label: "Total",         value: `$${fmt(s.importeTotal)}` },
                  { label: "Forma de pago", value: lista(s.pagos?.pago).map(p => FORMA_PAGO[p.formaPago ?? ""] ?? p.formaPago).join(", ") },
                ]} />
              </div>
            );
          })}
        </div>
      )}

      {/* Impuestos retenidos */}
      {retenciones.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "2px solid var(--kipu-border)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
              Impuestos Retenidos
            </h2>
          </div>
          <div>
            {retenciones.map((imp, i) => {
              const codRet = String(imp.codigoRetencion || imp.codigoPorcentaje || "");
              const desc   = descRetencion(cat, String(imp.codigo), codRet);
              return (
                <div
                  key={i}
                  className="px-4 py-3 space-y-1"
                  style={{ borderTop: i > 0 ? "1px solid var(--kipu-border)" : "none" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--kipu-info) 20%, transparent)",
                          color: "var(--kipu-info)",
                        }}
                      >
                        {TIPO_IMPUESTO[imp.codigo ?? ""] ?? imp.codigo}
                      </span>
                      <span className="text-sm min-w-0 line-clamp-2" style={{ color: "var(--kipu-text)" }} title={desc ?? undefined}>
                        <span className="font-mono">{codRet}</span>
                        {desc && <span style={{ color: "var(--kipu-muted)" }}> · {desc}</span>}
                      </span>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: "var(--kipu-info)" }}>
                      ${fmt(valor(imp))}
                    </span>
                  </div>
                  <p className="text-xs pl-1" style={{ color: "var(--kipu-subtle)" }}>
                    Base ${fmt(imp.baseImponible)} × {imp.porcentajeRetener || imp.tarifa}%
                  </p>
                  {/* RET v1.0: cada impuesto traía su documento sustento */}
                  {imp.numDocSustento && (
                    <p className="text-xs pl-1" style={{ color: "var(--kipu-muted)" }}>
                      Doc: {DOCS_SUSTENTO[imp.codDocSustento ?? ""] ?? imp.codDocSustento} · {imp.numDocSustento}
                      {imp.fechaEmisionDocSustento && ` · ${imp.fechaEmisionDocSustento}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="px-4 py-3 flex justify-between font-bold"
            style={{ borderTop: "2px solid var(--kipu-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--kipu-muted)" }}>Total retenido</span>
            <span style={{ color: "var(--kipu-info)" }}>${fmt(totalRetenido)}</span>
          </div>
        </div>
      )}

      {/* Info adicional */}
      {adicionales.length > 0 && (
        <Tarjeta titulo="Información Adicional">
          <div className="space-y-2">
            {adicionales.map((campo, i) => (
              <div key={i} className="flex justify-between gap-4 text-sm">
                <span style={{ color: "var(--kipu-subtle)" }}>
                  {ETIQUETA_ADICIONAL[campo["@nombre"] ?? ""] ?? campo["@nombre"]}
                </span>
                <span className="text-right" style={{ color: "var(--kipu-text)" }}>{campo["#text"]}</span>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}
    </>
  );
}
