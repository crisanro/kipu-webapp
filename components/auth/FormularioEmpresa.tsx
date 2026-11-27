"use client";
// components/auth/FormularioEmpresa.tsx
// Registrar una empresa: 1) datos (con el RUC se buscan solos en el SRI),
// 2) confirmar. Si el RUC está en pruebas con otra cuenta, el dueño lo recupera
// con su firma. Lo usan el onboarding (primera empresa) y Nueva empresa (otra
// más): antes eran dos copias que validaban distinto.
//   - En el celular los botones quedan fijos abajo, a mano del pulgar; en la
//     compu, al final del formulario.
//   - "Siguiente" del teclado salta al campo que sigue.
//
//   <FormularioEmpresa onCreada={(id) => …} pie={(ruc) => <Soporte ruc={ruc} />} />
//
// La página pone el encabezado, la pantalla de éxito y qué pasa después.

import { useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import { Building2, CheckCircle2, Search, Loader2, MessageCircle, ShieldCheck, Upload, FileKey } from "lucide-react";
import { consultarRuc } from "@/lib/consultar-ruc";
import { validarIdentificacion } from "@/lib/identificacion";
import { detalleError } from "@/lib/errores";
import { enlaceWhatsAppFalla } from "@/lib/soporte";
import { FALTA_CAPTCHA, useCaptcha } from "@/components/auth/Turnstile";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada, EntradaClave } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";

const PASOS = ["Empresa", "Confirmar"];

// ── Soporte: fallas que bloquean, para todos (lib/soporte.ts) ─────────────────
const waSoporte = (texto: string) => enlaceWhatsAppFalla(texto, auth.currentUser?.email);

/** Mayúsculas, sin tildes ni caracteres que el SRI no acepta. */
const limpiarTexto = (texto: string): string =>
  texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9\s.,\-/#&]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();

// La misma validación del selector de clientes (lib/identificacion.ts)
const validarRuc = (ruc: string): string | null => {
  const v = validarIdentificacion("04", ruc);
  return v.ok ? null : (v.error || "El RUC debe tener 13 dígitos.");
};

// Ayuda de "¿A qué se dedica tu negocio?" (también en Configuración, TabEmpresa)
export const AYUDA_NEGOCIO = "Con esto Kipu sabe qué compras son de tu negocio: deducibles de renta, "
                           + "con crédito de IVA o activos fijos.";

export type DatosEmpresa = {
  ruc: string; razon_social: string; nombre_comercial: string; direccion_matriz: string;
  obligado_contabilidad: string; contribuyente_especial: string;
  descripcion_negocio: string;   // opcional: contexto para clasificar las compras
};

/** "Siguiente" en el teclado: al campo que sigue; en el último, envía el formulario. */
function pasarAlSiguiente(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
  const campos = [...e.currentTarget.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([disabled])")];
  const i = campos.indexOf(e.target);
  if (i >= 0 && i < campos.length - 1) { e.preventDefault(); campos[i + 1].focus(); }
}

export default function FormularioEmpresa({ onCreada, pie }: {
  /** La empresa quedó creada (o recuperada con la firma). El id, si el backend lo da. */
  onCreada: (emisorId: number | null) => void;
  /** Debajo de los botones (p. ej. soporte y cerrar sesión); recibe el RUC escrito. */
  pie?: (ruc: string) => ReactNode;
}) {
  const router = useRouter();

  const [paso,    setPaso]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  // El RUC está en pruebas con otra cuenta: se ofrece recuperarlo con la firma
  const [recuperar, setRecuperar] = useState(false);
  const captcha = useCaptcha();

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg,     setLookupMsg]     = useState("");
  const ultimoRuc = useRef("");   // último RUC autoconsultado, para no repetir

  const [form, setForm] = useState<DatosEmpresa>({
    ruc:                    "",
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad:  "NO",
    contribuyente_especial: "",
    descripcion_negocio:    "",
  });

  const rucValido = form.ruc.length === 13 && /^\d+$/.test(form.ruc) && form.ruc.endsWith("001");

  const cambiar = (campo: keyof DatosEmpresa, valor: string) => {
    setForm(f => ({ ...f, [campo]: valor }));
    setError("");
  };

  // ── Datos del SRI por RUC ──────────────────────────────────────────────────
  const handleLookup = async (rucArg?: string) => {
    const ruc = rucArg ?? form.ruc;
    const valido = ruc.length === 13 && /^\d+$/.test(ruc) && ruc.endsWith("001");
    if (!valido || lookupLoading) return;
    ultimoRuc.current = ruc;
    setLookupLoading(true);
    setLookupMsg("");

    const { found, datos, error } = await consultarRuc(ruc);

    if (error) {
      setLookupMsg(error);
    } else if (found && datos) {
      setForm((prev) => ({
        ...prev,
        razon_social:           datos.razon_social           || prev.razon_social,
        nombre_comercial:       datos.nombre_comercial       || prev.nombre_comercial,
        direccion_matriz:       datos.direccion_matriz       || prev.direccion_matriz,
        obligado_contabilidad:  datos.obligado_contabilidad  || prev.obligado_contabilidad,
        contribuyente_especial: datos.contribuyente_especial || prev.contribuyente_especial,
      }));
      setLookupMsg(datos.estado === "ACTIVO"
        ? "✓ Datos cargados del SRI — revísalos y corrige si hace falta"
        : `⚠ El RUC figura como ${datos.estado || "no activo"} en el SRI`);
    } else {
      setLookupMsg("No encontrado — ingresa los datos manualmente");
    }

    setLookupLoading(false);
  };

  const validarPaso0 = () => {
    const errorRuc = validarRuc(form.ruc);
    if (errorRuc) { setError(errorRuc); return false; }
    if (!form.razon_social.trim()) { setError("La razón social es obligatoria."); return false; }
    if (!form.direccion_matriz.trim()) { setError("La dirección es obligatoria."); return false; }
    if (form.direccion_matriz.trim().length < 5) { setError("La dirección debe tener al menos 5 caracteres."); return false; }
    return true;
  };

  const continuar = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validarPaso0()) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setPaso(1);
    window.scrollTo({ top: 0 });
  };

  const handleSubmit = async () => {
    setError("");
    setRecuperar(false);
    if (captcha.falta) { setError(FALTA_CAPTCHA); return; }
    setLoading(true);
    let ok = false;
    try {
      const res = await api.post("/api/v1/app/emisor/onboarding", { ...form, captcha_token: captcha.token });
      ok = true;
      onCreada(res.data?.emisor_id ?? null);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
      const detail = res?.data?.detail;
      // Sin correo verificado el backend no registra: a verificarlo primero
      if (res?.status === 403 && typeof detail === "string" && /verificar tu correo/i.test(detail)) {
        router.replace("/bienvenida");
        return;
      }
      if ((detail as { codigo?: string } | undefined)?.codigo === "RUC_EN_PRUEBAS") {
        setRecuperar(true);
        return;
      }
      setError(detalleError(err, "No pudimos registrar la empresa. Intenta de nuevo."));
    } finally {
      setLoading(false);
      // Cada verificación sirve una sola vez: para reintentar hace falta otra
      if (!ok) captcha.renovar();
    }
  };

  const tonoLookup = lookupMsg.startsWith("✓") ? "text-exito-texto"
    : lookupMsg.startsWith("⚠") ? "text-alerta-texto" : "text-sutil";

  return (
    <div className="flex flex-1 flex-col md:flex-none">
      <div className="flex-1 md:flex-none">
        {/* Pasos */}
        <ol className="mb-6 flex items-center gap-2" aria-label="Pasos">
          {PASOS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === paso ? "step" : undefined}>
              <span className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i <= paso ? "bg-acento text-sobre-acento" : "bg-presionado text-sutil",
              )}>
                {i < paso ? <CheckCircle2 size={14} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium", i <= paso ? "text-texto" : "text-sutil")}>{label}</span>
              {i < PASOS.length - 1 && (
                <span className={cn("h-px flex-1 transition-colors", i < paso ? "bg-acento" : "bg-borde")} aria-hidden />
              )}
            </li>
          ))}
        </ol>

        {/* Paso 1 — Datos */}
        {paso === 0 && (
          <form id="form-empresa" onSubmit={continuar} onKeyDown={pasarAlSiguiente} className="space-y-4 pb-6" noValidate>
            <div>
              <Campo etiqueta="RUC">
                <Entrada
                  teclado="ruc"
                  name="ruc"
                  enterKeyHint="next"
                  value={form.ruc}
                  maxLength={13}
                  placeholder="0000000000001"
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    cambiar("ruc", val);
                    setLookupMsg("");
                    // Autobúsqueda al completar un RUC válido (una sola vez por valor)
                    if (val.length === 13 && val.endsWith("001") && val !== ultimoRuc.current) {
                      handleLookup(val);
                    }
                  }}
                  sufijo={
                    <BotonIcono
                      etiqueta="Buscar los datos en el SRI"
                      icono={lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      tamano="sm"
                      onClick={() => handleLookup()}
                      disabled={!rucValido || lookupLoading}
                      className="-mr-2"
                    />
                  }
                />
              </Campo>
              {lookupMsg && <p className={cn("mt-1.5 text-xs", tonoLookup)} role="status">{lookupMsg}</p>}
            </div>

            <Campo etiqueta="Razón social">
              <Entrada
                name="razon_social"
                autoCapitalize="characters"
                enterKeyHint="next"
                value={form.razon_social}
                onChange={(e) => cambiar("razon_social", limpiarTexto(e.target.value))}
                placeholder="EMPRESA S.A."
              />
            </Campo>

            <Campo etiqueta="Nombre comercial" opcional>
              <Entrada
                name="nombre_comercial"
                autoCapitalize="characters"
                enterKeyHint="next"
                value={form.nombre_comercial}
                onChange={(e) => cambiar("nombre_comercial", limpiarTexto(e.target.value))}
                placeholder="MI NEGOCIO"
              />
            </Campo>

            <Campo etiqueta="Dirección matriz">
              <Entrada
                name="direccion_matriz"
                autoCapitalize="characters"
                enterKeyHint="next"
                value={form.direccion_matriz}
                onChange={(e) => cambiar("direccion_matriz", limpiarTexto(e.target.value))}
                placeholder="AV. PRINCIPAL 123, CIUDAD"
              />
            </Campo>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-tenue tactil:text-sm">Obligado a llevar contabilidad</p>
              <ChipsFiltro
                etiqueta="Obligado a llevar contabilidad"
                opciones={[{ valor: "NO", etiqueta: "No" }, { valor: "SI", etiqueta: "Sí" }]}
                valor={form.obligado_contabilidad}
                onCambio={(v) => cambiar("obligado_contabilidad", v)}
              />
            </div>

            <Campo etiqueta="Contribuyente especial (Nro.)" opcional>
              <Entrada
                teclado="numero"
                name="contribuyente_especial"
                enterKeyHint="next"
                value={form.contribuyente_especial}
                onChange={(e) => cambiar("contribuyente_especial", e.target.value)}
              />
            </Campo>

            <Campo etiqueta="¿A qué se dedica tu negocio?" opcional ayuda={AYUDA_NEGOCIO}>
              <Entrada
                name="descripcion_negocio"
                enterKeyHint="go"
                maxLength={120}
                value={form.descripcion_negocio}
                onChange={(e) => cambiar("descripcion_negocio", e.target.value)}
                placeholder="Ej.: consultorio odontológico, venta de repuestos de motos"
              />
            </Campo>

            {error && <ErrorBox error={error} ruc={form.ruc} />}
          </form>
        )}

        {/* Paso 2 — Confirmar */}
        {paso === 1 && (
          <div className="space-y-4 pb-6">
            <section className="rounded-xl border border-borde bg-superficie p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
                <Building2 size={16} className="text-acento" aria-hidden /> Resumen de la empresa
              </h2>
              <dl className="space-y-2.5">
                {[
                  { label: "RUC",                     value: form.ruc },
                  { label: "Razón social",            value: form.razon_social },
                  { label: "Nombre comercial",        value: form.nombre_comercial || "—" },
                  { label: "Dirección",               value: form.direccion_matriz },
                  { label: "Obligado a contabilidad", value: form.obligado_contabilidad === "SI" ? "Sí" : "No" },
                  ...(form.contribuyente_especial
                    ? [{ label: "Contribuyente especial", value: form.contribuyente_especial }] : []),
                  ...(form.descripcion_negocio.trim()
                    ? [{ label: "Tu negocio", value: form.descripcion_negocio.trim() }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <dt className="shrink-0 text-sutil">{label}</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-texto">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {error && <ErrorBox error={error} ruc={form.ruc} />}
            {recuperar && <RecuperarConFirma form={form} onListo={() => onCreada(null)} />}
            {!recuperar && captcha.widget}
          </div>
        )}
      </div>

      {/* Botones: en el celular fijos abajo; en la compu al final del formulario */}
      <div className="sticky bottom-0 -mx-4 border-t border-borde bg-superficie/95 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <div className="flex gap-3">
          {paso === 0 ? (
            <Boton type="submit" form="form-empresa" tamano="lg" anchoCompleto>Continuar</Boton>
          ) : (
            <>
              <Boton variante="secundario" tamano="lg" className="flex-1"
                     onClick={() => { setPaso(0); setRecuperar(false); setError(""); }}>
                Atrás
              </Boton>
              {!recuperar && (
                <Boton tamano="lg" className="flex-1" onClick={handleSubmit} cargando={loading}>
                  {loading ? "Creando…" : "Confirmar y entrar"}
                </Boton>
              )}
            </>
          )}
        </div>
      </div>

      {pie?.(form.ruc)}
    </div>
  );
}

// ── RUC registrado en pruebas por otra cuenta: el dueño lo recupera con su firma ─
function RecuperarConFirma({ form, onListo }: { form: DatosEmpresa; onListo: () => void }) {
  const [archivo,  setArchivo]  = useState<File | null>(null);
  const [clave,    setClave]    = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error,    setError]    = useState("");
  const captcha = useCaptcha();
  const archivoRef = useRef<HTMLInputElement>(null);

  const recuperar = async () => {
    if (!archivo || !clave) {
      setError("Elige tu archivo .p12 y escribe su contraseña.");
      return;
    }
    if (captcha.falta) { setError(FALTA_CAPTCHA); return; }
    setEnviando(true);
    setError("");
    let ok = false;
    try {
      const datos = new FormData();
      datos.append("datos", JSON.stringify({ ...form, captcha_token: captcha.token }));
      datos.append("password", clave);
      datos.append("file", archivo);
      await api.post("/api/v1/app/emisor/onboarding/reclamar", datos, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ok = true;
      onListo();
    } catch (err: unknown) {
      setError(detalleError(err, "No pudimos recuperar la empresa. Intenta de nuevo."));
    } finally {
      setEnviando(false);
      // Cada verificación sirve una sola vez: para reintentar hace falta otra
      if (!ok) captcha.renovar();
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-acento/35 bg-superficie p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-acento" aria-hidden />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-texto">Este RUC lo registró otra cuenta, pero aún no lo activa</p>
          <p className="text-xs leading-relaxed text-tenue">
            Si la empresa es tuya, recupérala con tu firma electrónica (.p12): si la firma es de
            este RUC, la empresa pasa a tu cuenta con la firma ya configurada. La otra cuenta pierde
            el acceso a su versión de pruebas y le avisamos por correo.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => archivoRef.current?.click()}
        className={cn(
          "flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-sm",
          archivo ? "border-acento bg-acento-suave text-acento" : "border-borde text-tenue hover:bg-presionado",
        )}
      >
        {archivo ? <FileKey size={16} aria-hidden /> : <Upload size={16} aria-hidden />}
        <span className="break-all">{archivo ? archivo.name : "Elegir mi firma (.p12)"}</span>
      </button>
      <input
        ref={archivoRef}
        type="file"
        accept=".p12,application/x-pkcs12"
        className="hidden"
        onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setError(""); }}
      />
      <Campo etiqueta="Contraseña de la firma">
        <EntradaClave
          autoComplete="off"
          enterKeyHint="done"
          value={clave}
          onChange={(e) => { setClave(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); recuperar(); } }}
        />
      </Campo>

      {error && <ErrorBox error={error} ruc={form.ruc} />}

      {captcha.widget}

      <Boton anchoCompleto tamano="lg" onClick={recuperar} cargando={enviando} icono={<ShieldCheck size={16} />}>
        {enviando ? "Verificando la firma…" : "Recuperar mi empresa"}
      </Boton>
      <p className="text-center text-xs text-sutil">
        ¿No tienes tu firma a mano?{" "}
        <a
          href={waSoporte(`Hola, el RUC ${form.ruc} aparece registrado en Kipu por otra cuenta y no tengo mi firma a mano. ¿Me pueden ayudar?`)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-acento underline underline-offset-2"
        >
          Escríbenos
        </a>
      </p>
    </section>
  );
}

// ── Caja de error — siempre con salida a soporte ──────────────────────────────
function ErrorBox({ error, ruc }: { error: string; ruc: string }) {
  const texto = error.toUpperCase().includes("REGISTRADO")
    ? `Hola, intento registrar el RUC ${ruc} en Kipu pero dice que ya está registrado. ¿Me pueden ayudar?`
    : `Hola, estoy configurando mi empresa en Kipu${ruc ? ` (RUC ${ruc})` : ""} y me sale este error: "${error}". ¿Me pueden ayudar?`;

  return (
    <div className="space-y-2 rounded-lg bg-peligro-suave px-3 py-2.5" role="alert">
      <p className="text-sm font-medium text-peligro-texto">{error}</p>
      <a
        href={waSoporte(texto)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-acento hover:opacity-80"
      >
        <MessageCircle size={13} aria-hidden /> Escríbenos por WhatsApp
      </a>
    </div>
  );
}
