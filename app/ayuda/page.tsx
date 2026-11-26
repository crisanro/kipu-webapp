// app/ayuda/page.tsx — portada del Centro de Ayuda: buscador y categorías.
import BloqueSoporte from "@/components/ayuda/BloqueSoporte";
import Buscador from "@/components/ayuda/Buscador";
import { ARTICULOS, CATEGORIAS } from "@/content/ayuda/articulos";

export default function AyudaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-texto">¿En qué te ayudamos?</h1>
        <p className="text-sm mt-1 text-sutil">
          Guías paso a paso para facturar con Kipu.
        </p>
      </div>
      <Buscador articulos={ARTICULOS} categorias={CATEGORIAS} />
      <BloqueSoporte />
    </div>
  );
}
