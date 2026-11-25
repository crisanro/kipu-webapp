"use client";
import { rutas } from "@/lib/rutas";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import { useAuthStore } from "@/store/auth.store";
import { demoProformas } from "@/lib/demos";
import { BannerEjemplo, EtiquetaEjemplo } from "@/components/EjemploPro";
import SoloWeb from "@/components/SoloWeb";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { useLista } from "@/lib/useLista";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import Boton, { clasesBoton } from "@/components/ui/Boton";
import { Entrada } from "@/components/ui/Campo";
import { etiquetaPeriodo } from "@/components/ui/PeriodoFechas";
import {
  ClipboardList, Plus, Search,
  CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";

interface Proforma {
  id:              string;
  numero:          string;
  fecha_emision: string;
  fecha_validez: string | null;
  subtotal:      number;
  total_iva:      number;
  total:          number;
  estado:        "VIGENTE" | "FACTURADA";
  vencida:        boolean;
  notas:          string | null;
  cliente: {
    id:              string;
    razon_social:   string;
    identificacion: string;
  } | null;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

export default function ProformasPage() {
  const puedeVer = usePermiso("emitir");
  if (!puedeVer) return <SinAcceso />;
  return <ProformasContenido />;
}

// Separado del chequeo de permiso: los hooks se llaman siempre en el mismo orden
// aunque el permiso cambie con la página abierta (antes React lanzaba un error).
function ProformasContenido() {

  const router = useRouter();
  const [query, setQuery] = useState("");

  const empresa  = useAuthStore((s) => s.empresa);
  const tieneSub = empresa?.suscripcion_activa ?? false;

  // Con caché: al volver de una proforma la lista aparece al instante (lib/useLista.ts)
  const datos     = useLista<{ data?: Proforma[] }>("/api/v1/app/proformas");
  const proformas = datos.datos?.data ?? [];
  const loading   = datos.cargando;

  // Sin Plan Pro y sin proformas propias: ejemplos para ver cómo funciona
  const esDemo = !loading && !tieneSub && proformas.length === 0;
  const lista  = esDemo ? demoProformas() : proformas;

  const filtradas = lista.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.numero?.toLowerCase().includes(q) ||
      p.cliente?.razon_social?.toLowerCase().includes(q) ||
      p.cliente?.identificacion?.includes(q)
    );
  });

  const nueva = () => router.push("/proformas/nueva");

  return (
    <div className="p-4 md:p-6">
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="mb-6 hidden items-center justify-between lg:flex">
        <div>
          <h1 className="text-xl font-bold text-texto">Proformas</h1>
          <p className="text-sm text-sutil">{proformas.length} registradas</p>
        </div>
        <Boton
          onClick={nueva}
          disabled={!tieneSub}
          title={!tieneSub ? (ES_APP_NATIVA ? "No incluido en tu plan actual" : "Disponible en el Plan Pro") : undefined}
          icono={<Plus size={16} />}
        >
          Nueva proforma
        </Boton>
      </div>

      {esDemo && (
        <BannerEjemplo
          texto="Así se ven tus proformas con el Plan Pro: las haces en segundos, las mandas en PDF y, cuando el cliente acepta, la conviertes en factura con un clic."
          textoApp="Así se ven las proformas: las haces en segundos, las mandas en PDF y, cuando el cliente acepta, la conviertes en factura con un clic."
        />
      )}

      {/* Banner de suscripción */}
      {!tieneSub && !esDemo && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-alerta/20 bg-alerta-suave px-4 py-3">
          <AlertTriangle size={15} className="shrink-0 text-alerta" />
          <div className="flex-1">
            <p className="text-sm font-medium text-alerta-texto">
              {ES_APP_NATIVA ? "No incluido en tu plan actual" : "Función del Plan Pro"}
            </p>
            <p className="text-xs text-tenue">
              {ES_APP_NATIVA
                ? "Crear proformas no está incluido en tu plan actual. Las que ya hiciste las sigues viendo y puedes facturarlas."
                : "Crear proformas es del Plan Pro. Las que ya hiciste las sigues viendo y puedes facturarlas."}
            </p>
          </div>
          <SoloWeb>
            <Link href="/planes" className="shrink-0 text-xs text-alerta-texto underline underline-offset-2">
              Ver planes
            </Link>
          </SoloWeb>
        </div>
      )}

      <Entrada
        teclado="buscar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por número o cliente…"
        aria-label="Buscar proformas"
        prefijo={<Search size={16} />}
        className="mb-4"
      />

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={6} />
      ) : filtradas.length === 0 ? (
        query ? (
          <Vacio icono={Search} titulo="Ninguna proforma coincide" descripcion="Prueba con otro número o cliente." />
        ) : (
          <Vacio
            icono={ClipboardList}
            titulo="Aún no tienes proformas"
            descripcion="Cotiza en segundos y, cuando el cliente acepte, conviértela en factura."
            accion={tieneSub
              ? <Boton onClick={nueva} icono={<Plus size={16} />}>Crear proforma</Boton>
              : <SoloWeb><Link href="/planes" className={clasesBoton("secundario")}>Ver planes para crear proformas</Link></SoloWeb>}
          />
        )
      ) : (
        <TirarParaRefrescar alRefrescar={datos.recargar}>
          <GrupoFilas>
            {filtradas.map((p) => {
              const vencida   = p.vencida && p.estado === "VIGENTE";
              const facturada = p.estado === "FACTURADA";
              return (
                <FilaLista
                  key={p.id}
                  href={esDemo ? (ES_APP_NATIVA ? "/proformas" : "/planes") : rutas.proforma(p.id)}
                  titulo={<span className="flex items-center gap-2">{p.cliente?.razon_social ?? "Sin cliente"}{esDemo && <EtiquetaEjemplo />}</span>}
                  subtitulo={`${p.numero}${p.fecha_validez ? ` · vence ${etiquetaPeriodo(p.fecha_validez, p.fecha_validez).toLowerCase()}` : ""}`}
                  fin={fmt(p.total)}
                  finAbajo={
                    facturada ? <InsigniaEstado tono="exito" icono={CheckCircle2}>Facturada</InsigniaEstado>
                    : vencida ? <InsigniaEstado tono="peligro" icono={AlertTriangle}>Vencida</InsigniaEstado>
                    : <InsigniaEstado tono="info" icono={Clock}>Vigente</InsigniaEstado>
                  }
                />
              );
            })}
          </GrupoFilas>
        </TirarParaRefrescar>
      )}

      {/* Celular: nueva proforma (solo si el plan lo permite) */}
      {tieneSub && <BotonFlotante onClick={nueva} etiqueta="Nueva proforma" />}
    </div>
  );
}
