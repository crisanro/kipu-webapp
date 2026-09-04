// app/(dashboard)/documentos/recibidos/nueva/_components/TabSRI.tsx
"use client";
import { Puzzle, Play, ArrowRight, Download, Globe } from "lucide-react";

interface Props {
  empresa: any;
  onDone:  () => void;
}

const VIDEO_ID        = "dQw4w9WgXcQ"; // placeholder — reemplazar con el real
const CHROME_EXT_URL  = "https://chromewebstore.google.com/detail/kipu-%E2%80%94-importador-sri/fpaeflibkbihlpdkfbpniminocmplplo"; // placeholder — Chrome Web Store
const FIREFOX_EXT_URL = "https://addons.mozilla.org/es-ES/firefox/addon/kipu-importador-sri/"; // placeholder — Firefox Add-ons

export default function TabSRI({ empresa, onDone }: Props) {
  return (
    <div className="space-y-5">

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/10 border border-indigo-500/20 rounded-xl p-5 text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/30 flex items-center justify-center mx-auto">
          <Download size={22} className="text-indigo-400" />
        </div>
        <h2 className="text-white font-bold text-base">Kipu Importador SRI</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Instala la extensión y descarga tus documentos recibidos del portal del SRI
          directo a Kipu — sin descargar archivos ni copiar datos.
        </p>
      </div>

            {/* Botones descarga */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Instalar extensión</p>
        <a
          href={CHROME_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors group"
        >
          <Globe  size={20} className="text-gray-400 group-hover:text-indigo-400 transition-colors shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-white font-medium">Google Chrome</p>
            <p className="text-xs text-gray-500">Chrome Web Store</p>
          </div>
          <ArrowRight size={14} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
        </a>
        <a
          href={FIREFOX_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors group"
        >
          <Puzzle size={20} className="text-gray-400 group-hover:text-orange-400 transition-colors shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm text-white font-medium">Mozilla Firefox</p>
            <p className="text-xs text-gray-500">Firefox Add-ons</p>
          </div>
          <ArrowRight size={14} className="text-gray-600 group-hover:text-orange-400 transition-colors" />
        </a>
      </div>

      {/* Cómo funciona */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cómo funciona</p>
        <div className="space-y-3">
          {[
            { n: "1", texto: "Instala la extensión en tu navegador" },
            { n: "2", texto: "Ingresa al portal del SRI y ve a Documentos Recibidos" },
            { n: "3", texto: "Haz clic en el botón de Kipu que aparece en el portal" },
            { n: "4", texto: "Los XMLs se importan automáticamente a Kipu" },
          ].map(({ n, texto }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              <p className="text-sm text-gray-300">{texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Video */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <Play size={14} className="text-red-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Video tutorial</p>
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

      {/* Link historial */}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500 flex-1">
          ¿Ya tienes la extensión? Los documentos importados aparecen en el historial.
        </span>
        <button
          onClick={onDone}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium shrink-0 flex items-center gap-1"
        >
          Ver historial <ArrowRight size={11} />
        </button>
      </div>

    </div>
  );
}