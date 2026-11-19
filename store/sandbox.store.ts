// store/sandbox.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SandboxStore {
  activo:        boolean;
  // true = lo encendió Kipu porque la empresa estaba en pruebas (no la persona).
  // Al pasar a producción ese sandbox se apaga solo.
  porPruebas:    boolean;
  toggleSandbox: () => void;
  setSandbox:    (val: boolean) => void;
  forzarPorPruebas: () => void;
}

export const useSandboxStore = create<SandboxStore>()(
  persist(
    (set) => ({
      activo:        false,
      porPruebas:    false,
      toggleSandbox: () => set((s) => ({ activo: !s.activo, porPruebas: false })),
      setSandbox:    (val) => set({ activo: val, porPruebas: false }),
      forzarPorPruebas: () => set({ activo: true, porPruebas: true }),
    }),
    { name: "kipu:sandbox" }
  )
);