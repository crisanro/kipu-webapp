// Piezas compartidas del panel del equipo de Kipu Al Día
export interface Yo { es_superadmin: boolean; es_contador: boolean; nombre: string }

export const ESTADOS: Record<string, { texto: string; color: string }> = {
  PENDIENTE:       { texto: "Pendiente",         color: "var(--kipu-warning)" },
  RESUMEN_ENVIADO: { texto: "Resumen enviado",   color: "var(--kipu-info)" },
  PRESENTADO:      { texto: "Presentada",        color: "var(--kipu-success)" },
  NO_PAGADO:       { texto: "Sin pago: no va",   color: "var(--kipu-danger)" },
};

export function detalle(err: unknown, porDefecto: string): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : porDefecto;
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Las fechas sin hora (2026-11-30) se leen en hora local para no correrse un día
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" });
}

export function Etiqueta({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { texto: estado, color: "var(--kipu-subtle)" };
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ color: e.color, background: `color-mix(in srgb, ${e.color} 12%, transparent)` }}>
      {e.texto}
    </span>
  );
}

export function Vence({ dias, estado }: { dias: number; estado: string }) {
  if (estado === "PRESENTADO") return null;
  const color = dias < 0 ? "var(--kipu-danger)" : dias <= 3 ? "var(--kipu-warning)" : "var(--kipu-subtle)";
  const texto = dias < 0 ? `venció hace ${-dias} d` : dias === 0 ? "vence hoy" : `vence en ${dias} d`;
  return <span className="text-xs whitespace-nowrap" style={{ color }}>{texto}</span>;
}

export const caja = { background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" };
export const campo = { background: "var(--kipu-bg)", border: "1px solid var(--kipu-border)", color: "var(--kipu-text)" };
