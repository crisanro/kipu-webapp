"use client";
import { KeyRound, Copy, ExternalLink } from "lucide-react";
import { type FacturaBase } from "./utils";
import Seccion from "@/components/ui/Seccion";
import Boton from "@/components/ui/Boton";
import { useCopiar } from "@/lib/useCopiar";
import { abrirExterno } from "@/lib/nativo";

const URL_VALIDEZ_SRI = "https://srienlinea.sri.gob.ec/comprobantes-electronicos-internet/publico/validezComprobantes.jsf";

// Clave de acceso con botón de copiar y enlace de verificación en el SRI.
export default function ClaveAcceso({ factura }: { factura: FacturaBase }) {
  const { copiar } = useCopiar();
  if (!factura.clave_acceso) return null;

  const copiarClave = () => copiar(factura.clave_acceso, "Clave de acceso copiada");

  return (
    <Seccion titulo="Clave de acceso" icono={KeyRound} resumen={`…${factura.clave_acceso.slice(-8)}`}>
      <code className="block break-all rounded-lg bg-presionado px-3 py-2 font-mono text-xs text-texto select-all">
        {factura.clave_acceso}
      </code>
      <div className="mt-2 flex flex-wrap gap-2">
        <Boton variante="secundario" tamano="sm" onClick={copiarClave} icono={<Copy size={14} />}>Copiar</Boton>
        {["AUTORIZADO", "ANULADO"].includes(factura.estado_sri) && (
          <Boton variante="fantasma" tamano="sm" onClick={() => void abrirExterno(URL_VALIDEZ_SRI)} icono={<ExternalLink size={14} />}>
            Verificar en el portal del SRI
          </Boton>
        )}
      </div>
    </Seccion>
  );
}
