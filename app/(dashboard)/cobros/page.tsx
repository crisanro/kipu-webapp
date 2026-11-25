"use client";
import { useConfirmar } from "@/components/ui/Confirmar";
import { rutas } from "@/lib/rutas";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { compartir, abrirExterno } from "@/lib/nativo";
import { useAvisos } from "@/components/ui/Avisos";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import type { TonoEstado } from "@/lib/estados";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import HojaAcciones, { type Accion } from "@/components/ui/HojaAcciones";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import Boton from "@/components/ui/Boton";
import {
  Link2, Plus, Copy, MessageCircle, RefreshCw, Ban, FileText, Share2, Loader2,
} from "lucide-react";

// "Facturar cuando el cliente pague": la factura ya armada espera el pago del link
interface Cobro {
  id:                     string;
  estado:                 "PENDIENTE" | "PAGADO" | "FACTURADO" | "ERROR" | "REVISAR" | "ANULADO" | "EXPIRADO";
  monto:                  number;
  descripcion:            string | null;
  cliente_nombre:         string | null;
  cliente_identificacion: string | null;
  documento_id:           string | null;
  numero_doc:             string | null;
  error:                  string | null;
  created_at:             string;
  pagado_at:              string | null;
  link: { url: string; nombre_pasarela: string; estado: string; expira_at: string | null } | null;
}

const ESTADOS: Record<Cobro["estado"], { etiqueta: string; tono: TonoEstado }> = {
  PENDIENTE: { etiqueta: "Esperando pago",       tono: "alerta" },
  PAGADO:    { etiqueta: "Pagado · facturando",  tono: "info" },
  FACTURADO: { etiqueta: "Pagado y facturado",   tono: "exito" },
  ERROR:     { etiqueta: "Pagado · sin factura", tono: "peligro" },
  REVISAR:   { etiqueta: "Revisar",              tono: "peligro" },
  ANULADO:   { etiqueta: "Anulado",              tono: "neutro" },
  EXPIRADO:  { etiqueta: "Venció",               tono: "neutro" },
};

const FILTROS = [
  { valor: "",          etiqueta: "Todos" },
  { valor: "PENDIENTE", etiqueta: "Esperando pago" },
  { valor: "FACTURADO", etiqueta: "Facturados" },
  { valor: "ERROR",     etiqueta: "Sin factura" },
  { valor: "REVISAR",   etiqueta: "Revisar" },
];

const NUEVO_LINK = "/documentos/emitir/fac?cuando=al_pagar";
const LIMITE = 50;
const fmt = (n: number) => `$${n.toFixed(2)}`;
const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "";
const textoPago = (url: string) => `Hola, te comparto el link para tu pago: ${url}`;

// Lo que hay que saber de un cobro sin abrirlo (va debajo del cliente)
function nota(c: Cobro): string | undefined {
  if (c.estado === "REVISAR" && !c.error) return "Te pagaron un link que habías anulado. Si corresponde, emite la factura.";
  if (c.estado === "ERROR" || c.estado === "REVISAR") return c.error ?? undefined;
  if (c.estado === "EXPIRADO") return "Venció sin pago. Si todavía quieres cobrar, crea uno nuevo.";
  return undefined;
}

export default function CobrosPage() {
  const puedeVer = usePermiso("emitir");
  if (!puedeVer) return <SinAcceso />;
  return <CobrosContenido />;
}

function CobrosContenido() {
  const router    = useRouter();
  const confirmar = useConfirmar();
  const avisos    = useAvisos();
  const [cobros,     setCobros]     = useState<Cobro[]>([]);
  const [total,      setTotal]      = useState(0);
  const [filtro,     setFiltro]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [ocupado,    setOcupado]    = useState<string | null>(null);   // id del cobro con una acción en curso
  // Tocar un cobro abre su menú (compartir, ¿ya pagó?, emitir, anular…)
  const [menuDe,     setMenuDe]     = useState<Cobro | null>(null);

  const cargar = useCallback(async (append = false, offset = 0) => {
    if (append) setCargandoMas(true); else setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(LIMITE), offset: String(offset) });
      if (filtro) qs.set("estado", filtro);
      const res = await api.get(`/api/v1/app/cobros-en-linea/cobros?${qs}`);
      const nuevos: Cobro[] = res.data.data ?? [];
      setTotal(res.data.total ?? 0);
      setCobros(prev => append ? [...prev, ...nuevos] : nuevos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setCargandoMas(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const reemplazar = (c: Cobro) => setCobros(prev => prev.map(x => x.id === c.id ? c : x));

  const accion = async (c: Cobro, ruta: "verificar" | "anular" | "facturar") => {
    if (ruta === "anular" && !(await confirmar({
      titulo: "¿Anular este link de cobro?",
      mensaje: "Si tu cliente igual paga, te avisaremos para que decidas si emites la factura.",
      textoConfirmar: "Anular link", peligro: true,
    }))) return;
    setOcupado(c.id);
    try {
      const res = await api.post(`/api/v1/app/cobros-en-linea/cobros/${c.id}/${ruta}`);
      const nuevo: Cobro = res.data.data;
      reemplazar(nuevo);
      if (ruta === "verificar") {
        if (nuevo.estado === "FACTURADO") avisos.exito("¡Pagó! La factura ya se emitió.");
        else if (nuevo.estado === "PENDIENTE") avisos.info("Todavía no hay un pago aprobado.");
        else avisos.info(ESTADOS[nuevo.estado].etiqueta);
      } else if (ruta === "facturar" && nuevo.estado === "FACTURADO") {
        avisos.exito("Factura emitida.");
      } else if (ruta === "anular") {
        avisos.info("Link anulado.");
      }
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      avisos.error(typeof detalle === "string" ? detalle : "No se pudo completar la acción.");
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (url: string) => {
    try { await navigator.clipboard.writeText(url); avisos.exito("Link copiado"); }
    catch { avisos.info(url); }
  };

  // Hoja del sistema (app/celular): el cliente elige WhatsApp, correo, etc.
  const compartirLink = async (url: string) => {
    const ok = await compartir({ titulo: "Link de pago", texto: textoPago(url), url });
    if (!ok) await copiar(url);
  };

  const accionesDe = (c: Cobro): Accion[] => {
    const lista: Accion[] = [];
    const url = c.link?.url;
    if (c.estado === "PENDIENTE" && url) {
      lista.push(
        { etiqueta: "Compartir link", descripcion: "Por WhatsApp, correo o donde quieras", icono: Share2, onClick: () => void compartirLink(url) },
        { etiqueta: "Enviar por WhatsApp", icono: MessageCircle,
          onClick: () => void abrirExterno(`https://wa.me/?text=${encodeURIComponent(textoPago(url))}`) },
        { etiqueta: "Copiar link", icono: Copy, onClick: () => void copiar(url) },
      );
    }
    if (c.estado === "PENDIENTE" || c.estado === "PAGADO") {
      lista.push({ etiqueta: "¿Ya pagó?", descripcion: "Consultar el pago ahora", icono: RefreshCw, onClick: () => void accion(c, "verificar") });
    }
    if (c.estado === "ERROR" || c.estado === "REVISAR") {
      lista.push({ etiqueta: "Emitir factura", icono: FileText, onClick: () => void accion(c, "facturar") });
    }
    if (c.estado === "FACTURADO" && c.documento_id) {
      const id = c.documento_id;
      lista.push({ etiqueta: `Ver factura${c.numero_doc ? ` ${c.numero_doc}` : ""}`, icono: FileText, onClick: () => router.push(rutas.documento(id)) });
    }
    if (c.estado === "PENDIENTE" || c.estado === "EXPIRADO") {
      lista.push({ etiqueta: "Anular", descripcion: "El link deja de aceptar pagos", icono: Ban, peligro: true, onClick: () => void accion(c, "anular") });
    }
    return lista;
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="hidden text-xl font-bold text-texto lg:block">Links de cobro</h1>
          <p className="text-sm text-sutil">Cobra primero: la factura se emite sola cuando tu cliente paga.</p>
        </div>
        <Boton onClick={() => router.push(NUEVO_LINK)} icono={<Plus size={16} />} className="hidden shrink-0 lg:inline-flex">
          Nuevo link de cobro
        </Boton>
      </div>

      <ChipsFiltro opciones={FILTROS} valor={filtro} onCambio={setFiltro} etiqueta="Estado del cobro" className="mb-4" />

      {loading ? (
        <EsqueletoFilas filas={6} />
      ) : cobros.length === 0 ? (
        filtro ? (
          <Vacio icono={Link2} titulo="No hay links de cobro con este estado" />
        ) : (
          <Vacio
            icono={Link2}
            titulo="Aún no tienes links de cobro"
            descripcion="Arma la factura como siempre, elige “Pendiente de cobro” → “Cobrar con link de pago” → “Emitir la factura cuando pague”. Tu cliente paga y la factura sale sola."
            accion={<Boton onClick={() => router.push(NUEVO_LINK)} icono={<Plus size={16} />}>Crear link de cobro</Boton>}
          />
        )
      ) : (
        <>
          <TirarParaRefrescar alRefrescar={() => cargar()}>
            <GrupoFilas>
              {cobros.map(c => {
                const est = ESTADOS[c.estado];
                const trabajando = ocupado === c.id;
                const aviso = nota(c);
                return (
                  <FilaLista
                    key={c.id}
                    onClick={accionesDe(c).length > 0 ? () => setMenuDe(c) : undefined}
                    apagada={c.estado === "ANULADO"}
                    titulo={c.cliente_nombre || "Cliente"}
                    subtitulo={[c.descripcion, fecha(c.created_at)].filter(Boolean).join(" · ")}
                    detalle={aviso && (
                      <span className={c.estado === "EXPIRADO" ? undefined : "text-peligro-texto"}>{aviso}</span>
                    )}
                    fin={fmt(c.monto)}
                    finAbajo={trabajando
                      ? <InsigniaEstado tono="info" icono={Loader2} className="[&_svg]:animate-spin">Consultando…</InsigniaEstado>
                      : <InsigniaEstado tono={est.tono}>{est.etiqueta}</InsigniaEstado>}
                  />
                );
              })}
            </GrupoFilas>
          </TirarParaRefrescar>

          {cobros.length < total && (
            <div className="mt-4 flex justify-center">
              <Boton variante="secundario" onClick={() => cargar(true, cobros.length)} cargando={cargandoMas} className="w-full sm:w-auto">
                Cargar más ({cobros.length} de {total})
              </Boton>
            </div>
          )}
        </>
      )}

      {/* Celular: nuevo link de cobro */}
      <BotonFlotante href={NUEVO_LINK} etiqueta="Nuevo link de cobro" />

      <HojaAcciones
        abierta={!!menuDe}
        onCerrar={() => setMenuDe(null)}
        titulo={menuDe ? `${menuDe.cliente_nombre || "Cliente"} · ${fmt(menuDe.monto)}` : ""}
        descripcion={menuDe ? (
          <>
            {[ESTADOS[menuDe.estado].etiqueta, menuDe.cliente_identificacion, menuDe.link?.nombre_pasarela].filter(Boolean).join(" · ")}
            {/* En la fila el aviso se corta: aquí completo */}
            {nota(menuDe) && (
              <span className={`mt-1 block ${menuDe.estado === "EXPIRADO" ? "" : "text-peligro-texto"}`}>{nota(menuDe)}</span>
            )}
          </>
        ) : undefined}
        acciones={menuDe ? accionesDe(menuDe) : []}
      />
    </div>
  );
}
