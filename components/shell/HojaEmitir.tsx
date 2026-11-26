// components/shell/HojaEmitir.tsx
// La hoja que abre el botón central "Emitir" de la barra de pestañas: qué
// comprobante emitir. Mismos filtros que el menú lateral (DashboardNav): permiso,
// retenciones de la empresa y lo que el plan no incluye (en la app no se muestra;
// en la web va marcado "Pro" y la pantalla explica cómo activarlo).

"use client";

import Link from "next/link";
import {
  ClipboardList, FileMinus, FilePlus, FileText, Percent, ShoppingBag, type LucideIcon,
} from "lucide-react";
import Hoja from "@/components/ui/Hoja";
import { aplicaALaEmpresa, bloqueadoPorPlan, tienePermiso } from "@/components/dashboard/DashboardNav";
import { rutaFueraDelPlan } from "@/lib/plataforma";
import { vibrar } from "@/lib/nativo";
import { useAuthStore } from "@/store/auth.store";

interface Opcion {
  href:                 string;
  etiqueta:             string;
  detalle:              string;
  icono:                LucideIcon;
  requierePro?:         boolean;
  requiereRetenciones?: boolean;
}

const OPCIONES: Opcion[] = [
  { href: "/documentos/emitir/fac", etiqueta: "Factura",         detalle: "Vende a un cliente",             icono: FileText },
  { href: "/documentos/emitir/ncr", etiqueta: "Nota de crédito", detalle: "Anula o descuenta una factura",  icono: FileMinus },
  { href: "/documentos/emitir/ndb", etiqueta: "Nota de débito",  detalle: "Cobra un valor adicional",       icono: FilePlus },
  { href: "/documentos/emitir/liq", etiqueta: "Liquidación",     detalle: "Compra a quien no factura",      icono: ShoppingBag, requierePro: true },
  { href: "/documentos/emitir/ret", etiqueta: "Retención",       detalle: "Retén impuestos a un proveedor", icono: Percent, requierePro: true, requiereRetenciones: true },
  { href: "/proformas/nueva",       etiqueta: "Proforma",        detalle: "Cotización sin valor tributario", icono: ClipboardList },
];

export default function HojaEmitir({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const empresa = useAuthStore((s) => s.empresa);
  const puedeEmitir = tienePermiso(empresa, "emitir");

  const visibles = OPCIONES.filter(o =>
    puedeEmitir && aplicaALaEmpresa(o, empresa) && !rutaFueraDelPlan(o.href, empresa));

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="¿Qué vas a emitir?" tamano="md">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibles.map(o => {
          const Icono = o.icono;
          const pro = bloqueadoPorPlan(o, empresa);
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                onClick={() => { void vibrar("ligera"); onCerrar(); }}
                className="relative flex h-full flex-col gap-2 rounded-xl border border-borde bg-superficie p-3 transition-[background-color,transform] duration-(--duracion-rapida) ease-estandar hover:bg-presionado active:scale-[0.97]"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-acento-suave text-acento">
                  <Icono size={20} aria-hidden />
                </span>
                <span className="text-sm font-semibold text-texto">{o.etiqueta}</span>
                <span className="text-xs leading-snug text-sutil">{o.detalle}</span>
                {pro && (
                  <span className="absolute right-2 top-2 rounded-full bg-alerta-suave px-1.5 py-0.5 text-[10px] font-semibold text-alerta">
                    Pro
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {visibles.length === 0 && (
        <p className="py-6 text-center text-sm text-tenue">Tu usuario no tiene permiso para emitir comprobantes.</p>
      )}
    </Hoja>
  );
}
