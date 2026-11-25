"use client";
import { Puzzle, Play, ArrowRight, Download, Globe, Monitor, Send } from "lucide-react";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { compartir } from "@/lib/nativo";
import { useAvisos } from "@/components/ui/Avisos";
import Boton from "@/components/ui/Boton";

interface Props {
  empresa: any;
  onDone:  () => void;
}

// ID del video tutorial en YouTube. Mientras sea null, la sección del video no se muestra.
const VIDEO_ID: string | null = null;
const CHROME_EXT_URL  = "https://chromewebstore.google.com/detail/kipu-%E2%80%94-importador-sri/fpaeflibkbihlpdkfbpniminocmplplo";
const FIREFOX_EXT_URL = "https://addons.mozilla.org/es-ES/firefox/addon/kipu-importador-sri/";

function ContenidoSRI({ empresa, onDone }: Props) {
  return (
    <div className="space-y-5">

      {/* Hero */}
      <div
        className="rounded-xl p-5 text-center space-y-2"
        style={{
          background: "color-mix(in srgb, var(--kipu-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
          style={{
            background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
          }}
        >
          <Download size={22} style={{ color: "var(--kipu-accent)" }} />
        </div>
        <h2 className="font-bold text-base" style={{ color: "var(--kipu-text)" }}>
          Kipu Importador SRI
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--kipu-subtle)" }}>
          Instala la extensión y descarga tus documentos recibidos del portal del SRI
          directo a Kipu — sin descargar archivos ni copiar datos.
        </p>
      </div>

      {/* Botones descarga */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
          Instalar extensión
        </p>
        <a
          href={CHROME_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors group"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--kipu-accent) 40%, transparent)";
            e.currentTarget.style.background = "color-mix(in srgb, var(--kipu-accent) 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--kipu-border)";
            e.currentTarget.style.background = "var(--kipu-surface)";
          }}
        >
          <Globe size={20} className="transition-colors shrink-0" style={{ color: "var(--kipu-subtle)" }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Google Chrome</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Chrome Web Store</p>
          </div>
          <ArrowRight size={14} className="transition-colors" style={{ color: "var(--kipu-subtle)" }} />
        </a>
        <a
          href={FIREFOX_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors group"
          style={{
            background: "var(--kipu-surface)",
            border: "1px solid var(--kipu-border)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "color-mix(in srgb, #f97316 40%, transparent)";
            e.currentTarget.style.background = "color-mix(in srgb, #f97316 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--kipu-border)";
            e.currentTarget.style.background = "var(--kipu-surface)";
          }}
        >
          <Puzzle size={20} className="transition-colors shrink-0" style={{ color: "var(--kipu-subtle)" }} />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium" style={{ color: "var(--kipu-text)" }}>Mozilla Firefox</p>
            <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>Firefox Add-ons</p>
          </div>
          <ArrowRight size={14} className="transition-colors" style={{ color: "var(--kipu-subtle)" }} />
        </a>
      </div>

      {/* Cómo funciona */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
          Cómo funciona
        </p>
        <div className="space-y-3">
          {[
            { n: "1", texto: "Instala la extensión en tu navegador" },
            { n: "2", texto: "Ingresa al portal del SRI y ve a Documentos Recibidos" },
            { n: "3", texto: "Haz clic en el botón de Kipu que aparece en el portal" },
            { n: "4", texto: "Los XMLs se importan automáticamente a Kipu" },
          ].map(({ n, texto }) => (
            <div key={n} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "color-mix(in srgb, var(--kipu-accent) 20%, transparent)",
                  color: "var(--kipu-accent)",
                }}
              >
                {n}
              </span>
              <p className="text-sm" style={{ color: "var(--kipu-muted)" }}>{texto}</p>
            </div>
          ))}
        </div>
      </div>

      {VIDEO_ID && (
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <Play size={14} style={{ color: "var(--kipu-danger)" }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kipu-subtle)" }}>
            Video tutorial
          </p>
        </div>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${VIDEO_ID}`}
            title="Tutorial Kipu Importador SRI"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      )}

      {/* Link historial */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <span className="text-xs flex-1" style={{ color: "var(--kipu-subtle)" }}>
          ¿Ya tienes la extensión? Los documentos importados aparecen en el historial.
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-xs transition-colors font-medium shrink-0 flex items-center gap-1"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Ver historial <ArrowRight size={11} />
        </button>
      </div>

    </div>
  );
}

// ── Solo en la compu ──────────────────────────────────────────────────────────
// La importación masiva usa la extensión de Chrome/Firefox de computadora: en la
// app y en el navegador del celular no existe. Ahí se explica cómo hacerlo.
const URL_PANEL = "https://app.kipu.ec/documentos/recibidos/nueva";

function SoloDesdeLaCompu() {
  const avisos = useAvisos();
  const enviarEnlace = async () => {
    const ok = await compartir({
      titulo: "Kipu: importar compras del SRI",
      texto:  "Abre este enlace en tu computadora para importar tus compras del SRI:",
      url:    URL_PANEL,
    });
    if (!ok) {
      try { await navigator.clipboard.writeText(URL_PANEL); avisos.exito("Enlace copiado"); }
      catch { avisos.info(URL_PANEL); }
    }
  };
  return (
    <div className="space-y-4 rounded-xl border border-borde bg-superficie p-5 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-acento-suave text-acento">
        <Monitor size={22} aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-texto">El SRI masivo se hace desde la computadora</h2>
        <p className="text-sm leading-relaxed text-tenue">
          Usa la extensión <b>Kipu Importador SRI</b>, que funciona en Chrome o Firefox de
          computadora: entra al portal del SRI y trae todas tus compras a Kipu de una vez.
        </p>
      </div>
      <ol className="space-y-1 text-left text-sm text-tenue">
        <li>1. En tu computadora, abre <b className="text-texto">app.kipu.ec</b>.</li>
        <li>2. Ve a Documentos → Recibidos → Registrar → SRI masivo.</li>
        <li>3. Instala la extensión y sigue los pasos.</li>
      </ol>
      <Boton variante="secundario" onClick={enviarEnlace} icono={<Send size={16} />} anchoCompleto>
        Enviarme el enlace
      </Boton>
      <p className="text-xs text-sutil">
        Desde aquí puedes registrar una compra subiendo su XML o una foto del comprobante.
      </p>
    </div>
  );
}

export default function TabSRI(props: Props) {
  // App de las tiendas: nunca. Web: solo en pantallas de computadora.
  if (ES_APP_NATIVA) return <SoloDesdeLaCompu />;
  return (
    <>
      <div className="lg:hidden"><SoloDesdeLaCompu /></div>
      <div className="hidden lg:block"><ContenidoSRI {...props} /></div>
    </>
  );
}
