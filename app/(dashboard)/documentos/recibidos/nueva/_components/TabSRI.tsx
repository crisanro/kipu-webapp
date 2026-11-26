"use client";
import { Puzzle, Play, ArrowRight, Download, Globe, Monitor, Share2 } from "lucide-react";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { compartir } from "@/lib/nativo";
import { useCopiar } from "@/lib/useCopiar";
import Boton from "@/components/ui/Boton";

interface Props {
  empresa: any;
  onDone:  () => void;
}

// ID del video tutorial en YouTube. Mientras sea null, la sección del video no se muestra.
const VIDEO_ID: string | null = null;
// También los usa /declarar-mes-anterior
export const CHROME_EXT_URL  = "https://chromewebstore.google.com/detail/kipu-%E2%80%94-importador-sri/fpaeflibkbihlpdkfbpniminocmplplo";
export const FIREFOX_EXT_URL = "https://addons.mozilla.org/es-ES/firefox/addon/kipu-importador-sri/";

function ContenidoSRI({ empresa, onDone }: Props) {
  return (
    <div className="space-y-5">

      {/* Hero */}
      <div
        className="rounded-xl p-5 text-center space-y-2 bg-acento/10 border border-acento/20"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-acento/20"
        >
          <Download className="text-acento" size={22} />
        </div>
        <h2 className="font-bold text-base text-texto">
          Kipu Importador SRI
        </h2>
        <p className="text-sm leading-relaxed text-sutil">
          Instala la extensión y descarga tus documentos recibidos del portal del SRI
          directo a Kipu — sin descargar archivos ni copiar datos.
        </p>
      </div>

      {/* Botones descarga */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-sutil">
          Instalar extensión
        </p>
        <a
          href={CHROME_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors group bg-superficie border border-borde hover:border-acento/40 hover:bg-acento/5"
        >
          <Globe size={20} className="transition-colors shrink-0 text-sutil" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-texto">Google Chrome</p>
            <p className="text-xs text-sutil">Chrome Web Store</p>
          </div>
          <ArrowRight size={14} className="transition-colors text-sutil" />
        </a>
        <a
          href={FIREFOX_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors group bg-superficie border border-borde"
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "color-mix(in srgb, #f97316 40%, transparent)";
            e.currentTarget.style.background = "color-mix(in srgb, #f97316 5%, transparent)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--kipu-border)";
            e.currentTarget.style.background = "var(--kipu-surface)";
          }}
        >
          <Puzzle size={20} className="transition-colors shrink-0 text-sutil" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-texto">Mozilla Firefox</p>
            <p className="text-xs text-sutil">Firefox Add-ons</p>
          </div>
          <ArrowRight size={14} className="transition-colors text-sutil" />
        </a>
      </div>

      {/* Cómo funciona */}
      <div
        className="rounded-xl p-4 space-y-3 bg-superficie border border-borde"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-sutil">
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
                className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 bg-acento/20 text-acento"
              >
                {n}
              </span>
              <p className="text-sm text-tenue">{texto}</p>
            </div>
          ))}
        </div>
      </div>

      {VIDEO_ID && (
      <div
        className="rounded-xl overflow-hidden bg-superficie border border-borde"
      >
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <Play className="text-peligro" size={14} />
          <p className="text-xs font-semibold uppercase tracking-wider text-sutil">
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
        className="flex items-center gap-2 rounded-xl px-4 py-3 bg-superficie border border-borde"
      >
        <span className="text-xs flex-1 text-sutil">
          ¿Ya tienes la extensión? Los documentos importados aparecen en el historial.
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-xs transition-colors font-medium shrink-0 flex items-center gap-1 text-acento hover:text-acento-hover"
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
  const { copiar } = useCopiar();
  const enviarEnlace = async () => {
    const ok = await compartir({
      titulo: "Kipu: importar compras del SRI",
      texto:  "Abre este enlace en tu computadora para importar tus compras del SRI:",
      url:    URL_PANEL,
    });
    if (!ok) await copiar(URL_PANEL, "Enlace copiado");
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
      {/* Abre el menú Compartir del teléfono: uno mismo elige su WhatsApp o su correo */}
      <div className="space-y-1">
        <Boton variante="secundario" onClick={enviarEnlace} icono={<Share2 size={16} />} anchoCompleto>
          Compartir el enlace
        </Boton>
        <p className="text-xs text-sutil">Mándatelo por WhatsApp o correo y ábrelo en la compu.</p>
      </div>
      <p className="text-xs text-sutil">
        Desde aquí puedes registrar una compra subiendo su XML o escribiendo sus datos.
      </p>
    </div>
  );
}

export default function TabSRI(props: Props) {
  // App de las tiendas: nunca. Web: según el dispositivo, no el ancho: en un
  // teléfono o tablet (pantalla táctil) se explica; en la compu, aunque la
  // ventana sea angosta, se usa normal (la extensión sí funciona ahí).
  if (ES_APP_NATIVA) return <SoloDesdeLaCompu />;
  return (
    <>
      <div className="hidden tactil:block"><SoloDesdeLaCompu /></div>
      <div className="tactil:hidden"><ContenidoSRI {...props} /></div>
    </>
  );
}
