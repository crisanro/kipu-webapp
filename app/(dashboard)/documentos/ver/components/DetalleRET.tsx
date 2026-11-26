"use client";
import { useEffect, useState, type ReactNode } from "react";
import { rutas } from "@/lib/rutas";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import {
  fechaCatalogo, obtenerCatalogoRetenciones, type CatalogoRetenciones,
} from "@/lib/catalogos/retenciones";
import { Building2, Info, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import { FORMA_PAGO, TIPO_ID, type FacturaBase } from "./DetalleShared";
import { dosDecimales } from "@/lib/dinero";

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

// Sección plegable (Sujeto retenido, Emisor, Información adicional)
function Tarjeta({ titulo, icono, resumen, children }: {
  titulo: string; icono: LucideIcon; resumen?: ReactNode; children: ReactNode;
}) {
  return <Seccion titulo={titulo} icono={icono} resumen={resumen}>{children}</Seccion>;
}

function Filas({ filas }: { filas: { label: string; value: ReactNode }[] }) {
  return (
    <div className="space-y-1 text-sm">
      {filas.filter(f => f.value != null && f.value !== "").map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4 py-0.5">
          <span className="shrink-0 text-tenue">{label}</span>
          <span className="min-w-0 break-words text-right text-texto">{value}</span>
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

  const origen = factura.doc_origen_emitido ?? factura.doc_origen_recibido;

  return (
    <>
      {/* Impuestos retenidos (el total ya está arriba, en grande) */}
      {retenciones.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
          <div className="border-b border-borde px-4 py-3">
            <h2 className="text-sm font-semibold text-texto">Impuestos retenidos</h2>
            {porTipo.length > 1 && (
              <p className="mt-0.5 text-xs text-sutil">
                {porTipo.map(t => `${TIPO_IMPUESTO[t.cod]} $${dosDecimales(t.total)}`).join(" · ")}
              </p>
            )}
          </div>
          <div className="divide-y divide-borde">
            {retenciones.map((imp, i) => {
              const codRet = String(imp.codigoRetencion || imp.codigoPorcentaje || "");
              const desc   = descRetencion(cat, String(imp.codigo), codRet);
              return (
                <div key={i} className="space-y-1 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="shrink-0 rounded-full bg-info-suave px-2 py-0.5 text-xs font-medium text-info">
                        {TIPO_IMPUESTO[imp.codigo ?? ""] ?? imp.codigo}
                      </span>
                      <span className="line-clamp-2 min-w-0 text-sm text-texto" title={desc ?? undefined}>
                        <span className="font-mono">{codRet}</span>
                        {desc && <span className="text-tenue"> · {desc}</span>}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-texto">
                      ${dosDecimales(valor(imp))}
                    </span>
                  </div>
                  <p className="pl-1 text-xs text-sutil">
                    Base ${dosDecimales(imp.baseImponible)} × {imp.porcentajeRetener || imp.tarifa}%
                  </p>
                  {/* RET v1.0: cada impuesto traía su documento sustento */}
                  {imp.numDocSustento && (
                    <p className="pl-1 text-xs text-tenue">
                      Doc: {DOCS_SUSTENTO[imp.codDocSustento ?? ""] ?? imp.codDocSustento} · {imp.numDocSustento}
                      {imp.fechaEmisionDocSustento && ` · ${imp.fechaEmisionDocSustento}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between border-t border-borde px-4 py-3 font-bold tabular-nums text-texto">
            <span className="text-sm">Total retenido</span>
            <span>${dosDecimales(totalRetenido)}</span>
          </div>
        </section>
      )}

      {/* Documento sustento */}
      {(sustentos.length > 0 || origen) && (
        <section className="space-y-3 rounded-xl border border-borde bg-superficie p-4">
          <div>
            <h2 className="text-sm font-semibold text-texto">Documento sustento</h2>
            {origen && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium text-texto">{origen.numero_doc}</p>
                  <p className="text-xs text-sutil">
                    {factura.doc_origen_emitido ? "Liquidación de Compra" : factura.doc_origen_recibido.razon_social_proveedor}
                    {" · "}${dosDecimales(origen.importe_total)}
                  </p>
                </div>
                {factura.doc_origen_emitido ? (
                  <Boton variante="secundario" tamano="sm"
                         onClick={() => router.push(rutas.documento(factura.doc_origen_emitido.id))}>
                    Ver liquidación
                  </Boton>
                ) : factura.doc_origen_recibido && !sinRecibidos ? (
                  <Boton variante="secundario" tamano="sm"
                         onClick={() => router.push(rutas.recibido(factura.doc_origen_recibido_id ?? ""))}>
                    Ver factura recibida
                  </Boton>
                ) : null}
              </div>
            )}
          </div>

          {sustentos.map((s, n) => {
            const exterior = s.pagoLocExt === "02";
            const iva = lista(s.impuestosDocSustento?.impuestoDocSustento)
              .reduce((t, i) => t + num(i.valorImpuesto), 0);
            return (
              <div key={n} className="border-t border-borde pt-3">
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
                  { label: "Subtotal",      value: `$${dosDecimales(s.totalSinImpuestos)}` },
                  { label: "IVA",           value: `$${dosDecimales(iva)}` },
                  { label: "Total",         value: `$${dosDecimales(s.importeTotal)}` },
                  { label: "Forma de pago", value: lista(s.pagos?.pago).map(p => FORMA_PAGO[p.formaPago ?? ""] ?? p.formaPago).join(", ") },
                ]} />
              </div>
            );
          })}
        </section>
      )}

      {/* Sujeto retenido */}
      <Tarjeta titulo="Sujeto retenido" icono={UserRound} resumen={infoRET.identificacionSujetoRetenido}>
        <Filas filas={[
          { label: "Razón social",       value: infoRET.razonSocialSujetoRetenido },
          { label: "Tipo ID",            value: TIPO_ID[infoRET.tipoIdentificacionSujetoRetenido] ?? infoRET.tipoIdentificacionSujetoRetenido },
          { label: "Identificación",     value: infoRET.identificacionSujetoRetenido },
          { label: "Tipo de sujeto",     value: infoRET.tipoSujetoRetenido && (TIPO_SUJETO[infoRET.tipoSujetoRetenido] ?? infoRET.tipoSujetoRetenido) },
          { label: "Parte relacionada",  value: infoRET.parteRel },
          { label: "Período fiscal",     value: infoRET.periodoFiscal },
        ]} />
      </Tarjeta>

      {/* Info adicional */}
      {adicionales.length > 0 && (
        <Tarjeta titulo="Información adicional" icono={Info}
                 resumen={adicionales.length === 1 ? "1 campo" : `${adicionales.length} campos`}>
          <Filas filas={adicionales.map(campo => ({
            label: ETIQUETA_ADICIONAL[campo["@nombre"] ?? ""] ?? campo["@nombre"] ?? "",
            value: campo["#text"],
          }))} />
        </Tarjeta>
      )}

      {/* Emisor */}
      <Tarjeta titulo="Emisor" icono={Building2} resumen={trib.ruc}>
        <Filas filas={[
          { label: "Razón social",    value: trib.razonSocial },
          { label: "RUC",             value: trib.ruc },
          { label: "Dirección",       value: trib.dirMatriz },
          { label: "Establecimiento", value: `${trib.estab}-${trib.ptoEmi}` },
          { label: "Ambiente",        value: trib.ambiente == 2 ? "Producción" : "Pruebas" },
        ]} />
      </Tarjeta>
    </>
  );
}
