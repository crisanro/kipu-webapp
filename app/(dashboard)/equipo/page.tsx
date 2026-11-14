"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, KeyRound, Loader2, Users } from "lucide-react";
import api from "@/lib/api";
import { caja, detalle, Etiqueta, Vence, type Yo } from "./_comun";

interface Pendiente { id: number; tipo: string; nombre: string; estado: string; vencimiento: string; dias: number }
interface Cliente {
  emisor_id: number; ruc: string; razon_social: string; periodo_iva: string;
  contador: { id: string; nombre: string } | null;
  pago_al_dia: boolean; cancela: boolean; clave_guardada: boolean;
  pendientes: Pendiente[];
}

export default function EquipoAlDiaPage() {
  const router = useRouter();
  const [yo,        setYo]        = useState<Yo | null>(null);
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState("");
  const [soloMios,  setSoloMios]  = useState(true);

  useEffect(() => {
    let vivo = true;
    Promise.all([api.get("/api/v1/admin/al-dia/yo"), api.get("/api/v1/admin/al-dia/clientes")])
      .then(([y, c]) => {
        if (!vivo) return;
        setYo(y.data.data);
        setClientes(c.data.data);
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        if ((err as { response?: { status?: number } })?.response?.status === 403) router.replace("/dashboard");
        else setError(detalle(err, "No pudimos cargar tus clientes."));
      })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [router]);

  // Primero lo que vence antes; los que no tienen nada pendiente, al final
  const ordenados = useMemo(() => {
    const lista = yo?.es_superadmin && soloMios && yo.es_contador
      ? clientes.filter(c => c.contador?.nombre === yo.nombre)
      : clientes;
    return [...lista].sort((a, b) => (a.pendientes[0]?.dias ?? 999) - (b.pendientes[0]?.dias ?? 999));
  }, [clientes, yo, soloMios]);

  const sinAsignar = clientes.filter(c => !c.contador).length;

  if (cargando) {
    return <div className="flex justify-center py-24"><Loader2 size={22} className="animate-spin" style={{ color: "var(--kipu-subtle)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarCheck size={22} style={{ color: "var(--kipu-accent)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>Equipo Kipu Al Día</h1>
            <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>
              {yo?.es_superadmin ? "Todos los clientes" : `Tus clientes, ${yo?.nombre ?? ""}`} · {clientes.length} en total
              {yo?.es_superadmin && sinAsignar > 0 && <span style={{ color: "var(--kipu-warning)" }}> · {sinAsignar} sin contador</span>}
            </p>
          </div>
        </div>
        {yo?.es_superadmin && (
          <Link href="/equipo/contadores" className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
                style={{ ...caja, color: "var(--kipu-text)" }}>
            <Users size={15} /> Contadores
          </Link>
        )}
      </div>

      {yo?.es_superadmin && yo.es_contador && (
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--kipu-muted)" }}>
          <input type="checkbox" checked={soloMios} onChange={e => setSoloMios(e.target.checked)}
                 style={{ accentColor: "var(--kipu-accent)" }} />
          Ver solo los que atiendo yo
        </label>
      )}

      {error && <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>}

      {ordenados.length === 0 && !error && (
        <div className="rounded-xl p-8 text-center text-sm" style={{ ...caja, color: "var(--kipu-muted)" }}>
          No hay clientes de Kipu Al Día {yo?.es_superadmin ? "todavía" : "asignados a ti"}.
        </div>
      )}

      <div className="space-y-2">
        {ordenados.map(c => (
          <Link key={c.emisor_id} href={`/equipo/${c.emisor_id}`}
                className="block rounded-xl px-4 py-3 transition-colors" style={caja}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--kipu-text)" }}>{c.razon_social}</p>
                <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                  RUC {c.ruc} · IVA {c.periodo_iva === "SEMESTRAL" ? "semestral" : "mensual"}
                  {yo?.es_superadmin && <> · {c.contador ? c.contador.nombre : <span style={{ color: "var(--kipu-warning)" }}>sin contador</span>}</>}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!c.pago_al_dia && <Etiqueta estado="NO_PAGADO" />}
                {c.cancela && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: "var(--kipu-subtle)", border: "1px solid var(--kipu-border)" }}>Cancela al fin de mes</span>}
                {!c.clave_guardada && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                        style={{ color: "var(--kipu-warning)", border: "1px solid color-mix(in srgb, var(--kipu-warning) 40%, transparent)" }}>
                    <KeyRound size={11} /> Falta clave SRI
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {c.pendientes.length === 0
                ? <p className="text-xs" style={{ color: "var(--kipu-success)" }}>Todo al día ✓</p>
                : c.pendientes.map(p => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--kipu-muted)" }}>
                    <span>{p.nombre}</span>
                    <Etiqueta estado={p.estado} />
                    <Vence dias={p.dias} estado={p.estado} />
                  </div>
                ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
