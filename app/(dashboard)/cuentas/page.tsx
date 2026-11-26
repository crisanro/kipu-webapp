"use client";
import { detalleError } from "@/lib/errores";
import { rutas } from "@/lib/rutas";
import { useState, useEffect, useRef, Suspense } from "react";
import { useAtajos } from "@/lib/useAtajos";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import { hoyEC } from "@/lib/fecha";
import { demoCuentas, resumenCuentas } from "@/lib/demos";
import { BannerEjemplo, EtiquetaEjemplo } from "@/components/EjemploPro";
import SoloWeb from "@/components/SoloWeb";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import { useLista } from "@/lib/useLista";
import type { TonoEstado } from "@/lib/estados";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio, { VacioError } from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { AreaTexto, Campo, Entrada } from "@/components/ui/Campo";
import BotonIcono from "@/components/ui/BotonIcono";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import { cn } from "@/components/ui/cn";
import {
  Wallet, Plus, X, Save,
  TrendingUp, TrendingDown, Scale, Search,
  AlertTriangle, Loader2,
} from "lucide-react";
import { dolares } from "@/lib/dinero";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cuenta {
  id:                string;
  tipo:              "COBRAR" | "PAGAR";
  concepto:          string;
  monto_total:       number;
  monto_pagado:      number;
  saldo_pendiente:   number;
  fecha_emision:     string;
  fecha_vencimiento: string | null;
  estado:            "PENDIENTE" | "PARCIAL" | "PAGADO" | "ANULADO";
  notas:             string | null;
  cliente_id:        string;
  razon_social:      string;
  identificacion:    string;
}

interface Resumen {
  por_cobrar: number;
  por_pagar:  number;
  balance:    number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ESTADOS: Record<Cuenta["estado"], { etiqueta: string; tono: TonoEstado }> = {
  PENDIENTE: { etiqueta: "Pendiente", tono: "alerta" },
  PARCIAL:   { etiqueta: "Parcial",   tono: "info" },
  PAGADO:    { etiqueta: "Pagado",    tono: "exito" },
  ANULADO:   { etiqueta: "Anulado",   tono: "neutro" },
};

const FILTROS_ESTADO = [
  { valor: "",          etiqueta: "Todos" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "PARCIAL",   etiqueta: "Parciales" },
  { valor: "PAGADO",    etiqueta: "Pagadas" },
  { valor: "ANULADO",   etiqueta: "Anuladas" },
];

// Función y no constante: con la app abierta desde ayer, la fecha debe ser la de hoy
const formVacio = () => ({
  cliente_id:        "",
  tipo:              "COBRAR",
  concepto:          "",
  monto_total:       "",
  fecha_emision:     hoyEC(),
  fecha_vencimiento: "",
  notas:             "",
});

// ── Componente Interno ─────────────────────────────────────────────────────────
function CuentasContent() {
  const searchParams = useSearchParams();

  const [query,      setQuery]      = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "COBRAR" | "PAGAR">("");
  const [filtroEst,  setFiltroEst]  = useState("");

  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  // Modal nueva cuenta
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState<any>(formVacio);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  // Búsqueda de cliente en el modal
  const [clienteQuery,    setClienteQuery]    = useState("");
  const [clientesBusq,    setClientesBusq]    = useState<any[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSelec,    setClienteSelec]    = useState<any>(null);

  // Con caché: al volver de una cuenta la lista aparece al instante (lib/useLista.ts)
  const qs = new URLSearchParams();
  if (filtroTipo) qs.set("tipo", filtroTipo);
  if (filtroEst)  qs.set("estado", filtroEst);
  const datos   = useLista<{ data?: Cuenta[]; resumen?: Resumen }>(`/api/v1/app/cuentas${qs.size ? `?${qs}` : ""}`);
  const cuentas = datos.datos?.data ?? [];
  const resumen = datos.datos?.resumen ?? { por_cobrar: 0, por_pagar: 0, balance: 0 };
  const loading = datos.cargando;
  const cargar  = datos.recargar;

  // Manejo de query param para preseleccionar cliente
  useEffect(() => {
    const clienteId = searchParams.get("cliente");
    if (!clienteId) return;
    const preseleccionar = async () => {
      try {
        const res = await api.get(`/api/v1/app/clientes/detalle/${clienteId}`);
        const c = res.data.cliente;
        if (c) {
          setClienteSelec({ id: c.id, razon_social: c.razon_social, identificacion: c.identificacion });
          setShowModal(true);
          setError("");
        }
      } catch (e) {
        console.error(e);
      }
    };
    preseleccionar();
  }, [searchParams]);

  // Buscar clientes para el selector del modal
  useEffect(() => {
    if (clienteQuery.length < 2) { setClientesBusq([]); return; }
    const timer = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const res = await api.get("/api/v1/app/clientes", { params: { q: clienteQuery } });
        setClientesBusq(res.data.data ?? []);
      } catch { setClientesBusq([]); }
      finally { setBuscandoCliente(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [clienteQuery]);

  // Sin Plan Pro y sin cuentas propias: ejemplos para ver cómo funciona
  const esDemo = !loading && !datos.fallo && !tieneSub && cuentas.length === 0 && !filtroTipo && !filtroEst;
  const lista  = esDemo ? demoCuentas() : cuentas;
  const totales = esDemo ? resumenCuentas(lista) : resumen;

  const filtradas = lista.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.razon_social?.toLowerCase().includes(q) ||
      c.concepto?.toLowerCase().includes(q) ||
      c.identificacion?.includes(q)
    );
  });

  const handleGuardar = async () => {
    setError("");
    if (!clienteSelec)      return setError("Selecciona una persona.");
    if (!form.concepto)     return setError("El concepto es obligatorio.");
    if (!form.monto_total || parseFloat(form.monto_total) <= 0)
        return setError("El monto debe ser mayor a cero.");

    setSaving(true);
    try {
        await api.post("/api/v1/app/cuentas", {
        cliente_id: clienteSelec.id ?? clienteSelec.uid,
        tipo:              form.tipo,
        concepto:          form.concepto,
        monto_total:       parseFloat(form.monto_total),
        fecha_emision:     form.fecha_emision      || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas:             form.notas             || null,
        });
        await cargar();
        setShowModal(false);
        resetModal();
    } catch (err: any) {
        setError(detalleError(err, "Error al guardar."));
    } finally {
        setSaving(false);
    }
  };

  const resetModal = () => {
    setForm(formVacio());
    setClienteQuery("");
    setClientesBusq([]);
    setClienteSelec(null);
    setError("");
  };

  const nueva = () => { if (!tieneSub) return; resetModal(); setShowModal(true); };

  // Compu: "/" busca y "n" registra una cuenta (lib/useAtajos.ts)
  const buscadorRef = useRef<HTMLInputElement>(null);
  useAtajos({
    "/": () => buscadorRef.current?.focus(),
    "n": nueva,
  }, true, { n: "Nueva cuenta" });
  const hoy   = hoyEC();
  // Las tarjetas del resumen filtran por tipo; tocar la elegida quita el filtro
  const alternarTipo = (t: "COBRAR" | "PAGAR") => setFiltroTipo(filtroTipo === t ? "" : t);
  const tarjeta = "rounded-xl border bg-superficie p-3 text-left transition-colors sm:p-4";

  return (
    <div className="p-4 md:p-6">
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="mb-6 hidden items-center justify-between lg:flex">
        <div>
          <h1 className="text-xl font-bold text-texto">Cuentas</h1>
          <p className="text-sm text-sutil">{cuentas.length} registradas</p>
        </div>
        <Boton
          onClick={nueva}
          disabled={!tieneSub}
          title={!tieneSub ? (ES_APP_NATIVA ? "No incluido en tu plan actual" : "Disponible en el Plan Pro") : undefined}
          icono={<Plus size={16} />}
        >
          Nueva cuenta
        </Boton>
      </div>

      {esDemo && (
        <BannerEjemplo
          texto="Así llevas con el Plan Pro lo que te deben y lo que debes: registras abonos, ves qué está vencido y cuánto te queda por cobrar."
          textoApp="Así se llevan lo que te deben y lo que debes: registras abonos, ves qué está vencido y cuánto te queda por cobrar."
        />
      )}

      {!tieneSub && !esDemo && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-alerta/20 bg-alerta-suave px-4 py-3">
          <AlertTriangle size={15} className="shrink-0 text-alerta" />
          <div className="flex-1">
            <p className="text-sm font-medium text-alerta-texto">
              {ES_APP_NATIVA ? "No incluido en tu plan actual" : "Función del Plan Pro"}
            </p>
            <p className="text-xs text-tenue">
              {ES_APP_NATIVA
                ? "Las cuentas por cobrar y pagar no están incluidas en tu plan actual. Las que ya registraste las sigues viendo."
                : "Las cuentas por cobrar y pagar son del Plan Pro. Las que ya registraste las sigues viendo."}
            </p>
          </div>
          <SoloWeb>
            <Link href="/planes" className="shrink-0 text-xs text-alerta-texto underline underline-offset-2">
              Ver planes
            </Link>
          </SoloWeb>
        </div>
      )}

      {/* Resumen: tocar Por cobrar / Por pagar filtra la lista */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => alternarTipo("COBRAR")}
          aria-pressed={filtroTipo === "COBRAR"}
          className={cn(tarjeta, filtroTipo === "COBRAR" ? "border-exito ring-1 ring-exito" : "border-borde hover:border-exito/50")}
        >
          <span className="mb-1 flex items-center gap-1.5 text-xs text-sutil">
            <TrendingUp size={14} className="text-exito" aria-hidden /> Por cobrar
          </span>
          <span className="block truncate text-base font-bold tabular-nums text-exito-texto sm:text-xl">{dolares(totales.por_cobrar)}</span>
        </button>
        <button
          type="button"
          onClick={() => alternarTipo("PAGAR")}
          aria-pressed={filtroTipo === "PAGAR"}
          className={cn(tarjeta, filtroTipo === "PAGAR" ? "border-peligro ring-1 ring-peligro" : "border-borde hover:border-peligro/50")}
        >
          <span className="mb-1 flex items-center gap-1.5 text-xs text-sutil">
            <TrendingDown size={14} className="text-peligro" aria-hidden /> Por pagar
          </span>
          <span className="block truncate text-base font-bold tabular-nums text-peligro-texto sm:text-xl">{dolares(totales.por_pagar)}</span>
        </button>
        <div className={cn(tarjeta, "border-borde")}>
          <span className="mb-1 flex items-center gap-1.5 text-xs text-sutil">
            <Scale size={14} className={totales.balance >= 0 ? "text-acento" : "text-alerta"} aria-hidden /> Balance
          </span>
          <span className={cn("block truncate text-base font-bold tabular-nums sm:text-xl",
                              totales.balance >= 0 ? "text-acento" : "text-alerta-texto")}>
            {dolares(totales.balance)}
          </span>
        </div>
      </div>

      <Entrada
        teclado="buscar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por persona o concepto…"
        aria-label="Buscar cuentas"
        prefijo={<Search size={16} />}
        ref={buscadorRef}
        className="mb-3"
      />
      <ChipsFiltro opciones={FILTROS_ESTADO} valor={filtroEst} onCambio={setFiltroEst} etiqueta="Estado de la cuenta" className="mb-4" />

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={6} />
      ) : datos.fallo ? (
        <VacioError que="tus cuentas" onReintentar={datos.recargar} />
      ) : filtradas.length === 0 ? (
        query || filtroTipo || filtroEst ? (
          <Vacio icono={Search} titulo="Ninguna cuenta coincide" descripcion="Prueba con otra búsqueda o quita los filtros." />
        ) : (
          <Vacio
            icono={Wallet}
            titulo="Aún no tienes cuentas registradas"
            descripcion="Lleva lo que te deben y lo que debes, con sus abonos y vencimientos."
            accion={tieneSub
              ? <Boton onClick={nueva} icono={<Plus size={16} />}>Registrar cuenta</Boton>
              : <SoloWeb><Link href="/planes" className="text-sm font-medium text-acento underline underline-offset-2">Ver planes</Link></SoloWeb>}
          />
        )
      ) : (
        <TirarParaRefrescar alRefrescar={cargar}>
          <GrupoFilas>
            {filtradas.map((c) => {
              const est     = ESTADOS[c.estado] ?? ESTADOS.PENDIENTE;
              const abierta = c.estado !== "PAGADO" && c.estado !== "ANULADO";
              const vencida = abierta && !!c.fecha_vencimiento && c.fecha_vencimiento < hoy;
              const vence   = c.fecha_vencimiento ? etiquetaPeriodo(c.fecha_vencimiento, c.fecha_vencimiento, hoy).toLowerCase() : "";
              return (
                <FilaLista
                  key={c.id}
                  href={esDemo ? (ES_APP_NATIVA ? "/cuentas" : "/planes") : rutas.cuenta(c.id)}
                  apagada={c.estado === "ANULADO"}
                  inicio={
                    <span
                      className={cn("inline-flex size-10 items-center justify-center rounded-full text-xs font-bold",
                        c.tipo === "COBRAR" ? "bg-exito-suave text-exito-texto" : "bg-peligro-suave text-peligro-texto")}
                      title={c.tipo === "COBRAR" ? "Por cobrar" : "Por pagar"}
                    >
                      {c.tipo === "COBRAR" ? "C" : "P"}
                    </span>
                  }
                  titulo={<span className="flex items-center gap-2">{c.concepto}{esDemo && <EtiquetaEjemplo />}</span>}
                  subtitulo={c.razon_social}
                  detalle={
                    <>
                      {`de ${dolares(c.monto_total)}`}
                      {vence && <span className={vencida ? "text-peligro-texto" : undefined}>{` · ${vencida ? "venció" : "vence"} ${vence}`}</span>}
                    </>
                  }
                  fin={dolares(c.saldo_pendiente)}
                  finAbajo={vencida
                    ? <InsigniaEstado tono="peligro" icono={AlertTriangle}>Vencida</InsigniaEstado>
                    : <InsigniaEstado tono={est.tono}>{est.etiqueta}</InsigniaEstado>}
                />
              );
            })}
          </GrupoFilas>
        </TirarParaRefrescar>
      )}

      {/* Celular: nueva cuenta (solo si el plan lo permite) */}
      {tieneSub && <BotonFlotante onClick={nueva} etiqueta="Nueva cuenta" />}

      {/* Nueva cuenta: Hoja (en el celular sube desde abajo, con los botones fijos abajo) */}
      <Hoja
        abierta={showModal}
        onCerrar={() => { setShowModal(false); resetModal(); }}
        titulo="Nueva cuenta"
        cerrable={!saving}
        pie={<>
          <Boton variante="secundario" onClick={() => { setShowModal(false); resetModal(); }} disabled={saving}>
            Cancelar
          </Boton>
          <Boton onClick={handleGuardar} cargando={saving} icono={<Save size={16} />}>Guardar</Boton>
        </>}
      >
            <div className="space-y-3">
              {/* Tipo: lo que me deben (verde) o lo que debo (rojo) */}
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de cuenta">
                {(["COBRAR", "PAGAR"] as const).map((t) => {
                  const elegido = form.tipo === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-medium transition-colors",
                        !elegido && "border-borde bg-superficie text-sutil hover:text-texto",
                        elegido && t === "COBRAR" && "border-exito/50 bg-exito-suave text-exito-texto",
                        elegido && t === "PAGAR" && "border-peligro/50 bg-peligro-suave text-peligro-texto",
                      )}
                    >
                      {t === "COBRAR" ? "Por cobrar" : "Por pagar"}
                    </button>
                  );
                })}
              </div>

              <Campo etiqueta="Persona *">
                {clienteSelec ? (
                  <div className="flex items-center gap-2 rounded-lg border border-borde bg-presionado px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-texto">{clienteSelec.razon_social}</p>
                      <p className="text-xs text-sutil">{clienteSelec.identificacion}</p>
                    </div>
                    <BotonIcono etiqueta="Quitar la persona" icono={<X size={14} />} tamano="sm"
                                onClick={() => { setClienteSelec(null); setClienteQuery(""); }} />
                  </div>
                ) : (
                  <div className="relative">
                    <Entrada
                      teclado="buscar"
                      value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      placeholder="Buscar por nombre o identificación..."
                      prefijo={<Search size={14} />}
                      sufijo={buscandoCliente ? <Loader2 size={14} className="animate-spin text-acento" aria-hidden /> : undefined}
                    />
                    {clientesBusq.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-borde bg-superficie shadow-xl">
                        {clientesBusq.map((cl) => (
                          <button
                            type="button"
                            key={cl.uid ?? cl.id}
                            onClick={() => { setClienteSelec(cl); setClienteQuery(""); setClientesBusq([]); }}
                            className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-presionado"
                          >
                            <div>
                              <p className="text-sm text-texto">{cl.razon_social}</p>
                              <p className="text-xs text-sutil">{cl.identificacion}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Campo>

              <Campo etiqueta="Concepto *">
                <Entrada
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Descripción de la deuda..."
                />
              </Campo>

              <Campo etiqueta="Monto total *">
                <Entrada
                  teclado="decimal"
                  value={form.monto_total}
                  onChange={(e) => setForm({ ...form, monto_total: e.target.value.replace(",", ".") })}
                  placeholder="0.00"
                  prefijo="$"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Fecha">
                  <Entrada type="date" value={form.fecha_emision}
                           onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} />
                </Campo>
                <Campo etiqueta="Vencimiento">
                  <Entrada type="date" value={form.fecha_vencimiento}
                           onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                </Campo>
              </div>

              <Campo etiqueta="Notas" opcional>
                <AreaTexto
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </Campo>

              {error && (
                <p role="alert" className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>
              )}
            </div>
      </Hoja>
    </div>
  );
}

// ── Página Principal Envuelta en Suspense ──────────────────────────────────────
export default function CuentasPage() {
  const puedeVer = usePermiso("clientes");   // como la API de cuentas
  if (!puedeVer) return <SinAcceso />;
  return (
    <Suspense fallback={<div className="p-4 md:p-6"><EsqueletoFilas filas={6} /></div>}>
      <CuentasContent />
    </Suspense>
  );
}