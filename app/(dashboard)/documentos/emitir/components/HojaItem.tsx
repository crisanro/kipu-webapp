// app/(dashboard)/documentos/emitir/components/HojaItem.tsx
// Editar un ítem en una hoja (celular): descripción, cantidad, precio (sin IVA o
// con IVA incluido), IVA, descuento y "guardar en mi catálogo", con campos
// grandes y teclado decimal. Los cambios se ven al instante en la lista y en el
// total; "Listo" cierra. La lógica de precios vive en ItemsEditor (onCampo).
//
// También exporta InputDecimal: el campo numérico que usan la hoja y las
// tarjetas de la compu (acepta coma o punto).

"use client";

import { useState, type CSSProperties } from "react";
import { Camera, Trash2 } from "lucide-react";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";
import { etiquetaIva, opcionesIva } from "@/lib/iva";
import { dosDecimales } from "@/lib/dinero";
import { calcularLinea, totalEsperadoConIva, tarifaPct } from "@/lib/precios";
// Solo el tipo: ItemsEditor importa este archivo (sin importación circular)
import type { Item } from "./ItemsEditor";

// ── Campo decimal ─────────────────────────────────────────────────────────────
export function InputDecimal({
  value, onChange, placeholder = "0", className = "", style, defaultValueOnBlur = 0, ...resto
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  defaultValueOnBlur?: number;
  "aria-label"?: string;
  id?: string;
}) {
  const [valStr, setValStr] = useState<string>(value === 0 ? "" : String(value));

  // Si el valor cambia desde fuera (otro campo lo recalculó), se muestra el nuevo;
  // lo que se está escribiendo ("1," o "1.50") se respeta si vale lo mismo
  const [previo, setPrevio] = useState(value);
  if (value !== previo) {
    setPrevio(value);
    if (parseFloat(valStr.replace(",", ".")) !== value) setValStr(value === 0 ? "" : String(value));
  }

  return (
    <input
      {...resto}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={valStr}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.,]/g, "");
        if (raw.split(/[.,]/).length > 2) return;
        setValStr(raw);
        const num = parseFloat(raw.replace(",", "."));
        onChange(isNaN(num) ? 0 : num);
      }}
      // Con estilos en línea (tarjetas de la compu) el borde de foco se pone aquí
      onFocus={(e) => { if (style) e.currentTarget.style.borderColor = "var(--kipu-accent)"; }}
      onBlur={(e) => {
        if (style) e.currentTarget.style.borderColor = "var(--kipu-border)";
        if (!valStr.trim()) {
          onChange(defaultValueOnBlur);
          setValStr(defaultValueOnBlur === 0 ? "" : String(defaultValueOnBlur));
        }
      }}
      placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}

// Mismo aspecto que Entrada (components/ui/Campo.tsx) para el campo decimal
const CLASE_DECIMAL =
  "h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base tabular-nums text-texto " +
  "placeholder:text-sutil focus:border-acento focus:outline-none";

export default function HojaItem({
  item, abierta, onCerrar, onCampo, onModoIva, onEliminar, puedeEliminar,
  codigoDuplicado, onVerificarCodigo, onEscanearCodigo,
}: {
  item:              Item | null;
  abierta:           boolean;
  onCerrar:          () => void;
  /** Cambia un campo (ItemsEditor recalcula precio y descuento si es IVA incluido). */
  onCampo:           (campo: keyof Item, valor: Item[keyof Item]) => void;
  onModoIva:         (incluido: boolean) => void;
  onEliminar:        () => void;
  puedeEliminar:     boolean;
  codigoDuplicado:   boolean;
  onVerificarCodigo: () => void;
  onEscanearCodigo:  () => void;
}) {
  if (!item) return <Hoja abierta={false} onCerrar={onCerrar} titulo="">{null}</Hoja>;

  const c           = calcularLinea(item);
  const conIva      = item.precio_iva !== undefined;
  const descConIva  = conIva && item.tipo_descuento === "$";
  const esperado    = totalEsperadoConIva(item);
  const redondeado  = esperado !== null && esperado !== c.total;

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={item.descripcion.trim() || "Nuevo ítem"}
      descripcion={`Total del ítem: $${dosDecimales(c.total)}`}
      pie={<>
        {puedeEliminar && (
          <Boton variante="peligro" onClick={onEliminar} icono={<Trash2 size={16} />}>Quitar</Boton>
        )}
        <Boton onClick={onCerrar}>Listo</Boton>
      </>}
    >
      <div className="space-y-4">
        <Campo etiqueta="Descripción">
          <Entrada
            value={item.descripcion}
            placeholder="Producto o servicio"
            onChange={(e) => onCampo("descripcion", e.target.value)}
          />
        </Campo>

        {/* Cantidad y precio */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="item-cantidad" className="block text-xs font-medium text-tenue tactil:text-sm">Cantidad</label>
            <InputDecimal id="item-cantidad" value={item.cantidad} defaultValueOnBlur={1}
                          onChange={(v) => onCampo("cantidad", v)} className={CLASE_DECIMAL} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="item-precio" className="block text-xs font-medium text-tenue tactil:text-sm">
              Precio {conIva ? "con IVA" : "sin IVA"}
            </label>
            <InputDecimal id="item-precio" value={conIva ? item.precio_iva ?? 0 : item.precio} placeholder="0.00"
                          onChange={(v) => onCampo(conIva ? "precio_iva" : "precio", v)} className={CLASE_DECIMAL} />
          </div>
        </div>

        {/* Precio sin IVA (Kipu le suma el IVA) o con IVA incluido (Kipu calcula la base) */}
        <div role="group" aria-label="Cómo escribes el precio" className="grid grid-cols-2 gap-1 rounded-lg bg-presionado p-1">
          {([[false, "Kipu suma el IVA"], [true, "Ya incluye IVA"]] as const).map(([valor, texto]) => (
            <button
              key={texto}
              type="button"
              aria-pressed={conIva === valor}
              onClick={() => onModoIva(valor)}
              className={cn("min-h-9 rounded-md px-2 text-xs font-medium transition-colors",
                conIva === valor ? "bg-superficie text-acento shadow-sm" : "text-tenue")}
            >
              {texto}
            </button>
          ))}
        </div>

        {/* IVA */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-tenue tactil:text-sm">IVA</p>
          {item._fromCatalog ? (
            <p className="text-sm text-tenue">{etiquetaIva(item.tipo_iva)} <span className="text-xs text-sutil">· el de tu catálogo</span></p>
          ) : (
            <ChipsFiltro etiqueta="IVA" opciones={opcionesIva(item.tipo_iva)} valor={item.tipo_iva}
                         onCambio={(v) => onCampo("tipo_iva", v)} />
          )}
        </div>

        {/* Descuento */}
        <div className="space-y-1.5">
          <label htmlFor="item-descuento" className="block text-xs font-medium text-tenue tactil:text-sm">
            Descuento {descConIva ? "con IVA" : ""}
          </label>
          <div className="flex gap-2">
            <div role="group" aria-label="Descuento en dólares o porcentaje" className="flex shrink-0 rounded-lg bg-presionado p-1">
              {(["$", "%"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={item.tipo_descuento === t}
                  onClick={() => onCampo("tipo_descuento", t)}
                  className={cn("min-h-9 w-10 rounded-md text-sm font-semibold transition-colors",
                    item.tipo_descuento === t ? "bg-superficie text-acento shadow-sm" : "text-tenue")}
                >
                  {t}
                </button>
              ))}
            </div>
            <InputDecimal id="item-descuento" value={descConIva ? item.descuento_iva ?? 0 : item.descuento}
                          onChange={(v) => onCampo(descConIva ? "descuento_iva" : "descuento", Math.max(0, v))}
                          className={CLASE_DECIMAL} />
          </div>
        </div>

        {/* IVA incluido: lo que va en la factura */}
        {conIva && tarifaPct(item.tipo_iva) > 0 && c.total > 0 && (
          <p className="text-xs text-tenue">
            Sin IVA <b className="text-texto">${dosDecimales(c.base)}</b> · IVA {etiquetaIva(item.tipo_iva)} <b className="text-texto">${dosDecimales(c.iva)}</b>
            {redondeado && <span className="block text-alerta-texto">Queda en ${dosDecimales(c.total)}: el SRI redondea el IVA al centavo.</span>}
          </p>
        )}

        {/* Guardar en mi catálogo — solo ítems escritos a mano */}
        {!item._fromCatalog && (
          <div className="space-y-2 border-t border-borde pt-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={!!item.guardar_catalogo}
                onChange={(e) => onCampo("guardar_catalogo", e.target.checked)}
                className="size-5 accent-acento"
              />
              <span className="text-sm text-texto">Guardar en mi catálogo</span>
            </label>
            {item.guardar_catalogo && (
              <Campo etiqueta="Código" error={codigoDuplicado ? "Ya existe en tu catálogo." : !item.codigo.trim() ? "Requerido para guardarlo." : null}>
                <Entrada
                  value={item.codigo}
                  maxLength={25}
                  autoCapitalize="characters"
                  onChange={(e) => onCampo("codigo", e.target.value.toUpperCase())}
                  onBlur={onVerificarCodigo}
                  sufijo={<BotonIcono etiqueta="Escanear código" icono={<Camera size={16} />} tamano="sm"
                                      onClick={onEscanearCodigo} className="-mr-2" />}
                />
              </Campo>
            )}
          </div>
        )}
      </div>
    </Hoja>
  );
}
