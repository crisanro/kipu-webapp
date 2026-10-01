"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Search, Mail, ShieldCheck, KeyRound, Copy, Check,
  MessageCircle, AlertTriangle, ExternalLink, Building2,
  CheckCircle2, XCircle, LifeBuoy, RotateCw, ChevronRight
} from "lucide-react";

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

// 0991234567 → 593991234567
const waNumero = (num?: string | null) => {
  if (!num) return "";
  const d = num.replace(/\D/g, "");
  return d.startsWith("0") ? `593${d.slice(1)}` : d;
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
      <span className="text-xs shrink-0" style={{ color: "var(--kipu-subtle)" }}>{label}</span>
      <span className="text-xs text-right break-all" style={{ color: "var(--kipu-text)" }}>{children}</span>
    </div>
  );
}

function SiNo({ ok, si = "Sí", no = "No" }: { ok: boolean; si?: string; no?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1" style={{ color: "var(--kipu-success)" }}>
      <CheckCircle2 size={12} /> {si}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1" style={{ color: "var(--kipu-danger)" }}>
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
  const [copiado,    setCopiado]    = useState(false);
  const [verifOpen,  setVerifOpen]  = useState(false);
  const [motivo,     setMotivo]     = useState("");

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
      setCopiado(false);
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

  const copiar = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

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
          <LifeBuoy size={16} style={{ color: "var(--kipu-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Buscar cuenta</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--kipu-subtle)" }} />
            <input
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") buscar(); }}
              placeholder="Correo completo, parte del correo o nombre"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
              style={{
                background: "var(--kipu-surface)",
                border: "1px solid var(--kipu-border)",
                color: "var(--kipu-text)",
              }}
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
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-danger) 40%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-xs break-all" style={{ color: "var(--kipu-text)" }}>{error}</p>
        </div>
      )}

      {/* Éxito */}
      {mensaje && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            background: "color-mix(in srgb, var(--kipu-success) 10%, transparent)",
            border:     "1px solid color-mix(in srgb, var(--kipu-success) 40%, transparent)",
          }}
        >
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-success)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-text)" }}>{mensaje}</p>
        </div>
      )}

      {/* Lista de coincidencias */}
      {lista && (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--kipu-border)" }}
          >
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
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
            <p className="text-sm text-center py-8" style={{ color: "var(--kipu-subtle)" }}>
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
                    <p className="text-sm font-mono truncate" style={{ color: "var(--kipu-text)" }}>{r.email}</p>
                    <p className="text-xs truncate" style={{ color: "var(--kipu-subtle)" }}>
                      {r.nombre || "Sin nombre"} · {fmtFecha(r.creado)}
                    </p>
                  </div>
                  <EstadoBadge estado={r.estado} />
                  <ChevronRight size={14} className="shrink-0" style={{ color: "var(--kipu-subtle)" }} />
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
              <p className="text-sm font-mono truncate" style={{ color: "var(--kipu-text)" }}>{resultado.email}</p>
              <EstadoBadge estado={resultado.estado} />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--kipu-subtle)" }}>
              {ESTADOS[resultado.estado]?.desc}
            </p>
          </div>

          {resultado.estado !== "no_existe" && (
            <div className="grid md:grid-cols-2 gap-3">

              {/* Firebase */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--kipu-subtle)" }}>
                  Firebase
                </p>
                {fb ? (
                  <div style={{ borderTop: "1px solid var(--kipu-border)" }} className="pt-1">
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
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>No existe en Firebase.</p>
                )}
              </div>

              {/* Kipu */}
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--kipu-subtle)" }}>
                  Kipu
                </p>
                {profile ? (
                  <div style={{ borderTop: "1px solid var(--kipu-border)" }} className="pt-1">
                    <Dato label="Nombre">{profile.nombre || "—"}</Dato>
                    <Dato label="WhatsApp">
                      {profile.whatsapp_number ? (
                        <a
                          href={`https://wa.me/${waNumero(profile.whatsapp_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--kipu-accent)" }}
                        >
                          {profile.whatsapp_number}
                        </a>
                      ) : "—"}
                    </Dato>
                    <Dato label="Perfil creado">{fmtFechaHora(profile.created_at)}</Dato>
                    <div className="pt-2 space-y-1">
                      <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Empresas</span>
                      {resultado.emisores?.length ? (
                        resultado.emisores.map((e: any) => (
                          <Link
                            key={e.emisor_id}
                            href={`/admin/emisores/${e.emisor_id}`}
                            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md"
                            style={{ background: "color-mix(in srgb, var(--kipu-text) 6%, transparent)", color: "var(--kipu-text)" }}
                          >
                            <Building2 size={12} style={{ color: "var(--kipu-subtle)" }} />
                            <span className="truncate flex-1">{e.nombre}</span>
                            <span style={{ color: "var(--kipu-subtle)" }}>{e.rol}</span>
                          </Link>
                        ))
                      ) : (
                        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Sin empresa</p>
                      )}
                    </div>
                    <Link
                      href={`/admin/usuarios/${profile.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium mt-3"
                      style={{ color: "var(--kipu-accent)" }}
                    >
                      Ver detalle del usuario <ExternalLink size={11} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    No tiene perfil en Kipu todavía.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          {fb && (
            <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kipu-subtle)" }}>
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{
                      background: "color-mix(in srgb, var(--kipu-warning) 15%, transparent)",
                      border:     "1px solid color-mix(in srgb, var(--kipu-warning) 40%, transparent)",
                      color:      "var(--kipu-warning)",
                    }}
                  >
                    <ShieldCheck size={13} />
                    Verificar manualmente
                  </button>
                )}
                {!puedeVerif && !esPassword && (
                  <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
                    Correo verificado y acceso con Google. No hay acciones de acceso pendientes.
                  </p>
                )}
              </div>

              {/* Verificación manual */}
              {verifOpen && (
                <div
                  className="rounded-lg p-3 space-y-2"
                  style={{ border: "1px solid color-mix(in srgb, var(--kipu-warning) 40%, transparent)" }}
                >
                  <p className="text-xs" style={{ color: "var(--kipu-text)" }}>
                    Solo si confirmaste que la persona es dueña del correo (por llamada o WhatsApp).
                    Queda registrado en auditoría.
                  </p>
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo: ej. confirmado por WhatsApp, no le llega el correo"
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={{
                      background: "var(--kipu-surface)",
                      border: "1px solid var(--kipu-border)",
                      color: "var(--kipu-text)",
                    }}
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

              {/* Link generado — respaldo por WhatsApp */}
              {link && (
                <div
                  className="rounded-lg p-3 space-y-2"
                  style={{ background: "color-mix(in srgb, var(--kipu-accent) 8%, transparent)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                    {link.tipo === "verificacion" ? "Link de verificación" : "Link para restablecer contraseña"}
                    <span className="font-normal" style={{ color: "var(--kipu-subtle)" }}>
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
                      href={`https://wa.me/${waNumero(profile?.whatsapp_number)}?text=${encodeURIComponent(textoWa)}`}
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