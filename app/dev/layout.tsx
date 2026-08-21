import Link from "next/link";
import { ReactNode } from "react";

const NAV_LINKS = [
  { href: "/dev", label: "Inicio" },
  { href: "/dev/autenticacion", label: "Autenticación" },
  { href: "/dev/emision", label: "Emisión" },
  { href: "/dev/referencia", label: "Referencia" },
  { href: "/dev/errores", label: "Errores" },
];

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-200 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-white/[0.07] sticky top-0 z-50 bg-[#0b0f1a]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dev" className="flex items-center gap-2.5 group">
            <span className="text-indigo-400 font-mono text-sm font-semibold tracking-wider group-hover:text-indigo-300 transition-colors">
              KIPU
            </span>
            <span className="text-white/20 text-xs">|</span>
            <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">
              Developers
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-md hover:bg-white/5 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://app.kipufacturacion.com"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Panel →
            </Link>
            <Link
              href="https://app.kipufacturacion.com/register"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-md font-medium transition-colors"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] py-10 mt-24">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-slate-500 text-xs font-mono">
              KIPU · API v1
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Facturación electrónica conforme al SRI de Ecuador
            </p>
          </div>
          <div className="flex gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-slate-700 text-xs">
            © {new Date().getFullYear()} Kipu. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}