"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { AlertTriangle, FileText, FileImage, Download } from "lucide-react";

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
        <h1 className="text-xl font-bold" style={{ color: "var(--kipu-text)" }}>
          Registrar documento recibido
        </h1>
        <p className="text-sm" style={{ color: "var(--kipu-subtle)" }}>
          XML electrónico o documento físico
        </p>
      </div>

      {/* Alerta suscripción */}
      {!suscripcionActiva && (
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3"
          style={{
            background: "color-mix(in srgb, var(--kipu-warning) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-warning) 20%, transparent)",
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-warning)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-warning)" }}>
            Se requiere suscripción activa para registrar documentos.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-2 rounded-xl p-1"
        style={{
          background: "var(--kipu-surface)",
          border: "1px solid var(--kipu-border)",
        }}
      >
        <button
          type="button"
          onClick={() => { setTab("xml"); setError(""); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tab === "xml" ? "var(--kipu-accent)" : "transparent",
            color: tab === "xml" ? "#FFFFFF" : "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            if (tab !== "xml") e.currentTarget.style.color = "var(--kipu-text)";
          }}
          onMouseLeave={e => {
            if (tab !== "xml") e.currentTarget.style.color = "var(--kipu-subtle)";
          }}
        >
          <FileText size={15} />
          XML Electrónico
        </button>
        <button
          type="button"
          onClick={() => { setTab("fisico"); setError(""); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tab === "fisico" ? "var(--kipu-accent)" : "transparent",
            color: tab === "fisico" ? "#FFFFFF" : "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            if (tab !== "fisico") e.currentTarget.style.color = "var(--kipu-text)";
          }}
          onMouseLeave={e => {
            if (tab !== "fisico") e.currentTarget.style.color = "var(--kipu-subtle)";
          }}
        >
          <FileImage size={15} />
          Documento Físico
        </button>
        <button
          type="button"
          onClick={() => { setTab("sri"); setError(""); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: tab === "sri" ? "var(--kipu-accent)" : "transparent",
            color: tab === "sri" ? "#FFFFFF" : "var(--kipu-subtle)",
          }}
          onMouseEnter={e => {
            if (tab !== "sri") e.currentTarget.style.color = "var(--kipu-text)";
          }}
          onMouseLeave={e => {
            if (tab !== "sri") e.currentTarget.style.color = "var(--kipu-subtle)";
          }}
        >
          <Download size={15} />
          SRI Masivo
        </button>
      </div>

      {/* Error compartido */}
      {error && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{
            background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--kipu-danger) 20%, transparent)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--kipu-danger)" }} />
          <p className="text-sm" style={{ color: "var(--kipu-danger)" }}>{error}</p>
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
        <button
          type="button"
          onClick={() => router.push("/documentos/recibidos")}
          className="text-xs transition-colors"
          style={{ color: "var(--kipu-accent)" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Ver historial →
        </button>
      </div>

    </div>
  );
}