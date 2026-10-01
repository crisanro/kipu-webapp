"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Mail, Send, Plug, CheckCircle2, XCircle, AlertTriangle,
  RotateCw, ExternalLink, Loader2, Info, MinusCircle
} from "lucide-react";

const cardStyle = {
  background: "var(--kipu-surface)",
  border:     "1px solid var(--kipu-border)",
};

const btnSecStyle = {
  background: "var(--kipu-surface)",
  border:     "1px solid var(--kipu-border)",
  color:      "var(--kipu-text)",
};

const inputStyle = {
  background: "var(--kipu-surface)",
  border:     "1px solid var(--kipu-border)",
  color:      "var(--kipu-text)",
};

const PASO_LABEL: Record<string, string> = {
  conexion: "Conexión al servidor",
  tls:      "Cifrado TLS",
  login:    "Autenticación",
  envio:    "Envío del correo",
};

const errMsg = (e: any) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : d ? JSON.stringify(d) : e?.message ?? "Error desconocido";
};

function Estado({ ok }: { ok: boolean | null | undefined }) {
  if (ok === null || ok === undefined) {
    return <MinusCircle size={14} style={{ color: "var(--kipu-subtle)" }} />;
  }
  return ok
    ? <CheckCircle2 size={14} style={{ color: "var(--kipu-success)" }} />
    : <XCircle size={14} style={{ color: "var(--kipu-danger)" }} />;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs shrink-0" style={{ color: "var(--kipu-subtle)" }}>{label}</span>
      <span className="text-xs text-right break-all" style={{ color: "var(--kipu-text)" }}>{children}</span>
    </div>
  );
}

function DnsFila({ nombre, info, ayuda }: { nombre: string; info: any; ayuda: string }) {
  return (
    <div className="py-2" style={{ borderTop: "1px solid var(--kipu-border)" }}>
      <div className="flex items-center gap-2">
        <Estado ok={info ? info.ok : null} />
        <span className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>{nombre}</span>
        <span className="text-[11px]" style={{ color: "var(--kipu-subtle)" }}>· {ayuda}</span>
      </div>
      {info && (
        <p className="text-[11px] mt-1 ml-6 font-mono break-all" style={{ color: "var(--kipu-subtle)" }}>
          {info.registro || info.detalle}
        </p>
      )}
    </div>
  );
}

export default function AdminDiagnosticoPage() {
  const router = useRouter();

  const [config,     setConfig]     = useState<any>(null);
  const [cargando,   setCargando]   = useState(true);
  const [selector,   setSelector]   = useState("");
  const [destino,    setDestino]    = useState("");
  const [probando,   setProbando]   = useState<"conexion" | "envio" | null>(null);
  const [resultado,  setResultado]  = useState<any>(null);
  const [error,      setError]      = useState<string | null>(null);

  const manejarError = (e: any) => {
    if (e?.response?.status === 403) {
      router.replace("/dashboard");
      return;
    }
    const status = e?.response?.status;
    setError(status ? `Error ${status}: ${errMsg(e)}` : errMsg(e));
  };

  const cargarConfig = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/admin/panel/diagnostico/correo/config", {
        params: selector.trim() ? { dkim_selector: selector.trim() } : {},
      });
      setConfig(res.data.data);
    } catch (e: any) {
      manejarError(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarConfig(); }, []);

  const probar = async (soloConexion: boolean) => {
    setProbando(soloConexion ? "conexion" : "envio");
    setError(null);
    setResultado(null);
    try {
      const res = await api.post("/api/v1/admin/panel/diagnostico/correo/probar", {
        destino:       soloConexion ? null : destino.trim(),
        solo_conexion: soloConexion,
      });
      setResultado(res.data.data);
    } catch (e: any) {
      manejarError(e);
    } finally {
      setProbando(null);
    }
  };

  const destinoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino.trim());

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

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

      {/* Configuración */}
      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mail size={16} style={{ color: "var(--kipu-accent)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Configuración de correo</p>
          </div>
          <button
            type="button"
            onClick={cargarConfig}
            disabled={cargando}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--kipu-subtle)" }}
          >
            <RotateCw size={11} className={cargando ? "animate-spin" : ""} /> Revisar de nuevo
          </button>
        </div>

        {cargando && !config ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--kipu-accent)" }} />
          </div>
        ) : config ? (
          <>
            <div style={{ borderTop: "1px solid var(--kipu-border)" }} className="pt-1">
              <Fila label="Estado">
                <span className="inline-flex items-center gap-1">
                  <Estado ok={config.habilitado} />
                  {config.habilitado ? "Habilitado" : "SMTP no configurado"}
                </span>
              </Fila>
              <Fila label="Servidor">{config.host}:{config.port} ({config.modo})</Fila>
              <Fila label="Usuario SMTP">{config.usuario || "—"}</Fila>
              <Fila label="Remitente (From)">{config.remitente || "—"}</Fila>
              <Fila label="Dominio alineado">
                <span className="inline-flex items-center gap-1">
                  <Estado ok={config.alineado} />
                  {config.alineado === null
                    ? "—"
                    : config.alineado
                      ? config.dominio_from
                      : `${config.dominio_from} ≠ ${config.dominio_user}`}
                </span>
              </Fila>
            </div>

            {config.alineado === false && (
              <p
                className="text-[11px] mt-2 rounded-lg px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--kipu-warning) 12%, transparent)",
                  color: "var(--kipu-text)",
                }}
              >
                El remitente es de un dominio distinto a la cuenta SMTP. Gmail y Outlook suelen
                mandar estos correos a spam si el SPF/DKIM del dominio remitente no autoriza a ese servidor.
              </p>
            )}

            {/* DNS */}
            {config.dns && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--kipu-subtle)" }}>
                  DNS de {config.dominio_from}
                </p>
                <DnsFila nombre="SPF"   info={config.dns.spf}   ayuda="qué servidores pueden enviar por tu dominio" />
                <DnsFila nombre="DMARC" info={config.dns.dmarc} ayuda="política ante correos no autenticados" />
                <DnsFila
                  nombre="DKIM"
                  info={config.dns.dkim}
                  ayuda={config.dns.dkim ? "firma criptográfica del correo" : "indica el selector abajo para revisarlo"}
                />
                <div className="flex gap-2 mt-2">
                  <input
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    placeholder="Selector DKIM (ej. default, google, zmail)"
                    className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={cargarConfig}
                    disabled={cargando || !selector.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ ...btnSecStyle, opacity: cargando || !selector.trim() ? 0.5 : 1 }}
                  >
                    Revisar DKIM
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Prueba */}
      <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Send size={16} style={{ color: "var(--kipu-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Probar envío</p>
        </div>

        <input
          type="email"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && destinoValido && !probando) probar(false); }}
          placeholder="correo@destino.com"
          className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
          style={inputStyle}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => probar(true)}
            disabled={!!probando}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ ...btnSecStyle, opacity: probando ? 0.6 : 1 }}
          >
            {probando === "conexion" ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
            Probar conexión (sin enviar)
          </button>
          <button
            type="button"
            onClick={() => probar(false)}
            disabled={!!probando || !destinoValido}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: "var(--kipu-accent)", opacity: probando || !destinoValido ? 0.5 : 1 }}
          >
            {probando === "envio" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar correo de prueba
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div
            className="rounded-lg p-3 space-y-2"
            style={{
              background: resultado.ok
                ? "color-mix(in srgb, var(--kipu-success) 8%, transparent)"
                : "color-mix(in srgb, var(--kipu-danger) 8%, transparent)",
            }}
          >
            {resultado.pasos.map((p: any) => (
              <div key={p.paso} className="flex items-start gap-2">
                <span className="mt-0.5"><Estado ok={p.ok} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: "var(--kipu-text)" }}>
                    {PASO_LABEL[p.paso] ?? p.paso}
                    <span className="font-normal" style={{ color: "var(--kipu-subtle)" }}> · {p.ms} ms</span>
                  </p>
                  <p className="text-[11px] break-all" style={{ color: "var(--kipu-subtle)" }}>{p.detalle}</p>
                </div>
              </div>
            ))}

            {resultado.ok && resultado.codigo && (
              <div
                className="rounded-lg px-3 py-2 mt-1"
                style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
              >
                <p className="text-xs" style={{ color: "var(--kipu-text)" }}>
                  Busca en <strong>{resultado.destino}</strong> un correo con el código{" "}
                  <span className="font-mono font-bold">{resultado.codigo}</span>.
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--kipu-subtle)" }}>
                  Si no está en Recibidos en 2–3 minutos, revisa Spam o Correo no deseado.
                  Si tampoco está ahí, el servidor de destino lo bloqueó: revisa SPF/DKIM/DMARC arriba.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guía de entrega */}
      <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Info size={16} style={{ color: "var(--kipu-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>¿Llega a la bandeja o a spam?</p>
        </div>
        <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
          Que el servidor acepte el correo no garantiza que llegue a la bandeja. Para medirlo:
        </p>
        <ol className="text-xs space-y-1 list-decimal ml-4" style={{ color: "var(--kipu-text)" }}>
          <li>Abre mail-tester.com y copia la dirección que te muestra.</li>
          <li>Pégala arriba y envía el correo de prueba.</li>
          <li>Vuelve a mail-tester y revisa tu puntaje (ideal 9/10 o más) y qué te falta.</li>
          <li>Prueba también con una cuenta de Gmail y otra de Hotmail/Outlook, que filtran distinto.</li>
        </ol>
        <a
          href="https://www.mail-tester.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: "var(--kipu-accent)" }}
        >
          Abrir mail-tester.com <ExternalLink size={11} />
        </a>
      </div>

    </div>
  );
}