"use client";
import { rutas } from "@/lib/rutas";
import { useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { hoyEC } from "@/lib/fecha";
import { useLista } from "@/lib/useLista";
import SoloWeb from "@/components/SoloWeb";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import type { TonoEstado } from "@/lib/estados";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import HojaAcciones from "@/components/ui/HojaAcciones";
import FilaLista from "@/components/ui/FilaLista";
import Vacio from "@/components/ui/Vacio";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import { Esqueleto, EsqueletoFilas } from "@/components/ui/Esqueleto";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import { useConfirmar } from "@/components/ui/Confirmar";
import { useAvisos } from "@/components/ui/Avisos";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import { cn } from "@/components/ui/cn";
import {
  ArrowLeft, Save, Ban, AlertTriangle, Wallet, Calendar, FileText,
  ArrowUpCircle, ArrowDownCircle, MoreVertical,
} from "lucide-react";
import { detalleError } from "@/lib/errores";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt   = (n: number) => `$${n.toFixed(2)}`;
const fecha = (f?: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? etiquetaPeriodo(f, f) : f || "");

const ESTADOS: Record<string, { etiqueta: string; tono: TonoEstado }> = {
  PENDIENTE: { etiqueta: "Pendiente", tono: "alerta" },
  PARCIAL:   { etiqueta: "Parcial",   tono: "info" },
  PAGADO:    { etiqueta: "Pagado",    tono: "exito" },
  ANULADO:   { etiqueta: "Anulado",   tono: "neutro" },
};

const FORMAS_PAGO: { valor: string; etiqueta: string }[] = [
  { valor: "EFECTIVO",      etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA", etiqueta: "Transferencia" },
  { valor: "CHEQUE",        etiqueta: "Cheque" },
  { valor: "TARJETA",       etiqueta: "Tarjeta" },
  { valor: "OTRO",          etiqueta: "Otro" },
];

/** Fila etiqueta → valor (Datos). */
function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof Calendar; etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="flex shrink-0 items-center gap-2 text-tenue"><Icono size={14} aria-hidden /> {etiqueta}</span>
      <span className="min-w-0 break-words text-right text-texto">{valor}</span>
    </div>
  );
}

// /cuentas/ver?id=… (antes /cuentas/[id]; ver lib/rutas.ts)
export default function DetalleCuentaPage() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  return <DetalleCuenta key={id} id={id} />;
}

function DetalleCuenta({ id }: { id: string }) {
  const router    = useRouter();
  const avisos    = useAvisos();
  const confirmar = useConfirmar();
  const empresa   = useAuthStore((s) => s.empresa);
  const tieneSub  = empresa?.suscripcion_activa ?? false;

  // Con caché: al volver de la persona la cuenta aparece al instante (lib/useLista.ts)
  const res    = useLista<any>(`/api/v1/app/cuentas/${id}`);
  const data   = res.datos;
  const cargar = res.recargar;

  const [menu,         setMenu]         = useState(false);
  const [showAbono,    setShowAbono]    = useState(false);
  const [showAjuste,   setShowAjuste]   = useState(false);
  const [savingAbono,  setSavingAbono]  = useState(false);
  const [savingAjuste, setSavingAjuste] = useState(false);
  const [error,        setError]        = useState("");

  const [abonoForm, setAbonoForm] = useState({
    monto:      "",
    fecha:      hoyEC(),
    forma_pago: "EFECTIVO",
    notas:      "",
  });

  const [ajusteForm, setAjusteForm] = useState({
    monto:  "",
    motivo: "",
    fecha:  hoyEC(),
  });

  const handleAbono = async () => {
    setError("");
    const monto = parseFloat(abonoForm.monto.replace(",", "."));
    if (!monto || monto <= 0) return setError("El monto debe ser mayor a cero.");
    setSavingAbono(true);
    try {
      await api.post(`/api/v1/app/cuentas/${id}/abonos`, {
        monto,
        fecha:      abonoForm.fecha      || null,
        forma_pago: abonoForm.forma_pago || null,
        notas:      abonoForm.notas      || null,
      });
      await cargar();
      setShowAbono(false);
      setAbonoForm({ monto: "", fecha: hoyEC(), forma_pago: "EFECTIVO", notas: "" });
      avisos.exito("Abono registrado");
    } catch (err: any) {
      setError(detalleError(err, "Error al registrar el abono."));
    } finally {
      setSavingAbono(false);
    }
  };

  const handleAjuste = async () => {
    setError("");
    const monto = parseFloat(ajusteForm.monto.replace(",", "."));
    if (!monto || monto <= 0) return setError("El monto del ajuste debe ser mayor a cero.");
    if (!ajusteForm.motivo.trim()) return setError("El motivo es obligatorio para un ajuste.");
    setSavingAjuste(true);
    try {
      await api.post(`/api/v1/app/cuentas/${id}/ajustes`, {
        monto,
        motivo: ajusteForm.motivo.trim(),
        fecha:  ajusteForm.fecha || null,
      });
      await cargar();
      setShowAjuste(false);
      setAjusteForm({ monto: "", motivo: "", fecha: hoyEC() });
      avisos.exito("Ajuste aplicado");
    } catch (err: any) {
      setError(detalleError(err, "Error al registrar el ajuste."));
    } finally {
      setSavingAjuste(false);
    }
  };

  const handleAnular = async () => {
    const ok = await confirmar({
      titulo: "¿Anular esta cuenta?",
      mensaje: "Esta acción no se puede deshacer. La cuenta quedará marcada como anulada.",
      textoConfirmar: "Anular", peligro: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/api/v1/app/cuentas/${id}/anular`);
      await cargar();
      avisos.info("Cuenta anulada");
    } catch (err: any) {
      avisos.error(detalleError(err, "Error al anular."));
    }
  };

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (res.cargando) return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6" aria-busy="true">
      <Esqueleto className="h-56 rounded-2xl" />
      <EsqueletoFilas filas={3} />
    </div>
  );
  if (!data?.cuenta) {
    const estado = (res.error as { response?: { status?: number } } | undefined)?.response?.status;
    const deRed  = !!res.error && estado !== 404 && estado !== 403;
    return (
      <Vacio
        icono={Wallet}
        titulo={deRed ? "No pudimos cargar la cuenta" : "Cuenta no encontrada"}
        descripcion={deRed ? "Revisa tu conexión e intenta de nuevo." : "Puede que sea de otra empresa o que ya no exista."}
        accion={deRed
          ? <Boton onClick={() => void cargar()}>Reintentar</Boton>
          : <Boton variante="secundario" onClick={() => router.push("/cuentas")}>Ir a Cuentas</Boton>}
        className="py-20"
      />
    );
  }

  const { cuenta, movimientos = [] } = data;
  const est        = ESTADOS[cuenta.estado] ?? ESTADOS.PENDIENTE;
  const cobrar     = cuenta.tipo === "COBRAR";
  const activa     = cuenta.estado === "PENDIENTE" || cuenta.estado === "PARCIAL";
  const porcentaje = cuenta.monto_total > 0
    ? Math.min(100, (cuenta.monto_pagado / cuenta.monto_total) * 100)
    : 0;
  const vencida = !!cuenta.fecha_vencimiento && cuenta.fecha_vencimiento < hoyEC() && activa;

  const abrirAbono  = () => { setError(""); setShowAbono(true); };
  const abrirAjuste = () => { setError(""); setShowAjuste(true); };
  const ajusteNum   = parseFloat(ajusteForm.monto.replace(",", "."));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <TirarParaRefrescar alRefrescar={cargar}>
      <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">

        {/* Arriba: qué cuenta es y cuánto falta */}
        <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
          <div className="flex items-start gap-2">
            {/* En el celular la flecha atrás ya está en la barra superior */}
            <BotonIcono etiqueta="Volver" icono={<ArrowLeft size={18} />} onClick={() => router.back()}
                        className="-ml-2 -mt-1 hidden lg:inline-flex" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <InsigniaEstado tono={cobrar ? "exito" : "peligro"}>{cobrar ? "Por cobrar" : "Por pagar"}</InsigniaEstado>
                <InsigniaEstado tono={est.tono}>{est.etiqueta}</InsigniaEstado>
                {vencida && <InsigniaEstado tono="peligro" icono={AlertTriangle}>Vencida</InsigniaEstado>}
              </div>
              <h1 className="mt-2 break-words text-lg font-bold text-texto">{cuenta.concepto}</h1>
              <Link href={rutas.persona(cuenta.cliente_id)} className="text-sm font-medium text-acento hover:underline">
                {cuenta.razon_social}
              </Link>
            </div>
            {activa && tieneSub && (
              <BotonIcono etiqueta="Más acciones" icono={<MoreVertical size={20} />} onClick={() => setMenu(true)} className="-mr-2" />
            )}
          </div>

          {/* Lo que falta, en grande, y cuánto va */}
          <p className="mt-4 text-xs text-sutil">{cuenta.estado === "PAGADO" ? "Saldada" : cobrar ? "Te falta cobrar" : "Te falta pagar"}</p>
          <p className="text-3xl font-bold tabular-nums text-texto">{fmt(cuenta.saldo_pendiente)}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-presionado"
               role="progressbar" aria-valuenow={Math.round(porcentaje)} aria-valuemin={0} aria-valuemax={100}
               aria-label="Avance del pago">
            <div className={cn("h-full rounded-full transition-all", cuenta.estado === "PAGADO" ? "bg-exito" : "bg-acento")}
                 style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-tenue">
            {cobrar ? "Cobrado" : "Pagado"} {fmt(cuenta.monto_pagado)} de {fmt(cuenta.monto_total)}
          </p>

          {activa && tieneSub && (
            <div className="mt-4 flex gap-2">
              <Boton onClick={abrirAbono} icono={<ArrowDownCircle size={16} />} className="flex-1 sm:flex-none">
                Registrar abono
              </Boton>
              <Boton variante="secundario" onClick={abrirAjuste} icono={<ArrowUpCircle size={16} />} className="flex-1 sm:flex-none">
                Ajustar monto
              </Boton>
            </div>
          )}

          {activa && !tieneSub && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-alerta/20 bg-alerta-suave px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 text-alerta" aria-hidden />
              <p className="text-xs text-alerta-texto">
                {ES_APP_NATIVA
                  ? "Registrar abonos y ajustes no está incluido en tu plan actual."
                  : "Registrar abonos y ajustes es del Plan Pro."}
              </p>
              <SoloWeb>
                <Link href="/planes" className="ml-auto shrink-0 text-xs text-alerta-texto underline">Ver planes</Link>
              </SoloWeb>
            </div>
          )}
        </section>

        {/* Datos */}
        <section className="rounded-xl border border-borde bg-superficie p-4">
          <Dato icono={Calendar} etiqueta="Fecha" valor={fecha(cuenta.fecha_emision)} />
          {cuenta.fecha_vencimiento && (
            <Dato icono={Calendar} etiqueta="Vencimiento"
                  valor={<span className={cn("font-medium", vencida && "text-peligro-texto")}>{fecha(cuenta.fecha_vencimiento)}</span>} />
          )}
          <Dato icono={Wallet} etiqueta="Total actual" valor={<span className="tabular-nums">{fmt(cuenta.monto_total)}</span>} />
          {cuenta.notas && <Dato icono={FileText} etiqueta="Notas" valor={cuenta.notas} />}
        </section>

        {/* Historial de movimientos (abonos + ajustes unificados) */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-texto">Movimientos ({movimientos.length})</h2>
          {movimientos.length === 0 ? (
            <p className="rounded-xl border border-borde bg-superficie px-4 py-8 text-center text-sm text-sutil">
              Sin movimientos registrados.
            </p>
          ) : (
            <div className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
              {movimientos.map((m: any) => {
                const esAjuste = m.tipo === "AJUSTE";
                return (
                  <FilaLista
                    key={m.id}
                    inicio={
                      <span className={cn("inline-flex size-9 items-center justify-center rounded-full",
                        esAjuste ? "bg-alerta-suave text-alerta-texto" : "bg-exito-suave text-exito-texto")}>
                        {esAjuste ? <ArrowUpCircle size={17} aria-hidden /> : <ArrowDownCircle size={17} aria-hidden />}
                      </span>
                    }
                    titulo={esAjuste ? "Ajuste" : "Abono"}
                    subtitulo={[fecha(m.fecha), m.forma_pago && (FORMAS_PAGO.find(f => f.valor === m.forma_pago)?.etiqueta ?? m.forma_pago)].filter(Boolean).join(" · ")}
                    detalle={m.notas || m.motivo || undefined}
                    fin={<span className={esAjuste ? "text-alerta-texto" : "text-exito-texto"}>{esAjuste ? "+" : "−"}{fmt(m.monto)}</span>}
                  />
                );
              })}
            </div>
          )}
        </section>

        <HojaAcciones
          abierta={menu}
          onCerrar={() => setMenu(false)}
          titulo={cuenta.concepto}
          acciones={[
            { etiqueta: "Anular cuenta", descripcion: "No se puede deshacer", icono: Ban, peligro: true, onClick: () => void handleAnular() },
          ]}
        />

        {/* ── Abono (Hoja) ───────────────────────────────────────────────────────── */}
        <Hoja
          abierta={showAbono}
          onCerrar={() => { setShowAbono(false); setError(""); }}
          titulo={<span className="inline-flex items-center gap-2"><ArrowDownCircle size={16} className="text-exito" /> Registrar abono</span>}
          descripcion={`Saldo pendiente: ${fmt(cuenta.saldo_pendiente)}`}
          tamano="sm"
          cerrable={!savingAbono}
          pie={<>
            <Boton variante="secundario" onClick={() => { setShowAbono(false); setError(""); }} disabled={savingAbono}>Cancelar</Boton>
            <Boton onClick={handleAbono} cargando={savingAbono} icono={<Save size={16} />}>Guardar</Boton>
          </>}
        >
          <div className="space-y-3">
            <Campo etiqueta="Monto">
              <Entrada
                teclado="decimal"
                prefijo="$"
                value={abonoForm.monto}
                onChange={(e) => setAbonoForm({ ...abonoForm, monto: e.target.value })}
                placeholder="0.00"
                autoFocus
              />
            </Campo>
            {/* Lo más común: saldar todo de una vez */}
            <Boton variante="secundario" tamano="sm" className="-mt-1"
                   onClick={() => setAbonoForm({ ...abonoForm, monto: cuenta.saldo_pendiente.toFixed(2) })}>
              Todo el saldo ({fmt(cuenta.saldo_pendiente)})
            </Boton>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha">
                <Entrada type="date" value={abonoForm.fecha}
                         onChange={(e) => setAbonoForm({ ...abonoForm, fecha: e.target.value })} />
              </Campo>
              <Campo etiqueta="Forma de pago">
                <Selector value={abonoForm.forma_pago}
                          onChange={(e) => setAbonoForm({ ...abonoForm, forma_pago: e.target.value })}>
                  {FORMAS_PAGO.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
                </Selector>
              </Campo>
            </div>
            <Campo etiqueta="Notas" opcional>
              <Entrada value={abonoForm.notas} placeholder="N° de transferencia, recibo…"
                       onChange={(e) => setAbonoForm({ ...abonoForm, notas: e.target.value })} />
            </Campo>
            {error && <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>}
          </div>
        </Hoja>

        {/* ── Ajuste (Hoja) ──────────────────────────────────────────────────────── */}
        <Hoja
          abierta={showAjuste}
          onCerrar={() => { setShowAjuste(false); setError(""); }}
          titulo={<span className="inline-flex items-center gap-2"><ArrowUpCircle size={16} className="text-alerta" /> Ajustar monto</span>}
          tamano="sm"
          cerrable={!savingAjuste}
          pie={<>
            <Boton variante="secundario" onClick={() => { setShowAjuste(false); setError(""); }} disabled={savingAjuste}>Cancelar</Boton>
            <Boton onClick={handleAjuste} cargando={savingAjuste} icono={<ArrowUpCircle size={16} />}>Aplicar ajuste</Boton>
          </>}
        >
          <div className="space-y-3">
            <p className="rounded-lg border border-alerta/20 bg-alerta-suave px-3 py-2.5 text-xs text-alerta-texto">
              Esto <span className="font-semibold">aumenta el monto total</span> de la deuda. Úsalo para intereses, cargos adicionales o un préstamo extra encima del saldo actual.
            </p>
            <Campo etiqueta="Monto a añadir"
                   ayuda={ajusteNum > 0 ? `Nuevo total: ${fmt(cuenta.monto_total + ajusteNum)}` : undefined}>
              <Entrada teclado="decimal" prefijo="+$" value={ajusteForm.monto} placeholder="0.00" autoFocus
                       onChange={(e) => setAjusteForm({ ...ajusteForm, monto: e.target.value })} />
            </Campo>
            <Campo etiqueta="Motivo">
              <Entrada value={ajusteForm.motivo} placeholder="Ej: Intereses enero, cargo adicional…"
                       onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })} />
            </Campo>
            <Campo etiqueta="Fecha">
              <Entrada type="date" value={ajusteForm.fecha}
                       onChange={(e) => setAjusteForm({ ...ajusteForm, fecha: e.target.value })} />
            </Campo>
            {error && <p className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>}
          </div>
        </Hoja>
      </div>
    </TirarParaRefrescar>
  );
}
