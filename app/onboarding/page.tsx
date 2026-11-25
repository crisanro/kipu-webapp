"use client";
// Registrar la primera empresa: 1) datos (con el RUC se buscan solos en el SRI),
// 2) confirmar. Si el RUC está en pruebas con otra cuenta, el dueño lo recupera
// con su firma. En el celular los botones quedan fijos abajo, a mano del pulgar,
// y "Siguiente" del teclado salta al campo que sigue.

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";
import {
  Zap, Building2, CheckCircle2, Search, Loader2, MessageCircle, ShieldCheck, Upload, FileKey,
} from "lucide-react";
import { consultarRuc } from "@/lib/consultar-ruc";
import { enlaceWhatsAppFalla } from "@/lib/soporte";
import Turnstile, { TURNSTILE_ACTIVO } from "@/components/auth/Turnstile";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import ChipsFiltro from "@/components/ui/ChipsFiltro";
import { Campo, Entrada, EntradaClave } from "@/components/ui/Campo";
import { cn } from "@/components/ui/cn";

const PASOS = ["Empresa", "Confirmar"];

// ── Soporte: fallas que bloquean, para todos (lib/soporte.ts) ─────────────────
const waSoporte = (texto: string) => enlaceWhatsAppFalla(texto, auth.currentUser?.email);

const limpiarTexto = (texto: string): string => {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s\.\,\-\/\#\&]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
};

const validarRuc = (ruc: string): string | null => {
  if (ruc.length !== 13) return "El RUC debe tener 13 dígitos.";
  if (!ruc.endsWith("001")) return "El RUC debe terminar en 001.";
  if (!/^\d+$/.test(ruc)) return "El RUC solo debe contener números.";
  const provincia = parseInt(ruc.substring(0, 2));
  if ((provincia < 1 || provincia > 24) && provincia !== 30) return "Provincia inválida.";
  const tercero = parseInt(ruc[2]);
  if (tercero < 6) {
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const suma = ruc.slice(0, 9).split("").reduce((acc, d, i) => {
      const p = parseInt(d) * coef[i];
      return acc + (p >= 10 ? p - 9 : p);
    }, 0);
    const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    if (verificador !== parseInt(ruc[9])) return "El número de cédula del RUC es inválido.";
  }
  return null;
};

type FormEmpresa = {
  ruc: string; razon_social: string; nombre_comercial: string; direccion_matriz: string;
  obligado_contabilidad: string; contribuyente_especial: string;
};

function textoError(err: unknown, porDefecto: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d: { msg?: string; mensaje?: string }) => d?.msg || d?.mensaje || "").filter(Boolean);
    if (msgs.length) return msgs.join(". ");
  }
  if (detail && typeof detail === "object" && "mensaje" in detail) return String((detail as { mensaje: unknown }).mensaje);
  return porDefecto;
}

/** "Siguiente" en el teclado: al campo que sigue; en el último, envía el formulario. */
function pasarAlSiguiente(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
  const campos = [...e.currentTarget.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([disabled])")];
  const i = campos.indexOf(e.target);
  if (i >= 0 && i < campos.length - 1) { e.preventDefault(); campos[i + 1].focus(); }
}

// ── RUC registrado en pruebas por otra cuenta: el dueño lo recupera con su firma ─
function RecuperarConFirma({ form, onListo }: { form: FormEmpresa; onListo: () => void }) {
  const [archivo,  setArchivo]  = useState<File | null>(null);
  const [clave,    setClave]    = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error,    setError]    = useState("");
  const [captcha,  setCaptcha]  = useState<string | null>(null);
  const [intento,  setIntento]  = useState(0);
  const archivoRef = useRef<HTMLInputElement>(null);

  const recuperar = async () => {
    if (!archivo || !clave) {
      setError("Elige tu archivo .p12 y escribe su contraseña.");
      return;
    }
    if (TURNSTILE_ACTIVO && !captcha) {
      setError("Completa la verificación de seguridad.");
      return;
    }
    setEnviando(true);
    setError("");
    let ok = false;
    try {
      const datos = new FormData();
      datos.append("datos", JSON.stringify({ ...form, captcha_token: captcha }));
      datos.append("password", clave);
      datos.append("file", archivo);
      await api.post("/api/v1/app/emisor/onboarding/reclamar", datos, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      ok = true;
      onListo();
    } catch (err: unknown) {
      setError(textoError(err, "No pudimos recuperar la empresa. Intenta de nuevo."));
    } finally {
      setEnviando(false);
      // Cada verificación sirve una sola vez: para reintentar hace falta otra
      if (!ok) { setCaptcha(null); setIntento(n => n + 1); }
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

      <Turnstile key={intento} onToken={setCaptcha} />

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

// ── Pie de soporte — visible en todos los pasos ───────────────────────────────
function SoporteFooter({ ruc }: { ruc: string }) {
  const router = useRouter();
  const texto = `Hola, necesito ayuda para configurar mi empresa en Kipu${ruc ? ` (RUC ${ruc})` : ""}.`;
  // Al verificar el correo se llega directo aquí: es la única salida de la cuenta
  const cerrarSesion = async () => {
    await signOut(auth);
    useAuthStore.getState().logout();
    router.replace("/login");
  };
  return (
    <div className="mt-8 flex flex-col items-center gap-1 text-center">
      <a
        href={waSoporte(texto)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 text-xs text-sutil transition-colors hover:text-acento"
      >
        <MessageCircle size={13} aria-hidden />
        ¿Algo falla y no puedes continuar? Escríbenos por WhatsApp
      </a>
      <button
        type="button"
        onClick={cerrarSesion}
        className="min-h-11 px-3 text-xs text-sutil transition-colors hover:text-texto"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [paso,    setPaso]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  // El RUC está en pruebas con otra cuenta: se ofrece recuperarlo con la firma
  const [recuperar, setRecuperar] = useState(false);
  const [captcha,   setCaptcha]   = useState<string | null>(null);
  const [intentoCaptcha, setIntentoCaptcha] = useState(0);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg,     setLookupMsg]     = useState("");
  const ultimoRuc = useRef("");   // último RUC autoconsultado, para no repetir

  const [form, setForm] = useState<FormEmpresa>({
    ruc:                    "",
    razon_social:           "",
    nombre_comercial:       "",
    direccion_matriz:       "",
    obligado_contabilidad:  "NO",
    contribuyente_especial: "",
  });

  // Sin correo verificado el backend rechaza el registro: verificar primero
  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) router.replace("/bienvenida");
  }, [router]);

  const rucValido = form.ruc.length === 13 && /^\d+$/.test(form.ruc) && form.ruc.endsWith("001");

  const cambiar = (campo: keyof FormEmpresa, valor: string) => {
    setForm(f => ({ ...f, [campo]: valor }));
    setError("");
  };

  // ── Lookup RUC ─────────────────────────────────────────────────────────────
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
        : `⚠ Tu RUC figura como ${datos.estado || "no activo"} en el SRI`);
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

  const listo = () => {
    setSuccess(true);
    // Carga completa: así se leen las empresas recién creadas (con router.replace
    // el panel se quedaba cargando porque la sesión ya estaba "cargada sin empresa")
    setTimeout(() => window.location.replace("/dashboard"), 1500);
  };

  const handleSubmit = async () => {
    setError("");
    setRecuperar(false);
    if (TURNSTILE_ACTIVO && !captcha) {
      setError("Completa la verificación de seguridad.");
      return;
    }
    setLoading(true);
    let ok = false;
    try {
      await api.post("/api/v1/app/emisor/onboarding", { ...form, captcha_token: captcha });
      ok = true;
      listo();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
      const detail = res?.data?.detail;
      if (res?.status === 403 && typeof detail === "string" && /verificar tu correo/i.test(detail)) {
        router.replace("/bienvenida");
        return;
      }
      if ((detail as { codigo?: string } | undefined)?.codigo === "RUC_EN_PRUEBAS") {
        setRecuperar(true);
        return;
      }
      setError(textoError(err, "Error al registrar la empresa."));
    } finally {
      setLoading(false);
      // Cada verificación sirve una sola vez: para reintentar hace falta otra
      if (!ok) { setCaptcha(null); setIntentoCaptcha(n => n + 1); }
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo px-4" role="status">
        <div className="text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-exito-suave">
            <CheckCircle2 size={32} className="text-exito" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-texto">¡Todo listo!</h1>
          <p className="mt-1 text-sm text-tenue">Abriendo tu panel…</p>
        </div>
      </main>
    );
  }

  const tonoLookup = lookupMsg.startsWith("✓") ? "text-exito-texto"
    : lookupMsg.startsWith("⚠") ? "text-alerta-texto" : "text-sutil";

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-6 md:flex-none md:pt-12">
        <header className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-acento text-sobre-acento">
            <Zap size={24} aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-texto">Configura tu empresa</h1>
          <p className="mt-1 text-sm text-sutil">Solo toma 2 minutos</p>
        </header>

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
          <form id="form-empresa" onSubmit={continuar} onKeyDown={pasarAlSiguiente} className="space-y-4" noValidate>
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
                enterKeyHint="go"
                value={form.contribuyente_especial}
                onChange={(e) => cambiar("contribuyente_especial", e.target.value)}
              />
            </Campo>

            {error && <ErrorBox error={error} ruc={form.ruc} />}
          </form>
        )}

        {/* Paso 2 — Confirmar */}
        {paso === 1 && (
          <div className="space-y-4">
            <section className="rounded-xl border border-borde bg-superficie p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
                <Building2 size={16} className="text-acento" aria-hidden /> Resumen de tu empresa
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
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <dt className="shrink-0 text-sutil">{label}</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-texto">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {error && <ErrorBox error={error} ruc={form.ruc} />}
            {recuperar && <RecuperarConFirma form={form} onListo={listo} />}
            {!recuperar && <Turnstile key={intentoCaptcha} onToken={setCaptcha} />}
          </div>
        )}

      </div>

      {/* Botones: en el celular fijos abajo; en la compu al final del formulario */}
      <div className="sticky bottom-0 border-t border-borde bg-superficie/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:py-0 md:backdrop-blur-none">
        {/* Mismo ancho que los campos (max-w-md menos el px-4 del formulario) */}
        <div className="mx-auto flex max-w-[26rem] gap-3">
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

      {/* Soporte siempre visible */}
      <div className="mx-auto w-full max-w-md px-4 pb-6 md:pb-10">
        <SoporteFooter ruc={form.ruc} />
      </div>
    </main>
  );
}
