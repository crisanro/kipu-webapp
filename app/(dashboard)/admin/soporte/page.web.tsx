"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Mail, ShieldCheck, KeyRound, Copy, Check,
  MessageCircle, AlertTriangle, ExternalLink, Building2,
  CheckCircle2, XCircle, LifeBuoy, RotateCw, ChevronRight,
  AtSign
} from "lucide-react";
import { enlaceWhatsAppA } from "@/lib/soporte";
import { useCopiar } from "@/lib/useCopiar";

// ── Estados del embudo ─────────────────────────────────────────────────────────
const ESTADOS: Record<string, { label: string; desc: string; color: string }> = {
  no_existe:     { label: "No existe",           color: "var(--kipu-subtle)",
                   desc: "No hay ninguna cuenta con ese correo, ni en Firebase ni en Kipu." },
  solo_firebase: { label: "Registro incompleto", color: "var(--kipu-danger)",
                   desc: "Se registró pero nunca entró a Kipu. Casi siempre es porque no verificó el correo." },
  solo_db:       { label: "Inconsistencia",      color: "var(--kipu-danger)",
                   desc: "Tiene perfil en Kipu pero no existe en Firebase. Revisar manualmente." },
  sin_verificar: { label: "Sin verificar",       color: "var(--kipu-warning)",
                   desc: "Tiene perfil pero el correo no está verificado." },
  sin_empresa:   { label: "Sin empresa",         color: "var(--kipu-warning)",
                   desc: "Verificado, pero no completó el onboarding." },
  activo:        { label: "Activo",              color: "var(--kipu-success)",
                   desc: "Cuenta verificada y con empresa." },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmtFecha = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const fmtFechaHora = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const errMsg = (e: any) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : d ? JSON.stringify(d) : e?.message ?? "Error desconocido";
};

const cardStyle = {
  background: "var(--kipu-surface)",
  border:     "1px solid var(--kipu-border)",
};

const btnSecStyle = {
  background: "var(--kipu-surface)",
  border:     "1px solid var(--kipu-border)",
  color:      "var(--kipu-text)",
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADOS[estado] ?? ESTADOS.no_existe;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{
        background: `color-mix(in srgb, ${cfg.color} 20%, transparent)`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs shrink-0 text-sutil">{label}</span>
      <span className="text-xs text-right break-all text-texto">{children}</span>
    </div>
  );
}

function SiNo({ ok, si = "Sí", no = "No" }: { ok: boolean; si?: string; no?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-exito">
      <CheckCircle2 size={12} /> {si}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-peligro">
      <XCircle size={12} /> {no}
    </span>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function AdminSoportePage() {
  const router = useRouter();

  const [termino,    setTermino]    = useState("");
  const [buscando,   setBuscando]   = useState(false);
  const [lista,      setLista]      = useState<any[] | null>(null);
  const [listaTotal, setListaTotal] = useState(0);
  const [cacheTs,    setCacheTs]    = useState<string | null>(null);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [mensaje,    setMensaje]    = useState<string | null>(null);
  const [accion,     setAccion]     = useState<string | null>(null);
  const [link,       setLink]       = useState<{ tipo: "verificacion" | "password"; url: string } | null>(null);
  const { copiar: copiarTexto, copiado: textoCopiado } = useCopiar();
  const copiado = !!link && textoCopiado === link.url;
  const [verifOpen,  setVerifOpen]  = useState(false);
  const [motivo,     setMotivo]     = useState("");

  // ── Cambio de correo ──
  const [emailOpen,    setEmailOpen]    = useState(false);
  const [nuevoEmail,   setNuevoEmail]   = useState("");
  const [emailMotivo,  setEmailMotivo]  = useState("");

  const manejarError = (e: any, prefijo = "") => {
    if (e?.response?.status === 403) {
      router.replace("/dashboard");
      return;
    }
    const status = e?.response?.status;
    setError(`${prefijo}${status ? `Error ${status}: ` : ""}${errMsg(e)}`);
  };

  const limpiarDetalle = () => {
    setLink(null);
    setVerifOpen(false);
    setMotivo("");
    setEmailOpen(false);
    setNuevoEmail("");
    setEmailMotivo("");
  };

  // ── Detalle exacto ──────────────────────────────────────────────────────────
  const cargarDetalle = async (email: string, conservarMensaje = false) => {
    setBuscando(true);
    setError(null);
    if (!conservarMensaje) setMensaje(null);
    limpiarDetalle();
    try {
      const res = await api.get("/api/v1/admin/panel/soporte/buscar", { params: { email } });
      setResultado(res.data.data);
    } catch (e: any) {
      setResultado(null);
      manejarError(e);
    } finally {
      setBuscando(false);
    }
  };

  // ── Coincidencias ───────────────────────────────────────────────────────────
  const cargarCoincidencias = async (q: string, refrescar = false) => {
    setBuscando(true);
    setError(null);
    setMensaje(null);
    setResultado(null);
    limpiarDetalle();
    try {
      const res = await api.get("/api/v1/admin/panel/soporte/coincidencias", {
        params: { q, refrescar },
      });
      setLista(res.data.data ?? []);
      setListaTotal(res.data.total ?? 0);
      setCacheTs(res.data.cache_ts ?? null);
    } catch (e: any) {
      setLista(null);
      manejarError(e);
    } finally {
      setBuscando(false);
    }
  };

  const buscar = () => {
    const valor = termino.trim();
    if (valor.length < 2) return;
    if (EMAIL_RE.test(valor)) {
      setLista(null);
      cargarDetalle(valor);
    } else {
      cargarCoincidencias(valor);
    }
  };

  // ── Acciones ────────────────────────────────────────────────────────────────
  const enviarLink = async (tipo: "verificacion" | "password") => {
    if (!resultado) return;
    setAccion(tipo);
    setError(null);
    setMensaje(null);
    try {
      const path = tipo === "verificacion" ? "link-verificacion" : "link-password";
      const res  = await api.post(`/api/v1/admin/panel/soporte/${path}`, {
        email:  resultado.email,
        enviar: true,
      });
      setLink({ tipo, url: res.data.link });
      if (res.data.enviado) {
        setMensaje(`Correo enviado a ${resultado.email}.`);
      } else {
        setError(
          `El link se generó pero no se pudo enviar el correo` +
          (res.data.envio_error ? `: ${res.data.envio_error}` : ".") +
          " Puedes copiarlo o mandarlo por WhatsApp."
        );
      }
    } catch (e: any) {
      manejarError(e);
    } finally {
      setAccion(null);
    }
  };

  const verificarManual = async () => {
    if (!resultado || motivo.trim().length < 5) return;
    setAccion("verificar");
    setError(null);
    try {
      const res = await api.post("/api/v1/admin/panel/soporte/verificar", {
        email:  resultado.email,
        motivo: motivo.trim(),
      });
      setMensaje(res.data.mensaje);
      await cargarDetalle(resultado.email, true);
    } catch (e: any) {
      manejarError(e);
    } finally {
      setAccion(null);
    }
  };

  const cambiarCorreo = async () => {
    if (!resultado) return;
    const nuevo = nuevoEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(nuevo)) { setError("El correo nuevo no es válido."); return; }
    if (nuevo === resultado.email) { setError("El correo nuevo es igual al actual."); return; }
    if (emailMotivo.trim().length < 5) { setError("Escribe un motivo (mínimo 5 caracteres)."); return; }

    setAccion("cambiar-email");
    setError(null);
    setMensaje(null);
    try {
      const res = await api.post("/api/v1/admin/panel/soporte/cambiar-correo", {
        email_actual: resultado.email,
        email_nuevo:  nuevo,
        motivo:       emailMotivo.trim(),
      });
      setMensaje(res.data.mensaje || `Correo actualizado a ${nuevo}.`);
      // Recargar detalle con el nuevo correo
      setTermino(nuevo);
      await cargarDetalle(nuevo, true);
    } catch (e: any) {
      manejarError(e);
    } finally {
      setAccion(null);
    }
  };

  const copiar = () => { if (link) copiarTexto(link.url); };

  const fb         = resultado?.firebase;
  const profile    = resultado?.profile;
  const esPassword = fb?.providers?.includes("password");
  const puedeVerif = fb && !fb.email_verified;

  const textoWa = link
    ? link.tipo === "verificacion"
      ? `Hola, te comparto el enlace para verificar tu correo en Kipu: ${link.url}`
      : `Hola, te comparto el enlace para restablecer tu contraseña de Kipu: ${link.url}`
    : "";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

      {/* Buscador */}
      <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center gap-2">
          <LifeBuoy className="text-acento" size={16} />
          <p className="text-sm font-medium text-texto">Buscar cuenta</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sutil" />
            <input
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
              placeholder="Correo completo, parte del correo o nombre"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors bg-superficie border border-borde text-texto"
              onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
              onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
            />
          </div>
          <button
            type="button"
            onClick={buscar}
            disabled={buscando || termino.trim().length < 2}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{
              background: "var(--kipu-accent)",
              opacity: buscando || termino.trim().length < 2 ? 0.6 : 1,
            }}
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>
          Correo completo → detalle directo. Texto parcial → lista de coincidencias.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 bg-peligro-suave border border-peligro/40"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-peligro" />
          <p className="text-xs break-all text-texto">{error}</p>
        </div>
      )}

      {/* Éxito */}
      {mensaje && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 bg-exito/10 border border-exito/40"
        >
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-exito" />
          <p className="text-sm text-texto">{mensaje}</p>
        </div>
      )}

      {/* Lista de coincidencias */}
      {lista && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b border-borde"
          >
            <p className="text-xs text-sutil">
              {listaTotal} coincidencia{listaTotal === 1 ? "" : "s"}
              {listaTotal > lista.length && ` · mostrando ${lista.length}`}
            </p>
            <button
              type="button"
              onClick={() => cargarCoincidencias(termino.trim(), true)}
              disabled={buscando}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: "var(--kipu-subtle)" }}
              title={cacheTs ? `Datos de Firebase al ${fmtFechaHora(cacheTs)}` : undefined}
            >
              <RotateCw size={11} /> Actualizar desde Firebase
            </button>
          </div>

          {lista.length === 0 ? (
            <p className="text-sm text-center py-8 text-sutil">
              Sin coincidencias
            </p>
          ) : (
            lista.map((r, idx) => {
              const activo = resultado?.email === r.email;
              return (
                <button
                  key={r.email + idx}
                  type="button"
                  onClick={() => cargarDetalle(r.email)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    borderTop:  idx > 0 ? "1px solid var(--kipu-border)" : "none",
                    background: activo ? "color-mix(in srgb, var(--kipu-accent) 8%, transparent)" : "transparent",
                  }}
                  onMouseEnter={ev => { if (!activo) ev.currentTarget.style.background = "color-mix(in srgb, var(--kipu-text) 4%, transparent)"; }}
                  onMouseLeave={ev => { if (!activo) ev.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate text-texto">{r.email}</p>
                    <p className="text-xs truncate text-sutil">
                      {r.nombre || "Sin nombre"} · {fmtFecha(r.creado)}
                    </p>
                  </div>
                  <EstadoBadge estado={r.estado} />
                  <ChevronRight size={14} className="shrink-0 text-sutil" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Detalle */}
      {resultado && (
        <>
          {/* Estado */}
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-mono truncate text-texto">{resultado.email}</p>
              <EstadoBadge estado={resultado.estado} />
            </div>
            <p className="text-xs mt-2 text-sutil">
              {ESTADOS[resultado.estado]?.desc}
            </p>
          </div>

          {resultado.estado !== "no_existe" && (
            <div className="grid md:grid-cols-2 gap-3">

              {/* Firebase */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-sutil">
                  Firebase
                </p>
                {fb ? (
                  <div className="pt-1 border-t border-borde">
                    <Dato label="Correo verificado"><SiNo ok={fb.email_verified} /></Dato>
                    <Dato label="Cuenta habilitada"><SiNo ok={!fb.disabled} /></Dato>
                    <Dato label="Proveedor">
                      {fb.providers?.map((p: string) =>
                        p === "password" ? "Email/contraseña" : p === "google.com" ? "Google" : p
                      ).join(", ") || "—"}
                    </Dato>
                    <Dato label="Registro">{fmtFechaHora(fb.creado)}</Dato>
                    <Dato label="Último login">{fmtFechaHora(fb.ultimo_login)}</Dato>
                    <Dato label="UID"><span className="font-mono">{fb.uid}</span></Dato>
                  </div>
                ) : (
                  <p className="text-xs text-sutil">No existe en Firebase.</p>
                )}
              </div>

              {/* Kipu */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-sutil">
                  Kipu
                </p>
                {profile ? (
                  <div className="pt-1 border-t border-borde">
                    <Dato label="Nombre">{profile.nombre || "—"}</Dato>
                    <Dato label="WhatsApp">
                      {profile.whatsapp_number ? (
                        <a className="text-acento"
                          href={enlaceWhatsAppA(profile.whatsapp_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {profile.whatsapp_number}
                        </a>
                      ) : "—"}
                    </Dato>
                    <Dato label="Perfil creado">{fmtFechaHora(profile.created_at)}</Dato>
                    <div className="pt-2 space-y-1">
                      <span className="text-xs text-sutil">Empresas</span>
                      {resultado.emisores?.length ? (
                        resultado.emisores.map((e: any) => (
                          <Link
                            key={e.emisor_id}
                            href={`/admin/emisores/${e.emisor_id}`}
                            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-presionado text-texto"
                          >
                            <Building2 className="text-sutil" size={12} />
                            <span className="truncate flex-1">{e.nombre}</span>
                            <span className="text-sutil">{e.rol}</span>
                          </Link>
                        ))
                      ) : (
                        <p className="text-xs text-sutil">Sin empresa</p>
                      )}
                    </div>
                    <Link
                      href={`/admin/usuarios/${profile.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium mt-3 text-acento"
                    >
                      Ver detalle del usuario <ExternalLink size={11} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-sutil">
                    No tiene perfil en Kipu todavía.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          {fb && (
            <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide text-sutil">
                Acciones de soporte
              </p>

              <div className="flex flex-wrap gap-2">
                {puedeVerif && (
                  <button
                    type="button"
                    onClick={() => enviarLink("verificacion")}
                    disabled={!!accion}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ background: "var(--kipu-accent)", opacity: accion ? 0.6 : 1 }}
                  >
                    <Mail size={13} />
                    {accion === "verificacion" ? "Enviando..." : "Enviar verificación por correo"}
                  </button>
                )}
                {esPassword && (
                  <button
                    type="button"
                    onClick={() => enviarLink("password")}
                    disabled={!!accion}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ ...btnSecStyle, opacity: accion ? 0.6 : 1 }}
                  >
                    <KeyRound size={13} />
                    {accion === "password" ? "Enviando..." : "Enviar cambio de contraseña"}
                  </button>
                )}
                {puedeVerif && (
                  <button
                    type="button"
                    onClick={() => setVerifOpen(v => !v)}
                    disabled={!!accion}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-alerta/15 border border-alerta/40 text-alerta"
                  >
                    <ShieldCheck size={13} />
                    Verificar manualmente
                  </button>
                )}

                {/* Cambiar correo — siempre disponible si tiene Firebase */}
                <button
                  type="button"
                  onClick={() => setEmailOpen(v => !v)}
                  disabled={!!accion}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{ ...btnSecStyle, opacity: accion ? 0.6 : 1 }}
                >
                  <AtSign size={13} />
                  Cambiar correo
                </button>

                {!puedeVerif && !esPassword && !emailOpen && (
                  <p className="text-xs text-sutil">
                    Correo verificado y acceso con Google. No hay acciones de acceso pendientes.
                  </p>
                )}
              </div>

              {/* Verificación manual */}
              {verifOpen && (
                <div
                  className="rounded-lg p-3 space-y-2 border border-alerta/40"
                >
                  <p className="text-xs text-texto">
                    Solo si confirmaste que la persona es dueña del correo (por llamada o WhatsApp).
                    Queda registrado en auditoría.
                  </p>
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo: ej. confirmado por WhatsApp, no le llega el correo"
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none bg-superficie border border-borde text-texto"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setVerifOpen(false); setMotivo(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={btnSecStyle}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={verificarManual}
                      disabled={motivo.trim().length < 5 || accion === "verificar"}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{
                        background: "var(--kipu-warning)",
                        opacity: motivo.trim().length < 5 || accion === "verificar" ? 0.5 : 1,
                      }}
                    >
                      {accion === "verificar" ? "Verificando..." : "Confirmar verificación"}
                    </button>
                  </div>
                </div>
              )}

              {/* Cambiar correo */}
              {emailOpen && (
                <div
                  className="rounded-lg p-3 space-y-2 border border-borde"
                >
                  <p className="text-xs text-texto">
                    Actualiza el correo en Firebase y en Kipu. El nuevo correo queda verificado automáticamente.
                    Queda registrado en auditoría.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] mb-1 block" style={{ color: "var(--kipu-subtle)" }}>
                        Correo actual
                      </label>
                      <p className="text-xs font-mono px-3 py-2 rounded-lg bg-texto/4 text-sutil">
                        {resultado.email}
                      </p>
                    </div>
                    <div>
                      <label className="text-[11px] mb-1 block" style={{ color: "var(--kipu-subtle)" }}>
                        Correo nuevo
                      </label>
                      <input
                        value={nuevoEmail}
                        onChange={(e) => setNuevoEmail(e.target.value)}
                        placeholder="nuevo@correo.com"
                        type="email"
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none bg-superficie border border-borde text-texto"
                        onFocus={e => e.currentTarget.style.borderColor = "var(--kipu-accent)"}
                        onBlur={e => e.currentTarget.style.borderColor = "var(--kipu-border)"}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] mb-1 block" style={{ color: "var(--kipu-subtle)" }}>
                        Motivo del cambio
                      </label>
                      <input
                        value={emailMotivo}
                        onChange={(e) => setEmailMotivo(e.target.value)}
                        placeholder="Ej: cliente solicitó cambio por WhatsApp, correo anterior no tiene acceso"
                        className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none bg-superficie border border-borde text-texto"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => { setEmailOpen(false); setNuevoEmail(""); setEmailMotivo(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={btnSecStyle}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={cambiarCorreo}
                      disabled={
                        !EMAIL_RE.test(nuevoEmail.trim()) ||
                        emailMotivo.trim().length < 5 ||
                        accion === "cambiar-email"
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{
                        background: "var(--kipu-accent)",
                        opacity:
                          !EMAIL_RE.test(nuevoEmail.trim()) ||
                          emailMotivo.trim().length < 5 ||
                          accion === "cambiar-email"
                            ? 0.5 : 1,
                      }}
                    >
                      {accion === "cambiar-email" ? "Actualizando..." : "Confirmar cambio"}
                    </button>
                  </div>
                </div>
              )}

              {/* Link generado — respaldo por WhatsApp */}
              {link && (
                <div
                  className="rounded-lg p-3 space-y-2 bg-acento/8"
                >
                  <p className="text-xs font-medium text-texto">
                    {link.tipo === "verificacion" ? "Link de verificación" : "Link para restablecer contraseña"}
                    <span className="font-normal text-sutil">
                      {" "}· si no le llega el correo, mándalo por WhatsApp
                    </span>
                  </p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "var(--kipu-subtle)" }}>
                    {link.url}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copiar}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={btnSecStyle}
                    >
                      {copiado ? <Check size={12} /> : <Copy size={12} />}
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                    <a
                      href={enlaceWhatsAppA(profile?.whatsapp_number, textoWa)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={btnSecStyle}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}