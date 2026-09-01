// app/(dashboard)/documentos/recibidos/nueva/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { AlertTriangle, FileText, FileImage, Download } from "lucide-react";
import { clsx } from "clsx";

import TabXML              from "./_components/TabXML";
import TabFisico           from "./_components/TabFisico";
import TabSRI              from "./_components/TabSRI";
import ReviewXML           from "./_components/ReviewXML";
import DoneScreen          from "./_components/DoneScreen";
import { DocParseado }     from "./_components/ReviewXML";

export default function NuevaRecibidaPage() {
  const router  = useRouter();
  const empresa = useAuthStore((s) => s.empresa);

  const [tab,      setTab]      = useState<"xml" | "fisico" | "sri">("xml");
  const [parsed,   setParsed]   = useState<DocParseado | null>(null);
  const [xmlFile,  setXmlFile]  = useState<File | null>(null);
  const [doneXML,  setDoneXML]  = useState(false);
  const [doneFis,  setDoneFis]  = useState(false);
  const [doneSRI,  setDoneSRI]  = useState(false);
  const [error,    setError]    = useState("");
  const [dragging, setDragging] = useState(false);

  const suscripcionActiva = empresa?.suscripcion_activa ?? false;

  // ── Done XML ────────────────────────────────────────────────────────────────
  if (tab === "xml" && doneXML) {
    return (
      <DoneScreen
        titulo    = {`${parsed?.tipo_doc === "FAC" ? "Factura" : parsed?.tipo_doc === "NCR" ? "Nota de Crédito" : parsed?.tipo_doc === "NDB" ? "Nota de Débito" : "Retención"} registrada`}
        subtitulo = {parsed?.numero_doc ?? ""}
        onOtro    = {() => { setDoneXML(false); setParsed(null); setXmlFile(null); setError(""); }}
      />
    );
  }

  // ── Done Físico ─────────────────────────────────────────────────────────────
  if (tab === "fisico" && doneFis) {
    return (
      <DoneScreen
        titulo    = "Documento registrado"
        subtitulo = "Documento físico guardado correctamente"
        onOtro    = {() => setDoneFis(false)}
      />
    );
  }

  // ── Done SRI ────────────────────────────────────────────────────────────────
  if (tab === "sri" && doneSRI) {
    return (
      <DoneScreen
        titulo    = "Importación completada"
        subtitulo = "Documentos del SRI importados correctamente"
        onOtro    = {() => setDoneSRI(false)}
      />
    );
  }

  // ── Review XML ──────────────────────────────────────────────────────────────
  if (tab === "xml" && parsed && xmlFile) {
    return (
      <ReviewXML
        parsed             = {parsed}
        xmlFile            = {xmlFile}
        suscripcionActiva  = {suscripcionActiva}
        onBack = {() => { setParsed(null); setXmlFile(null); setError(""); }}
        onDone = {() => setDoneXML(true)}
      />
    );
  }

  // ── Vista principal ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Registrar documento recibido</h1>
        <p className="text-sm text-gray-500">XML electrónico o documento físico</p>
      </div>

      {/* Alerta suscripción */}
      {!suscripcionActiva && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">Se requiere suscripción activa para registrar documentos.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        <button
          onClick={() => { setTab("xml"); setError(""); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
            tab === "xml" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          )}
        >
          <FileText size={15} />
          XML Electrónico
        </button>
        <button
          onClick={() => { setTab("fisico"); setError(""); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
            tab === "fisico" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          )}
        >
          <FileImage size={15} />
          Documento Físico
        </button>
        <button
          onClick={() => { setTab("sri"); setError(""); }}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
            tab === "sri" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          )}
        >
          <Download size={15} />
          SRI Masivo
        </button>
      </div>

      {/* Error compartido */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Contenido del tab activo */}
      {tab === "xml" && (
        <TabXML
          empresa     = {empresa}
          error       = {error}
          setError    = {setError}
          dragging    = {dragging}
          setDragging = {setDragging}
          onParsed    = {(p, f) => { setParsed(p); setXmlFile(f); }}
        />
      )}

      {tab === "fisico" && (
        <TabFisico
          suscripcionActiva = {suscripcionActiva}
          onDone            = {() => setDoneFis(true)}
        />
      )}

      {tab === "sri" && (
        <TabSRI
          empresa = {empresa}
          onDone  = {() => setDoneSRI(true)}
        />
      )}

      {/* Link historial */}
      <div className="flex justify-end">
        <button onClick={() => router.push("/documentos/recibidos")}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Ver historial →
        </button>
      </div>

    </div>
  );
}