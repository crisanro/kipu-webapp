"use client";

import { useConfirmar } from "@/components/ui/Confirmar";
import Hoja from "@/components/ui/Hoja";
import Boton from "@/components/ui/Boton";
import FilaLista, { GrupoFilas } from "@/components/ui/FilaLista";
import { InsigniaEstado } from "@/components/ui/InsigniaEstado";
import type { TonoEstado } from "@/lib/estados";
import { EsqueletoFilas } from "@/components/ui/Esqueleto";
import Vacio, { VacioError } from "@/components/ui/Vacio";
import BotonFlotante from "@/components/ui/BotonFlotante";
import TirarParaRefrescar from "@/components/ui/TirarParaRefrescar";
import HojaAcciones from "@/components/ui/HojaAcciones";
import BotonIcono from "@/components/ui/BotonIcono";
import { Campo, Entrada, Selector } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useAtajos } from "@/lib/useAtajos";
import { useNuevoDesdePaleta } from "@/lib/comandos";
import { etiquetaIva, opcionesIva } from "@/lib/iva";
import { baseDesdeTotal, tarifaPct } from "@/lib/precios";
import { r2, dosDecimales } from "@/lib/dinero";
import api from "@/lib/api";
import { SegmentosPersonas } from "@/components/shell/BarraPestanas";
import { usePermiso } from "@/hooks/usePermiso";
import SinAcceso from "@/components/SinAcceso";
import {
  Search, Plus, Package,
  Save, Pencil, PowerOff, Power, Camera
} from "lucide-react";
import { detalleError } from "@/lib/errores";

const BarcodeScanner = lazy(() => import("@/components/BarcodeScanner"));

interface Producto {
  id:           string;
  codigo:       string;
  descripcion:  string;
  precio:       number;               // sin IVA
  precio_con_iva?:     number | null; // "IVA incluido": precio final que se mantiene
  precio_incluye_iva?: boolean;
  tipo_iva:     string;
  unidad:       string;
  activo:       boolean;
  stock:        number;
  stock_minimo: number;
}

const EMPTY_FORM = {
  codigo:       "",
  descripcion:  "",
  precio:       "",
  incluye_iva:  false,   // false: "+ IVA" (se suma) · true: "IVA incluido" (se desglosa)
  tipo_iva:     "15",
  unidad:       "UNIDAD",
  stock:        "-1",
  stock_minimo: "0",
};

const UNIDADES = ["UNIDAD", "SERVICIO", "KG", "LB", "LT", "MT", "CM", "CAJA", "PAQUETE", "HORA"];
const PRODUCTOS_LIMIT = 50;

/** Agotado o bajo el mínimo en rojo; poco (5 o menos) en amarillo. Mismo criterio en celular y compu. */
function tonoStock(p: { stock: number; stock_minimo: number }): TonoEstado {
  if (p.stock === 0 || (p.stock_minimo > 0 && p.stock <= p.stock_minimo)) return "peligro";
  return p.stock <= 5 ? "alerta" : "neutro";
}

/** Precio que se muestra en la lista: el final si es "IVA incluido", la base si es "+ IVA". */
const precioVisible = (p: Producto) =>
  p.precio_incluye_iva && p.precio_con_iva != null ? p.precio_con_iva : p.precio;

/** Base, IVA y final de lo que se está escribiendo (mismo redondeo que el SRI). */
function desglose(precio: number, incluyeIva: boolean, tipoIva: string) {
  const pct  = tarifaPct(tipoIva);
  const base = incluyeIva ? baseDesdeTotal(precio, tipoIva) : r2(precio);
  const iva  = r2(base * pct / 100);
  return { pct, base, iva, final: r2(base + iva) };
}

// Modo del scanner: "buscar" filtra la lista, "codigo" llena el campo código del modal
type ScanMode = "buscar" | "codigo";

export default function ProductosPage() {
  const confirmar = useConfirmar();
  const puedeVer = usePermiso("productos");

  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [fallo,        setFallo]        = useState(false);   // no se pudo cargar (no es "catálogo vacío")

  // Búsqueda en el servidor (antes solo filtraba los productos ya cargados)
  const [query,        setQuery]        = useState("");
  const [queryActivo,  setQueryActivo]  = useState("");
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pedidoRef                       = useRef(0);   // descarta respuestas de búsquedas viejas
  const [showModal,    setShowModal]    = useState(false);
  const [editando,     setEditando]     = useState<Producto | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const [scanMode,     setScanMode]     = useState<ScanMode>("buscar");
  // Celular: tocar un producto abre su menú (editar, desactivar/reactivar)
  const [menuDe,       setMenuDe]       = useState<Producto | null>(null);

  const cargar = useCallback(async (append = false) => {
    const pedido = ++pedidoRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({
        incluir_inactivos: String(verInactivos),
        limit:             String(PRODUCTOS_LIMIT),
        offset:            String(append ? productos.length : 0),
      });
      if (queryActivo) params.set("q", queryActivo);
      const res = await api.get(`/api/v1/app/productos?${params.toString()}`);
      if (pedido !== pedidoRef.current) return;
      const nuevos = res.data.data ?? [];
      setTotal(res.data.total ?? 0);
      setProductos(prev => append ? [...prev, ...nuevos] : nuevos);
      setFallo(false);
    } catch (e) {
      console.error(e);
      if (!append && pedido === pedidoRef.current) setFallo(true);
    } finally {
      if (pedido === pedidoRef.current) {
        if (append) setLoadingMore(false); else setLoading(false);
      }
    }
  }, [verInactivos, queryActivo, productos.length]);

  useEffect(() => {
    cargar();
  }, [verInactivos, queryActivo]);

  const cambiarQuery = (val: string, inmediato = false) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (inmediato) { setQueryActivo(val.trim()); return; }
    debounceRef.current = setTimeout(() => setQueryActivo(val.trim()), 400);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  // Compu: "/" busca y "n" crea un producto (lib/useAtajos.ts); sin permiso, nada
  const buscadorRef = useRef<HTMLInputElement>(null);
  useAtajos({
    "/": () => buscadorRef.current?.focus(),
    "n": () => abrirCrear(),
  }, puedeVer, { n: "Nuevo producto" });
  // "Nuevo producto" desde la paleta de comandos (lib/comandos.ts)
  useNuevoDesdePaleta(() => { if (puedeVer) abrirCrear(); });

  if (!puedeVer) return <SinAcceso />;

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setForm({
      codigo:       p.codigo ?? "",
      descripcion:  p.descripcion,
      precio:       String(precioVisible(p)),
      incluye_iva:  !!(p.precio_incluye_iva && p.precio_con_iva != null),
      tipo_iva:     p.tipo_iva,
      unidad:       p.unidad,
      stock:        String(p.stock ?? -1),
      stock_minimo: String(p.stock_minimo ?? 0),
    });
    setError("");
    setShowModal(true);
  };

  const stockValue = () => form.stock === "" ? -1 : parseInt(form.stock);

  // ── Scanner handlers ──────────────────────────────────────────────────────
  const abrirScannerBuscar = () => {
    setScanMode("buscar");
    setShowScanner(true);
  };

  const abrirScannerCodigo = () => {
    setScanMode("codigo");
    setShowScanner(true);
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    if (scanMode === "buscar") {
      // Buscar el código escaneado en el servidor, sin esperar
      cambiarQuery(code, true);
    } else {
      // Llenar el campo código del formulario
      setForm(prev => ({ ...prev, codigo: code.toUpperCase() }));
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");

    if (!form.codigo.trim()) {
      setError("El código es obligatorio.");
      return;
    }
    if (!form.descripcion || form.precio === "") {
      setError("Descripción y precio son obligatorios.");
      return;
    }
    if (parseFloat(form.precio) < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }

    // Verificar código único (solo si es nuevo o cambió el código)
    if (!editando || editando.codigo !== form.codigo.trim()) {
      const existente = productos.find(
        p => p.codigo?.toUpperCase() === form.codigo.trim().toUpperCase() && p.id !== editando?.id
      );
      if (existente) {
        setError(`El código "${form.codigo}" ya existe (${existente.descripcion}).`);
        return;
      }
    }

    setSaving(true);
    try {
      const { incluye_iva, ...resto } = form;
      const payload = {
        ...resto,
        codigo:       form.codigo.trim().toUpperCase(),
        precio:       parseFloat(form.precio),
        precio_incluye_iva: incluye_iva,
        stock:        stockValue(),
        stock_minimo: parseInt(form.stock_minimo) || 0,
      };
      if (editando) {
        await api.patch(`/api/v1/app/productos/${editando.id}`, payload);
      } else {
        await api.post("/api/v1/app/productos", payload);
      }
      await new Promise(r => setTimeout(r, 300));
      await cargar();
      setShowModal(false);
    } catch (err: any) {
      setError(detalleError(err, "Error al guardar."));
    } finally {
      setSaving(false);
    }
  };

  const desactivar = async (id: string) => {
    if (!(await confirmar({
      titulo: "¿Desactivar este producto?",
      mensaje: "Ya no aparecerá al facturar. Puedes reactivarlo cuando quieras.",
      textoConfirmar: "Desactivar", peligro: true,
    }))) return;
    try {
      await api.delete(`/api/v1/app/productos/${id}`);
      await cargar();
    } catch (e) {
      console.error(e);
    }
  };

  const reactivar = async (id: string) => {
    if (!(await confirmar({
      titulo: "¿Reactivar este producto?",
      mensaje: "Volverá a aparecer al facturar.",
      textoConfirmar: "Reactivar",
    }))) return;
    try {
      await api.patch(`/api/v1/app/productos/${id}`, { activo: true });
      await cargar();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <SegmentosPersonas />
      {/* Encabezado: en el celular el título ya está en la barra superior */}
      <div className="mb-4 mt-4 hidden items-center justify-between lg:mt-0 lg:flex">
        <div>
          <h1 className="text-xl font-bold text-texto">Productos y servicios</h1>
          <p className="text-sm text-sutil">{total > 0 ? `${total} producto${total !== 1 ? "s" : ""}` : "0 productos"}</p>
        </div>
        <Boton onClick={abrirCrear} icono={<Plus size={16} />}>Nuevo</Boton>
      </div>

      {/* Búsqueda (con escáner de código de barras) e inactivos */}
      <div className="mb-4 mt-4 flex items-center gap-2 lg:mt-0">
        <Entrada
          teclado="buscar"
          value={query}
          onChange={(e) => cambiarQuery(e.target.value)}
          placeholder="Buscar por descripción o código…"
          aria-label="Buscar productos"
          prefijo={<Search size={16} />}
          ref={buscadorRef}
          sufijo={<BotonIcono etiqueta="Escanear código de barras para buscar" icono={<Camera size={18} />}
                              tamano="sm" onClick={abrirScannerBuscar} className="-mr-2" />}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => setVerInactivos(!verInactivos)}
          aria-pressed={verInactivos}
          className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors tactil:h-11 ${
            verInactivos ? "border-texto bg-texto text-superficie" : "border-borde bg-superficie text-tenue hover:text-texto"}`}
        >
          Inactivos
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <EsqueletoFilas filas={8} />
      ) : fallo ? (
        <VacioError que="tus productos" onReintentar={() => void cargar()} />
      ) : productos.length === 0 ? (
        queryActivo ? (
          <Vacio icono={Search} titulo="Ningún producto coincide" descripcion="Prueba con otra descripción o código." />
        ) : (
          <Vacio icono={Package} titulo="Aún no tienes productos en el catálogo"
                 descripcion="Guárdalos para facturarlos en segundos, con su precio y su IVA."
                 accion={<Boton onClick={abrirCrear} icono={<Plus size={16} />}>Agregar producto</Boton>} />
        )
      ) : (
        <>
          {/* Celular: tocar el producto abre su menú; deslizar hacia abajo actualiza */}
          <TirarParaRefrescar alRefrescar={() => cargar()} className="md:hidden">
            <GrupoFilas>
              {productos.map(p => (
                <FilaLista
                  key={p.id}
                  onClick={() => setMenuDe(p)}
                  apagada={!p.activo}
                  titulo={p.descripcion}
                  subtitulo={`${p.codigo || "Sin código"} · IVA ${etiquetaIva(p.tipo_iva)} · ${p.unidad}`}
                  fin={`$${dosDecimales(precioVisible(p))}`}
                  finAbajo={
                    <span className="flex flex-wrap justify-end gap-1">
                      {!p.activo && <InsigniaEstado tono="neutro">Inactivo</InsigniaEstado>}
                      {p.stock >= 0
                        ? <InsigniaEstado tono={tonoStock(p)}>{p.stock === 0 ? "Sin stock" : `Stock ${p.stock}`}</InsigniaEstado>
                        : tarifaPct(p.tipo_iva) > 0 && <span className="text-[11px] text-sutil">{p.precio_incluye_iva ? "IVA incluido" : "+ IVA"}</span>}
                    </span>
                  }
                />
              ))}
            </GrupoFilas>
          </TirarParaRefrescar>

          {/* Escritorio: tabla con las acciones en cada fila (el celular usa la lista de arriba) */}
          <div className="hidden overflow-hidden rounded-xl border border-borde bg-superficie md:block">
            <div className="grid grid-cols-12 gap-3 border-b border-borde px-4 py-2.5 text-xs text-sutil">
              <span className="col-span-2">Código</span>
              <span className="col-span-4">Descripción</span>
              <span className="col-span-2 text-center">Precio</span>
              <span className="col-span-1 text-center">IVA</span>
              <span className="col-span-1 text-center">Stock</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>
            <div className="divide-y divide-borde">
              {productos.map((p) => (
                <div key={p.id}
                     className={cn("grid grid-cols-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-presionado", !p.activo && "opacity-50")}>
                  <span className="col-span-2 truncate font-mono text-xs text-sutil">{p.codigo || "—"}</span>
                  <p className="col-span-4 min-w-0 truncate text-sm text-texto">{p.descripcion}</p>
                  <span className="col-span-2 text-center text-sm font-semibold text-texto">
                    ${dosDecimales(precioVisible(p))}
                    {tarifaPct(p.tipo_iva) > 0 && (
                      <span className="block text-[10px] font-normal text-sutil">
                        {p.precio_incluye_iva ? "IVA incluido" : "+ IVA"}
                      </span>
                    )}
                  </span>
                  <span className="col-span-1 text-center text-xs text-tenue">{etiquetaIva(p.tipo_iva)}</span>
                  <span className="col-span-1 text-center text-xs font-medium">
                    {p.stock < 0
                      ? <span className="text-sutil">—</span>
                      : <InsigniaEstado tono={tonoStock(p)}>{p.stock === 0 ? "Sin stock" : p.stock}</InsigniaEstado>}
                  </span>
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <BotonIcono etiqueta="Editar" icono={<Pencil size={14} />} tamano="sm" onClick={() => abrirEditar(p)} />
                    {p.activo
                      ? <BotonIcono etiqueta="Desactivar" icono={<PowerOff size={14} />} tamano="sm" variante="peligro"
                                    onClick={() => desactivar(p.id)} />
                      : <BotonIcono etiqueta="Reactivar" icono={<Power size={14} />} tamano="sm"
                                    onClick={() => reactivar(p.id)} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cargar más */}
          {!loading && productos.length < total && (
            <div className="mt-4 flex justify-center">
              <Boton variante="secundario" onClick={() => cargar(true)} cargando={loadingMore} className="w-full sm:w-auto">
                Cargar más ({productos.length} de {total})
              </Boton>
            </div>
          )}
        </>
      )}

      {/* Celular: nuevo producto */}
      <BotonFlotante onClick={abrirCrear} etiqueta="Nuevo producto" />

      {/* Celular: menú del producto */}
      <HojaAcciones
        abierta={!!menuDe}
        onCerrar={() => setMenuDe(null)}
        titulo={menuDe?.descripcion ?? ""}
        descripcion={menuDe ? `${menuDe.codigo || "Sin código"} · $${dosDecimales(precioVisible(menuDe))}` : undefined}
        acciones={menuDe ? [
          { etiqueta: "Editar", icono: Pencil, onClick: () => abrirEditar(menuDe) },
          menuDe.activo
            ? { etiqueta: "Desactivar", descripcion: "Ya no aparecerá al facturar", icono: PowerOff, peligro: true, onClick: () => desactivar(menuDe.id) }
            : { etiqueta: "Reactivar", icono: Power, onClick: () => reactivar(menuDe.id) },
        ] : []}
      />

      {/* Crear/editar: Hoja (en el celular sube desde abajo, con los botones fijos abajo) */}
      <Hoja
        abierta={showModal}
        onCerrar={() => setShowModal(false)}
        titulo={editando ? "Editar producto" : "Nuevo producto"}
        cerrable={!saving}
        pie={<>
          <Boton variante="secundario" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Boton>
          <Boton onClick={handleSave} cargando={saving} icono={<Save size={16} />}>
            {editando ? "Actualizar" : "Guardar"}
          </Boton>
        </>}
      >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Código *">
                  <Entrada
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    placeholder="PROD-001"
                    autoComplete="off"
                    disabled={Boolean(editando)}
                  />
                  {/* Escanear: solo al crear (el código no se cambia) */}
                  {!editando && (
                    <button
                      type="button"
                      onClick={abrirScannerCodigo}
                      className="inline-flex items-center gap-1.5 self-start text-xs text-sutil transition-colors hover:text-acento"
                    >
                      <Camera size={13} aria-hidden /> Escanear
                    </button>
                  )}
                </Campo>
                <Campo etiqueta="Precio *">
                  <Entrada
                    teclado="decimal"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value.replace(",", ".") })}
                    placeholder="0.00"
                  />
                  {/* ¿Al precio se le suma el IVA o ya lo incluye? */}
                  <div role="radiogroup" aria-label="El precio que ingreso"
                       className="grid grid-cols-2 overflow-hidden rounded-lg border border-borde text-[11px]">
                    {([[false, "+ IVA", "Kipu le suma el IVA"], [true, "IVA incluido", "Kipu desglosa el IVA"]] as const)
                      .map(([valor, etiqueta, ayuda]) => {
                        const activo = form.incluye_iva === valor;
                        return (
                          <button
                            key={etiqueta}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            title={ayuda}
                            onClick={() => setForm({ ...form, incluye_iva: valor })}
                            className={cn("py-1 transition-colors", activo ? "bg-acento text-white" : "text-tenue")}
                          >
                            {etiqueta}
                          </button>
                        );
                      })}
                  </div>
                </Campo>
              </div>

              <Campo etiqueta="Descripción *">
                <Entrada
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Nombre del producto o servicio"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="IVA">
                  <Selector value={form.tipo_iva} onChange={(e) => setForm({ ...form, tipo_iva: e.target.value })}>
                    {opcionesIva(editando?.tipo_iva).map(o => (
                      <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                    ))}
                  </Selector>
                </Campo>
                <Campo etiqueta="Unidad">
                  <Selector value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </Selector>
                </Campo>
              </div>

              {/* Desglose de lo que se escribió */}
              {parseFloat(form.precio) > 0 && (() => {
                const d = desglose(parseFloat(form.precio), form.incluye_iva, form.tipo_iva);
                if (d.pct === 0) return (
                  <p className="text-[11px] text-sutil">Sin IVA: tu cliente paga ${dosDecimales(d.final)}.</p>
                );
                const redondeo = form.incluye_iva && d.final !== r2(parseFloat(form.precio));
                return (
                  <div className="space-y-0.5 rounded-lg bg-presionado px-3 py-2 text-[11px] text-tenue">
                    <p>
                      Base ${dosDecimales(d.base)} · IVA {d.pct}% ${dosDecimales(d.iva)} ·{" "}
                      <strong className="text-texto">Tu cliente paga ${dosDecimales(d.final)}</strong>
                    </p>
                    <p className="text-sutil">
                      {form.incluye_iva
                        ? "Si cambia el IVA, el precio final se mantiene y la base se ajusta."
                        : "Si cambia el IVA, la base se mantiene y el precio final se ajusta."}
                    </p>
                    {redondeo && (
                      <p className="text-alerta-texto">
                        Con el redondeo del SRI no hay una base exacta para ese precio: queda en ${dosDecimales(d.final)}.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* -1 = sin control: type number para que el celular deje escribir el signo menos */}
              <Campo etiqueta={editando ? "Stock actual" : "Stock inicial"} ayuda="-1 = sin control de stock">
                <Entrada
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="-1"
                  min={-1}
                  step={1}
                />
              </Campo>

              {stockValue() !== -1 && (
                <Campo etiqueta="Stock mínimo (alerta cuando llegue a este nivel)" ayuda="0 = sin alerta de stock bajo">
                  <Entrada
                    teclado="numero"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value.replace(/\D/g, "") })}
                    placeholder="0"
                  />
                </Campo>
              )}

              {error && (
                <p role="alert" className="rounded-lg bg-peligro-suave px-3 py-2 text-xs text-peligro-texto">{error}</p>
              )}
            </div>
      </Hoja>

      {/* Modal Barcode Scanner — compartido entre búsqueda y código */}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}
    </div>
  );
}