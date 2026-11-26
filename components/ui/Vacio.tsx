// components/ui/Vacio.tsx
// Pantalla de "no hay nada": qué pasa y qué hacer. Distinto texto si no hay
// datos todavía o si la búsqueda no encontró nada.
//
//   <Vacio icono={FileText} titulo="Sin comprobantes este mes"
//          descripcion="Emite tu primera factura." accion={<Boton …>Emitir</Boton>} />

import type { ReactNode } from "react";
import { WifiOff, type LucideIcon } from "lucide-react";
import Boton from "./Boton";
import { cn } from "./cn";

/**
 * No se pudo cargar (sin conexión, error del servidor). Distinto de "no hay
 * nada": si no, una caída se ve como "emite tu primera factura".
 *   <VacioError que="tus comprobantes" onReintentar={lista.recargar} />
 */
export function VacioError({ que, onReintentar, className }: {
  que:          string;
  onReintentar: () => void;
  className?:   string;
}) {
  return (
    <Vacio icono={WifiOff} titulo={`No pudimos cargar ${que}`}
           descripcion="Revisa tu conexión e intenta de nuevo."
           accion={<Boton variante="secundario" onClick={onReintentar}>Reintentar</Boton>}
           className={className} />
  );
}

/**
 * Un detalle que no se puede mostrar. Si el backend dijo 404 o 403 (no existe o
 * es de otra empresa), "no encontrado" y un botón a la lista; si fue otra cosa
 * (la conexión, el servidor), "no pudimos cargar" y Reintentar.
 *   if (!data) return <DetalleNoDisponible error={res.error} icono={Wallet} que="la cuenta"
 *     noEncontrado="Cuenta no encontrada" onReintentar={res.recargar}
 *     volver={{ texto: "Ir a Cuentas", onClick: () => router.push("/cuentas") }} />;
 */
export function DetalleNoDisponible({ error, icono, que, noEncontrado, onReintentar, volver }: {
  error:        unknown;
  icono:        LucideIcon;
  /** "la cuenta", "el comprobante": va en "No pudimos cargar …". */
  que:          string;
  noEncontrado: string;
  onReintentar: () => void;
  /** Sin esto (p. ej. en el panel lateral) no hay botón para ir a la lista. */
  volver?:      { texto: string; onClick: () => void };
}) {
  const estado = (error as { response?: { status?: number } } | undefined)?.response?.status;
  const deRed  = !!error && estado !== 404 && estado !== 403;
  return (
    <Vacio
      icono={icono}
      titulo={deRed ? `No pudimos cargar ${que}` : noEncontrado}
      descripcion={deRed ? "Revisa tu conexión e intenta de nuevo." : "Puede que sea de otra empresa o que ya no exista."}
      accion={deRed
        ? <Boton onClick={onReintentar}>Reintentar</Boton>
        : volver && <Boton variante="secundario" onClick={volver.onClick}>{volver.texto}</Boton>}
      className="py-20"
    />
  );
}

export default function Vacio({ icono: Icono, titulo, descripcion, accion, className }: {
  icono:        LucideIcon;
  titulo:       ReactNode;
  descripcion?: ReactNode;
  accion?:      ReactNode;
  className?:   string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-presionado text-sutil">
        <Icono size={26} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-texto">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-xs text-sm text-tenue">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}
