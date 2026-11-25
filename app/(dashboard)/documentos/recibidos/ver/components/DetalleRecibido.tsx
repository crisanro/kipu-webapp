"use client";
// Detalle de un comprobante recibido (compra). Ver la página en ../page.tsx
import { rutas } from "@/lib/rutas";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Download, Pencil, Save, MoreVertical,
  Link2, Shield, Receipt, Lock, Building2, ListChecks,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { aplicaALaEmpresa, bloqueadoPorPlan } from "@/components/dashboard/DashboardNav";
import { useLista } from "@/lib/useLista";
import { ESTADOS_PAGO, tipoComprobante } from "@/lib/estados";
import { guardarYCompartir } from "@/lib/nativo";
import { useAvisos } from "@/components/ui/Avisos";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import HojaAcciones, { type Accion } from "@/components/ui/HojaAcciones";
import Seccion from "@/components/ui/Seccion";
import FilaLista from "@/components/ui/FilaLista";
import Vacio from "@/components/ui/Vacio";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Esqueleto, EsqueletoFilas } from "@/components/ui/Esqueleto";
import { InsigniaEstado, InsigniaSri } from "@/components/ui/InsigniaEstado";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import { cn } from "@/components/ui/cn";

// "Emitir retención": misma regla que el menú (DashboardNav). Sin retenciones activadas no
// aparece; sin Kipu Pro / Al Día va con candado y lleva a planes (en la app no aparece).
const RET = { href: "/documentos/emitir/ret", requierePro: true, requiereRetenciones: true };

const fmt = (n: any) => parseFloat(String(n ?? 0)).toFixed(2);
const fecha = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? etiquetaPeriodo(f, f) : f || "—");

/** Fila etiqueta → valor de las secciones. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-tenue">{etiqueta}</span>
      <span className="min-w-0 break-words text-right text-texto">{valor || "—"}</span>
    </div>
  );
}

/** Interruptor (el mismo de la pantalla Más): un checkbox con role="switch". */
function Interruptor({ etiqueta, descripcion, activo, onCambio, deshabilitado, tono = "acento" }: {
  etiqueta: string; descripcion?: string; activo: boolean; onCambio: (v: boolean) => void;
  deshabilitado?: boolean; tono?: "acento" | "exito";
}) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3", deshabilitado && "cursor-not-allowed opacity-50")}>
      <span className="min-w-0">
        <span className="block text-sm text-texto">{etiqueta}</span>
        {descripcion && <span className="block text-xs text-sutil">{descripcion}</span>}
      </span>
      <input type="checkbox" role="switch" checked={activo} disabled={deshabilitado}
             onChange={e => onCambio(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-(--duracion-base)",
        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento",
        activo ? (tono === "exito" ? "bg-exito" : "bg-acento") : "bg-borde",
      )}>
        <span className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] duration-(--duracion-base) ease-estandar",
          activo ? "left-[22px]" : "left-0.5",
        )} />
      </span>
    </label>
  );
}

// ── Hoja: editar la clasificación fiscal ──────────────────────────────────────
// Cada ítem es una tarjeta con sus dos interruptores (antes una tabla de 5
// columnas que en el celular no cabía).
function ModalClasificacion({ doc, onClose, onSaved }: {
  doc:     any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items,  setItems]  = useState<any[]>(doc.items_detalle ?? []);
  const [notas,  setNotas]  = useState(doc.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const editItem = (idx: number, field: string, val: boolean) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: val } : item
    ));
  };

  const guardar = async () => {
    setSaving(true); setError("");
    try {
      await api.patch(`/api/v1/app/recibidos/${doc.id}`, {
        items_detalle:          items,
        deducible_renta:        items.some(i => i.deducible_renta),
        credito_tributario_iva: items.some(i => i.credito_tributario_iva),
        notas:                  notas || null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      const detalle = err?.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : "Error al guardar.");
    } finally { setSaving(false); }
  };

  const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
  const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);

  return (
    <Hoja
      abierta
      onCerrar={onClose}
      titulo="Clasificación fiscal"
      tamano="lg"
      cerrable={!saving}
      pie={<>
        <Boton variante="secundario" onClick={onClose} disabled={saving}>Cancelar</Boton>
        <Boton onClick={guardar} cargando={saving} icono={<Save size={16} />}>Guardar</Boton>
      </>}
    >
      <div className="space-y-4">
        {items.length > 0 ? (
          <div className="divide-y divide-borde overflow-hidden rounded-xl border border-borde">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-1 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-texto">{item.descripcion}</p>
                    <p className="text-xs text-sutil">{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs tabular-nums">
                    <p className="font-medium text-texto">${fmt(item.subtotal)}</p>
                    <p className="text-sutil">{item.tarifa_iva > 0 ? `IVA ${item.tarifa_iva}% $${fmt(item.valor_iva)}` : "Sin IVA"}</p>
                  </div>
                </div>
                {doc.tipo_doc !== "RET" && (
                  <Interruptor etiqueta="Deducible de renta" tono="exito" activo={!!item.deducible_renta}
                               onCambio={v => editItem(idx, "deducible_renta", v)} />
                )}
                <Interruptor etiqueta="Crédito tributario de IVA" activo={!!item.credito_tributario_iva}
                             deshabilitado={!(item.tarifa_iva > 0)}
                             descripcion={item.tarifa_iva > 0 ? undefined : "No aplica: el ítem no tiene IVA"}
                             onCambio={v => editItem(idx, "credito_tributario_iva", v)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-sutil">Sin ítems registrados.</p>
        )}

        {/* Resumen fiscal */}
        <div className="space-y-1.5 rounded-xl bg-presionado p-4 text-sm tabular-nums">
          <div className="flex justify-between text-tenue">
            <span>Total documento</span>
            <span className="font-bold text-texto">${fmt(doc.importe_total)}</span>
          </div>
          {doc.tipo_doc !== "RET" && (
            <div className="flex justify-between text-tenue">
              <span>Deducible renta</span>
              <span className="font-medium text-exito-texto">${fmt(totalDeducible)}</span>
            </div>
          )}
          <div className="flex justify-between text-tenue">
            <span>Crédito tributario IVA</span>
            <span className="font-medium text-info">${fmt(totalCredito)}</span>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="notas-recibido" className="mb-1.5 block text-xs text-sutil">Notas</label>
          <textarea
            id="notas-recibido"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={2}
            placeholder="Observaciones internas…"
            className="w-full resize-none rounded-lg border border-borde bg-superficie px-3 py-2 text-base text-texto focus:border-acento focus:outline-none sm:text-sm"
          />
        </div>

        {error && <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>}
      </div>
    </Hoja>
  );
}

// ── Archivo original ──────────────────────────────────────────────────────────
// GET /recibidos/{id}/archivo devuelve lo que se guardó: el XML subido o la foto
// del físico. Los importados del SRI o a mano solo guardan datos (.json): sin botón.
// Se baja con api (lleva la sesión); un <a href> directo no la manda.
const ARCHIVO_ORIGINAL: Record<string, string> = {
  xml: "Descargar XML", pdf: "Descargar PDF",
  jpg: "Descargar imagen", jpeg: "Descargar imagen", png: "Descargar imagen", webp: "Descargar imagen",
};

interface DocConArchivo {
  id: string; xml_path?: string | null; clave_acceso?: string | null; numero_doc?: string | null;
}

/** La acción "Descargar XML / imagen" para el menú ⋮, o null si no hay archivo guardado. */
function useArchivoOriginal(doc: DocConArchivo | undefined): { accion: Accion | null; descargando: boolean } {
  const [descargando, setDescargando] = useState(false);
  const avisos = useAvisos();
  const ext   = String(doc?.xml_path ?? "").split(".").pop()?.toLowerCase() ?? "";
  const texto = ARCHIVO_ORIGINAL[ext];
  if (!doc || !texto) return { accion: null, descargando };

  const descargar = async () => {
    setDescargando(true);
    try {
      const res = await api.get(`/api/v1/app/recibidos/${doc.id}/archivo`, { responseType: "blob" });
      // Web: descarga; app: hoja de compartir (lib/nativo.ts)
      await guardarYCompartir(res.data, `${doc.clave_acceso || doc.numero_doc || doc.id}.${ext}`);
    } catch (e) {
      // Con responseType "blob" el detalle del error también llega como blob
      let detalle = "";
      const blob = (e as { response?: { data?: Blob } })?.response?.data;
      try { detalle = blob ? JSON.parse(await blob.text())?.detail ?? "" : ""; } catch {}
      avisos.error(typeof detalle === "string" && detalle ? detalle : "No pudimos descargar el archivo. Intenta de nuevo.");
    } finally {
      setDescargando(false);
    }
  };

  return {
    accion: { etiqueta: texto, descripcion: "El archivo con el que se registró", icono: Download, onClick: () => void descargar() },
    descargando,
  };
}

// ── Detalle ───────────────────────────────────────────────────────────────────
// Lo usa la pantalla /documentos/recibidos/ver?id=… y el panel de la derecha de
// Recibidos en la compu (enPanel: sin flecha atrás y con márgenes de panel).
export default function DetalleRecibido({ id, enPanel = false }: { id: string; enPanel?: boolean }) {
  const router  = useRouter();
  const avisos  = useAvisos();
  const empresa = useAuthStore((s) => s.empresa);
  const verRet  = aplicaALaEmpresa(RET, empresa) && !rutaFueraDelPlan(RET.href, empresa);
  const retSinPlan = bloqueadoPorPlan(RET, empresa);

  // Con caché: al volver de la retención el documento aparece al instante (lib/useLista.ts)
  const res = useLista<{ data?: any }>(`/api/v1/app/recibidos/${id}`);
  const doc = res.datos?.data;
  const cargar = res.recargar;

  const [editando,    setEditando]    = useState(false);
  const [guardandoAf, setGuardandoAf] = useState(false);
  const [menu,        setMenu]        = useState(false);
  const archivo = useArchivoOriginal(doc);

  if (res.cargando) return (
    <div className={enPanel ? "space-y-4 p-4" : "mx-auto max-w-3xl space-y-4 p-4 md:p-6"} aria-busy="true">
      <Esqueleto className="h-48 rounded-2xl" />
      <EsqueletoFilas filas={4} />
    </div>
  );

  if (!doc) {
    // 404/403: no existe o es de otra empresa. Otro error: la conexión, se puede reintentar.
    const estado = (res.error as { response?: { status?: number } } | undefined)?.response?.status;
    const deRed  = !!res.error && estado !== 404 && estado !== 403;
    return (
      <Vacio
        icono={FileText}
        titulo={deRed ? "No pudimos cargar el documento" : "Documento no encontrado"}
        descripcion={deRed ? "Revisa tu conexión e intenta de nuevo." : "Puede que sea de otra empresa o que ya no exista."}
        accion={deRed
          ? <Boton onClick={() => void cargar()}>Reintentar</Boton>
          : enPanel ? undefined
          : <Boton variante="secundario" onClick={() => router.push("/documentos/recibidos")}>Ir a Recibidos</Boton>}
        className="py-20"
      />
    );
  }

  const items          = (doc.items_detalle ?? []) as any[];
  const pago           = doc.estado_pago && ["FAC", "LIQ"].includes(doc.tipo_doc) ? ESTADOS_PAGO[doc.estado_pago] : undefined;
  const totalDeducible = items.filter(i => i.deducible_renta).reduce((s, i) => s + i.subtotal, 0);
  const totalCredito   = items.filter(i => i.credito_tributario_iva).reduce((s, i) => s + i.valor_iva, 0);
  const puedeRetener   = ["FAC", "LIQ"].includes(doc.tipo_doc) && !doc.retencion_emitida && verRet;
  const vinculos       = (doc.doc_origen_recibido_id ? 1 : 0) + (doc.doc_origen_emitido_id ? 1 : 0) + (doc.retencion_emitida ? 1 : 0);

  const cambiarActivoFijo = async (valor: boolean) => {
    setGuardandoAf(true);
    try {
      await api.patch(`/api/v1/app/recibidos/${doc.id}`, { activo_fijo: valor });
      await cargar();
    } catch {
      avisos.error("No se pudo guardar. Intenta de nuevo.");
    } finally { setGuardandoAf(false); }
  };

  const acciones: Accion[] = archivo.accion ? [archivo.accion] : [];

  return (
    <TirarParaRefrescar alRefrescar={cargar}>
      <div className={enPanel ? "space-y-4 p-4" : "mx-auto max-w-3xl space-y-4 p-4 md:p-6"}>

        {/* Arriba: tipo, número, proveedor y el monto en grande */}
        <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
          <div className="flex items-start gap-2">
            {/* En el celular la flecha atrás ya está en la barra superior; en el panel, la X del panel */}
            {!enPanel && (
              <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                          className="-ml-2 -mt-1 hidden lg:inline-flex" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-sutil">{tipoComprobante(doc.tipo_doc).etiqueta} · {fecha(doc.fecha_emision)}</p>
              <h1 className="font-mono text-base font-semibold text-texto sm:text-lg">{doc.numero_doc}</h1>
              <p className="truncate text-sm text-tenue">{doc.razon_social_proveedor}</p>
            </div>
            {pago && <InsigniaEstado tono={pago.tono} className="shrink-0">{pago.etiqueta}</InsigniaEstado>}
          </div>

          <p className="mt-4 text-3xl font-bold tabular-nums text-texto">${fmt(doc.importe_total)}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {puedeRetener && (
              <Boton
                onClick={() => router.push(retSinPlan ? "/planes" : `/documentos/emitir/ret?doc_origen_recibido_id=${doc.id}`)}
                title={retSinPlan ? "Disponible en Kipu Pro" : undefined}
                icono={retSinPlan ? <Lock size={16} /> : <Receipt size={16} />}
                className="flex-1 sm:flex-none"
              >
                Emitir retención
              </Boton>
            )}
            <Boton variante="secundario" onClick={() => setEditando(true)} icono={<Pencil size={16} />} className="flex-1 sm:flex-none">
              Clasificación
            </Boton>
            {acciones.length > 0 && (
              <BotonIcono etiqueta="Más acciones" icono={<MoreVertical size={20} />} variante="secundario"
                          onClick={() => setMenu(true)} disabled={archivo.descargando} />
            )}
          </div>
        </section>

        {/* Clasificación fiscal: lo que importa de una compra, a la vista */}
        <section className="rounded-xl border border-borde bg-superficie p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
            <Shield size={16} className="text-acento" aria-hidden /> Clasificación fiscal
          </h2>
          <div className={cn("grid gap-2", doc.tipo_doc !== "RET" ? "grid-cols-2" : "grid-cols-1")}>
            {doc.tipo_doc !== "RET" && (
              <div className="rounded-lg bg-exito-suave p-3">
                <p className="text-xs text-tenue">Deducible renta</p>
                <p className="text-base font-bold tabular-nums text-exito-texto">${fmt(totalDeducible)}</p>
              </div>
            )}
            <div className="rounded-lg bg-info-suave p-3">
              <p className="text-xs text-tenue">Crédito tributario IVA</p>
              <p className="text-base font-bold tabular-nums text-info">${fmt(totalCredito)}</p>
            </div>
          </div>

          {/* Activo fijo: computador, vehículo, maquinaria… (104: 501/511/521) */}
          {["FAC", "NDB", "NCR"].includes(doc.tipo_doc) && (
            <div className="mt-3 border-t border-borde pt-2">
              <Interruptor
                etiqueta="Es un activo fijo"
                descripcion="Equipos, vehículos o maquinaria que usarás más de un año. Se declara en el casillero 501."
                activo={!!doc.datos?.activo_fijo}
                deshabilitado={guardandoAf}
                onCambio={cambiarActivoFijo}
              />
            </div>
          )}

          {doc.notas && <p className="mt-3 border-t border-borde pt-3 text-xs text-tenue">{doc.notas}</p>}
        </section>

        {/* Ítems */}
        {items.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-borde bg-superficie">
            <h2 className="flex items-center gap-2 border-b border-borde px-4 py-3 text-sm font-semibold text-texto">
              <ListChecks size={16} className="text-sutil" aria-hidden />
              {items.length === 1 ? "1 ítem" : `${items.length} ítems`}
            </h2>
            <div className="divide-y divide-borde">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-texto">{item.descripcion}</p>
                    <p className="text-xs text-sutil">{item.cantidad} × ${fmt(item.precio_unitario)}</p>
                    {(item.deducible_renta || item.credito_tributario_iva) && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {item.deducible_renta && <InsigniaEstado tono="exito">Deducible</InsigniaEstado>}
                        {item.credito_tributario_iva && <InsigniaEstado tono="info">Crédito IVA</InsigniaEstado>}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    <p className="font-semibold text-texto">${fmt(item.subtotal)}</p>
                    {item.tarifa_iva > 0 && <p className="text-xs text-sutil">IVA {item.tarifa_iva}% ${fmt(item.valor_iva)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pago al proveedor — solo FAC/LIQ */}
        {["FAC", "LIQ"].includes(doc.tipo_doc) && (
          <Seccion titulo="Pago al proveedor" icono={Receipt} resumen={pago?.etiqueta}>
            {doc.forma_pago ? (
              <>
                <Dato etiqueta="Forma de pago" valor={doc.forma_pago} />
                {doc.numero_comprobante_pago && <Dato etiqueta="N° comprobante" valor={<span className="font-mono">{doc.numero_comprobante_pago}</span>} />}
                {doc.fecha_pago && <Dato etiqueta="Fecha de pago" valor={fecha(doc.fecha_pago)} />}
              </>
            ) : (
              <p className="text-sm text-sutil">Sin pago registrado.</p>
            )}
          </Seccion>
        )}

        {/* Documentos relacionados: el que modifica, el retenido y la retención emitida */}
        {vinculos > 0 && (
          <Seccion titulo="Documentos relacionados" icono={Link2}
                   resumen={doc.retencion_emitida ? "Retención emitida" : vinculos === 1 ? "1 documento" : `${vinculos} documentos`}>
            <div className="-my-3 divide-y divide-borde">
              {doc.doc_origen_recibido_id && (
                <FilaLista className="-mx-4 w-auto" href={rutas.recibido(doc.doc_origen_recibido_id)}
                           titulo="Documento que modifica" subtitulo="Comprobante recibido" chevron />
              )}
              {doc.doc_origen_emitido_id && (
                <FilaLista className="-mx-4 w-auto" href={rutas.documento(doc.doc_origen_emitido_id)}
                           titulo="Documento retenido" subtitulo="Comprobante emitido" chevron />
              )}
              {doc.retencion_emitida && (
                <FilaLista className="-mx-4 w-auto" href={rutas.documento(doc.retencion_emitida.id)}
                           titulo={<span className="font-mono">{doc.retencion_emitida.numero_doc}</span>}
                           subtitulo="Retención emitida"
                           finAbajo={<InsigniaSri estado={doc.retencion_emitida.estado_sri} conIcono={false} />} />
              )}
            </div>
          </Seccion>
        )}

        {/* Proveedor */}
        <Seccion titulo="Proveedor" icono={Building2} resumen={doc.ruc_proveedor}>
          <Dato etiqueta="Razón social" valor={doc.razon_social_proveedor} />
          <Dato etiqueta="RUC"          valor={doc.ruc_proveedor} />
          <Dato etiqueta="N° documento" valor={<span className="font-mono">{doc.numero_doc}</span>} />
          <Dato etiqueta="Fecha"        valor={fecha(doc.fecha_emision)} />
          <Dato etiqueta="Fuente"       valor={doc.fuente} />
          <Dato etiqueta="Autorización" valor={doc.fecha_autorizacion ? new Date(doc.fecha_autorizacion).toLocaleDateString("es-EC") : "—"} />
        </Seccion>

        <HojaAcciones
          abierta={menu}
          onCerrar={() => setMenu(false)}
          titulo={`${tipoComprobante(doc.tipo_doc).etiqueta} ${doc.numero_doc}`}
          acciones={acciones}
        />

        {/* Editar clasificación */}
        {editando && (
          <ModalClasificacion
            doc={doc}
            onClose={() => setEditando(false)}
            onSaved={() => void cargar()}
          />
        )}
      </div>
    </TirarParaRefrescar>
  );
}
