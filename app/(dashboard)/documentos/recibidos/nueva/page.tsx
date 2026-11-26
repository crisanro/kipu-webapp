"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { ES_APP_NATIVA } from "@/lib/plataforma";
import { AlertTriangle, FileText, FileImage, Download } from "lucide-react";
import { AvisoFuncionPro } from "@/components/EjemploPro";

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

  // Registrar compras: Plan Pro, o todos con el plan gratis encendido
  const suscripcionActiva = !!(empresa?.suscripcion_activa || empresa?.emision_gratis);

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
        <h1 className="text-xl font-bold text-texto">
          Registrar documento recibido
        </h1>
        <p className="text-sm text-sutil">
          XML electrónico o documento físico
        </p>
      </div>

      {/* Alerta suscripción */}
      {!suscripcionActiva && (
        <AvisoFuncionPro
          texto="Registrar tus compras es del Plan Pro. Las que ya registraste las sigues viendo."
          textoApp="Registrar compras no está incluido en tu plan actual. Las que ya registraste las sigues viendo."
        />
      )}

      {/* Tabs */}
      <div
        className="flex gap-2 rounded-xl p-1 bg-superficie border border-borde"
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
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-peligro-suave border border-peligro/20"
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-peligro" />
          <p className="text-sm text-peligro">{error}</p>
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
          className="text-xs transition-colors text-acento"
          onMouseEnter={e => e.currentTarget.style.color = "var(--kipu-accent-h)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--kipu-accent)"}
        >
          Ver historial →
        </button>
      </div>

    </div>
  );
}