import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function SinAcceso() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <ShieldX size={28} className="text-red-400" />
      </div>
      <h2 className="text-white font-semibold text-lg mb-1">Sin acceso</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        No tienes permisos para ver esta sección. Contacta al administrador de tu empresa.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
      >
        Ir al Dashboard
      </Link>
    </div>
  );
}