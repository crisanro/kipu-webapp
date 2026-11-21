// app/ayuda/page.tsx — portada del Centro de Ayuda: buscador y categorías.
import Buscador from "@/components/ayuda/Buscador";
import { ARTICULOS, CATEGORIAS } from "@/content/ayuda/articulos";

export default function AyudaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--kipu-text)" }}>¿En qué te ayudamos?</h1>
        <p className="text-sm mt-1" style={{ color: "var(--kipu-subtle)" }}>
          Guías paso a paso para facturar con Kipu.
        </p>
      </div>
      <Buscador articulos={ARTICULOS} categorias={CATEGORIAS} />
    </div>
  );
}
