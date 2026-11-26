"use client";
import { rutas } from "@/lib/rutas";
import { useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { useLista } from "@/lib/useLista";
import { abrirExterno } from "@/lib/nativo";
import { useAvisos } from "@/components/ui/Avisos";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import Hoja from "@/components/ui/Hoja";
import HojaAcciones, { type Accion } from "@/components/ui/HojaAcciones";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import Vacio from "@/components/ui/Vacio";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Esqueleto, EsqueletoFilas } from "@/components/ui/Esqueleto";
import { InsigniaEstado, InsigniaSri } from "@/components/ui/InsigniaEstado";
import { Campo, Entrada } from "@/components/ui/Campo";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import { cn } from "@/components/ui/cn";
import type { TonoEstado } from "@/lib/estados";
import {
  ArrowLeft, User, Mail, Phone, MapPin, FileText, Plus, Pencil, Copy, Save,
  MoreVertical, MessageCircle, Wallet, Key, ChevronDown,
} from "lucide-react";
import { detalleError } from "@/lib/errores";

const FACTURAS_LIMIT = 10; // ← Cambia a 20 cuando estés listo

const TIPO_ID: Record<string, string> = {
  "04": "RUC",
  "05": "Cédula",
  "06": "Pasaporte",
  "07": "Consumidor Final",
  "08": "Exterior",
};

const ESTADOS_CUENTA: Record<string, { etiqueta: string; tono: TonoEstado }> = {
  PENDIENTE: { etiqueta: "Pendiente", tono: "alerta" },
  PARCIAL:   { etiqueta: "Parcial",   tono: "info" },
  PAGADO:    { etiqueta: "Pagado",    tono: "exito" },
  ANULADO:   { etiqueta: "Anulado",   tono: "neutro" },
};

const fmt   = (n: any) => parseFloat(n ?? 0).toFixed(2);
const fecha = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? etiquetaPeriodo(f, f) : f || "");

// ── Validaciones ──────────────────────────────────────────────────────────────
function validarEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 0991234567 → 593991234567 (WhatsApp pide el número con código de país). */
function numeroWhatsApp(telefono: string): string {
  const d = telefono.replace(/\D/g, "");
  return d.length === 10 && d.startsWith("0") ? `593${d.slice(1)}` : d;
}

/** Fila etiqueta → valor (Datos). */
function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof User; etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-tenue"><Icono size={14} aria-hidden /> {etiqueta}</span>
      <span className="min-w-0 break-words text-right text-texto">{valor || "—"}</span>
    </div>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────
// /personas/ver?id=… (antes /personas/[id]; ver lib/rutas.ts)
export default function DetallePersonaPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetallePersona key={id} id={id} />;
}

function DetallePersona({ id }: { id: string }) {
  const router  = useRouter();
  const avisos  = useAvisos();
  const empresaActiva = useAuthStore((s) => s.empresa);
  const sinCuentas = rutaFueraDelPlan("/cuentas", empresaActiva);

  // Con caché: al volver de una factura la persona aparece al instante (lib/useLista.ts)
  const res      = useLista<any>(`/api/v1/app/clientes/detalle/${id}?facturas_limit=${FACTURAS_LIMIT}`);
  const resCtas  = useLista<{ data?: any[]; resumen?: { por_cobrar: number; por_pagar: number } }>(
    sinCuentas ? null : `/api/v1/app/cuentas/cliente/${id}`);
  const data     = res.datos;
  const cuentas  = resCtas.datos?.data ?? [];
  const resumenCuentas = resCtas.datos?.resumen ?? { por_cobrar: 0, por_pagar: 0 };

  // "Cargar más" facturas: las páginas siguientes se suman a las de la caché
  const [masFacturas, setMasFacturas] = useState<any[]>([]);
  const [cursor,      setCursor]      = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const [menu,    setMenu]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form,    setForm]    = useState({ razon_social: "", email: "", telefono: "", direccion: "" });

  const emailOk      = validarEmail(form.email);
  const nombreOk     = form.razon_social.trim().length > 0;
  const puedeGuardar = emailOk && nombreOk && !saving;

  const refrescar = async () => {
    setMasFacturas([]);
    setCursor(undefined);
    await Promise.all([res.recargar(), sinCuentas ? null : resCtas.recargar()]);
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (res.cargando) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6" aria-busy="true">
        <Esqueleto className="h-44 rounded-2xl" />
        <EsqueletoFilas filas={4} />
      </div>
    );
  }
  if (!data?.cliente) {
    const estado = (res.error as { response?: { status?: number } } | undefined)?.response?.status;
    const deRed  = !!res.error && estado !== 404 && estado !== 403;
    return (
      <Vacio
        icono={User}
        titulo={deRed ? "No pudimos cargar a la persona" : "Persona no encontrada"}
        descripcion={deRed ? "Revisa tu conexión e intenta de nuevo." : "Puede que sea de otra empresa o que ya no exista."}
        accion={deRed
          ? <Boton onClick={() => void res.recargar()}>Reintentar</Boton>
          : <Boton variante="secundario" onClick={() => router.push("/personas")}>Ir a Personas</Boton>}
        className="py-20"
      />
    );
  }

  const { cliente, resumen } = data;
  const facturas   = [...(data.facturas ?? []), ...masFacturas];
  const siguiente  = cursor === undefined ? (data.next_cursor ?? null) : cursor;
  const uid        = cliente.uid || id;

  const cargarMas = async () => {
    if (!siguiente || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.get(
        `/api/v1/app/clientes/detalle/${id}/facturas?limit=${FACTURAS_LIMIT}&cursor=${encodeURIComponent(siguiente)}`
      );
      setMasFacturas(prev => [...prev, ...(r.data.facturas ?? [])]);
      setCursor(r.data.next_cursor ?? null);
    } catch {
      avisos.error("No se pudieron cargar más facturas.");
    } finally {
      setLoadingMore(false);
    }
  };

  const abrirEdicion = () => {
    setForm({
      razon_social: cliente.razon_social ?? "",
      email:        cliente.email        ?? "",
      telefono:     cliente.telefono     ?? "",
      direccion:    cliente.direccion    ?? "",
    });
    setError("");
    setEditing(true);
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
      await res.recargar();
      setEditing(false);
      avisos.exito("Datos guardados");
    } catch (err: any) {
      setError(detalleError(err, "Error al guardar."));
    } finally {
      setSaving(false);
    }
  };

  const copiarUid = async () => {
    try { await navigator.clipboard.writeText(uid); avisos.exito("UID copiado"); }
    catch { avisos.info(uid); }
  };

  const nuevaFactura = () => {
    sessionStorage.setItem("kipu:prefill", JSON.stringify({
      cliente: {
        id:             cliente.id,
        razon_social:   cliente.razon_social,
        identificacion: cliente.identificacion,
        tipo_id:        cliente.tipo_identificacion_sri,
      },
      esConsumidorFinal:  false,
      items:              [],
      formaPago:          "01",
      camposAdicionales:  cliente.email ? [{ nombre: "Email", valor: cliente.email }] : [],
    }));
    router.push("/documentos/emitir/fac");
  };

  const acciones: Accion[] = [
    { etiqueta: "Editar datos", descripcion: "Nombre, correo, teléfono y dirección", icono: Pencil, onClick: abrirEdicion },
    ...(!sinCuentas ? [{ etiqueta: "Nueva cuenta", descripcion: "Algo que te debe o que le debes", icono: Wallet,
                         onClick: () => router.push(`/cuentas?cliente=${id}`) }] : []),
    { etiqueta: "Copiar UID", descripcion: "Identificador interno de la persona", icono: Copy, onClick: () => void copiarUid() },
  ];

  // Contacto directo: lo que haría la agenda del teléfono
  const contacto = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-borde bg-superficie px-2 py-2 text-xs font-medium text-texto transition-colors hover:bg-presionado active:bg-presionado";

  return (
    <TirarParaRefrescar alRefrescar={refrescar}>
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">

        {/* Arriba: quién es y qué se hace con esta persona */}
        <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* En el celular la flecha atrás ya está en la barra superior */}
            <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                        className="-ml-2 hidden lg:inline-flex" />
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-acento-suave text-lg font-bold text-acento">
              {cliente.razon_social?.[0] ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-lg font-bold text-texto">{cliente.razon_social}</h1>
              <p className="text-sm text-sutil">
                {TIPO_ID[cliente.tipo_identificacion_sri] ?? "ID"}: <span className="font-mono">{cliente.identificacion}</span>
              </p>
            </div>
            <BotonIcono etiqueta="Más acciones" icono={<MoreVertical size={20} />} onClick={() => setMenu(true)} className="-mr-2" />
          </div>

          <div className="mt-4 flex gap-2">
            <Boton onClick={nuevaFactura} icono={<Plus size={16} />} className="flex-1 sm:flex-none">Nueva factura</Boton>
          </div>

          {(cliente.telefono || cliente.email) && (
            <div className="mt-3 flex gap-2">
              {cliente.telefono && (
                <>
                  <a href={`tel:${cliente.telefono}`} className={contacto}>
                    <Phone size={18} className="text-acento" aria-hidden /> Llamar
                  </a>
                  <button type="button" className={contacto}
                          onClick={() => void abrirExterno(`https://wa.me/${numeroWhatsApp(cliente.telefono)}`)}>
                    <MessageCircle size={18} className="text-acento" aria-hidden /> WhatsApp
                  </button>
                </>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} className={contacto}>
                  <Mail size={18} className="text-acento" aria-hidden /> Correo
                </a>
              )}
            </div>
          )}
        </section>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-xl border border-borde bg-superficie p-3 sm:p-4">
            <p className="text-xs text-sutil">Total facturado</p>
            <p className="truncate text-xl font-bold tabular-nums text-texto sm:text-2xl">${fmt(resumen.suma_facturada)}</p>
            <p className="text-xs text-sutil">solo autorizadas</p>
          </div>
          <div className="rounded-xl border border-borde bg-superficie p-3 sm:p-4">
            <p className="text-xs text-sutil">Facturas emitidas</p>
            <p className="text-xl font-bold tabular-nums text-texto sm:text-2xl">{resumen.total_documentos}</p>
            <p className="text-xs text-sutil">total histórico</p>
          </div>
        </div>

        {/* Datos */}
        <section className="rounded-xl border border-borde bg-superficie p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-texto">Datos</h2>
            <Boton variante="fantasma" tamano="sm" onClick={abrirEdicion} icono={<Pencil size={14} />}>Editar</Boton>
          </div>
          <Dato icono={User}     etiqueta="Tipo"           valor={TIPO_ID[cliente.tipo_identificacion_sri] ?? cliente.tipo_identificacion_sri} />
          <Dato icono={FileText} etiqueta="Identificación" valor={<span className="font-mono">{cliente.identificacion}</span>} />
          <Dato icono={Mail}     etiqueta="Email"          valor={cliente.email} />
          <Dato icono={Phone}    etiqueta="Teléfono"       valor={cliente.telefono} />
          <Dato icono={MapPin}   etiqueta="Dirección"      valor={cliente.direccion} />
          <Dato icono={Key}      etiqueta="UID"            valor={<code className="font-mono text-xs">{uid}</code>} />
        </section>

        {/* Historial de facturas */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-texto">Últimas facturas</h2>
            {resumen.total_documentos > 0 && (
              <span className="text-xs text-sutil">{facturas.length} de {resumen.total_documentos}</span>
            )}
          </div>
          {facturas.length === 0 ? (
            <p className="rounded-xl border border-borde bg-superficie px-4 py-8 text-center text-sm text-sutil">
              Sin facturas emitidas a esta persona.
            </p>
          ) : (
            <GrupoFilas>
              {facturas.map((f: any) => (
                <FilaLista
                  key={f.id}
                  href={rutas.documento(f.id)}
                  titulo={<span className="font-mono">{f.numero_doc}</span>}
                  subtitulo={fecha(f.fecha_emision)}
                  fin={`$${fmt(f.importe_total)}`}
                  finAbajo={<InsigniaSri estado={f.estado_sri} conIcono={false} />}
                />
              ))}
              {siguiente && (
                <button
                  type="button"
                  onClick={cargarMas}
                  disabled={loadingMore}
                  className="flex min-h-12 w-full items-center justify-center gap-1.5 text-sm font-medium text-acento transition-colors hover:bg-presionado disabled:opacity-50"
                >
                  <ChevronDown size={16} className={cn(loadingMore && "animate-bounce")} aria-hidden />
                  {loadingMore ? "Cargando…" : "Cargar más facturas"}
                </button>
              )}
            </GrupoFilas>
          )}
        </section>

        {/* Cuentas (en la app, solo si el plan las incluye: lib/plataforma.ts) */}
        {!sinCuentas && (
          <section>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold text-texto">Cuentas</h2>
              <div className="flex items-center gap-3 text-xs tabular-nums">
                {resumenCuentas.por_cobrar > 0 && <span className="text-exito-texto">${fmt(resumenCuentas.por_cobrar)} por cobrar</span>}
                {resumenCuentas.por_pagar > 0 && <span className="text-peligro-texto">${fmt(resumenCuentas.por_pagar)} por pagar</span>}
                <Boton variante="fantasma" tamano="sm" icono={<Plus size={14} />}
                       onClick={() => router.push(`/cuentas?cliente=${id}`)}>
                  Nueva
                </Boton>
              </div>
            </div>
            {resCtas.cargando ? (
              <EsqueletoFilas filas={2} />
            ) : cuentas.length === 0 ? (
              <p className="flex flex-col items-center gap-2 rounded-xl border border-borde bg-superficie px-4 py-8 text-center text-sm text-sutil">
                <Wallet size={24} aria-hidden /> Sin cuentas registradas.
              </p>
            ) : (
              <GrupoFilas>
                {cuentas.map((c: any) => {
                  const est = ESTADOS_CUENTA[c.estado] ?? ESTADOS_CUENTA.PENDIENTE;
                  return (
                    <FilaLista
                      key={c.id}
                      href={rutas.cuenta(c.id)}
                      inicio={
                        <span className={cn("inline-flex size-9 items-center justify-center rounded-full text-xs font-bold",
                          c.tipo === "COBRAR" ? "bg-exito-suave text-exito-texto" : "bg-peligro-suave text-peligro-texto")}>
                          {c.tipo === "COBRAR" ? "C" : "P"}
                        </span>
                      }
                      titulo={c.concepto}
                      subtitulo={[fecha(c.fecha_emision), c.fecha_vencimiento && `vence ${fecha(c.fecha_vencimiento).toLowerCase()}`].filter(Boolean).join(" · ")}
                      fin={`$${fmt(c.saldo_pendiente)}`}
                      finAbajo={<InsigniaEstado tono={est.tono}>{est.etiqueta}</InsigniaEstado>}
                    />
                  );
                })}
              </GrupoFilas>
            )}
          </section>
        )}

        <HojaAcciones
          abierta={menu}
          onCerrar={() => setMenu(false)}
          titulo={cliente.razon_social}
          acciones={acciones}
        />

        {/* Editar datos */}
        <Hoja
          abierta={editing}
          onCerrar={() => setEditing(false)}
          titulo="Editar persona"
          descripcion={`${TIPO_ID[cliente.tipo_identificacion_sri] ?? "ID"} ${cliente.identificacion}: la identificación no se cambia`}
          cerrable={!saving}
          pie={<>
            <Boton variante="secundario" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Boton>
            <Boton onClick={guardar} cargando={saving} disabled={!puedeGuardar} icono={<Save size={16} />}>Guardar</Boton>
          </>}
        >
          <div className="space-y-3">
            <Campo etiqueta="Nombre o razón social" error={!nombreOk ? "El nombre es obligatorio." : null}>
              <Entrada teclado="nombre" value={form.razon_social} placeholder="APELLIDOS NOMBRES"
                       onChange={e => setForm(f => ({ ...f, razon_social: e.target.value.toUpperCase() }))} />
            </Campo>
            <Campo etiqueta="Correo" opcional error={!emailOk ? "Correo inválido." : null}>
              <Entrada teclado="email" value={form.email} placeholder="persona@email.com"
                       onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))} />
            </Campo>
            <Campo etiqueta="Teléfono" opcional>
              <Entrada teclado="telefono" value={form.telefono} placeholder="0999999999"
                       onChange={e => setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, "") }))} />
            </Campo>
            <Campo etiqueta="Dirección" opcional>
              <Entrada value={form.direccion} placeholder="AV. PRINCIPAL 123"
                       onChange={e => setForm(f => ({ ...f, direccion: e.target.value.toUpperCase() }))} />
            </Campo>
            {error && <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>}
          </div>
        </Hoja>
      </div>
    </TirarParaRefrescar>
  );
}
