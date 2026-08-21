// store/sandbox.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SandboxStore {
  activo:        boolean;
  toggleSandbox: () => void;
  setSandbox:    (val: boolean) => void;
}

export const useSandboxStore = create<SandboxStore>()(
  persist(
    (set) => ({
      activo:        false,
      toggleSandbox: () => set((s) => ({ activo: !s.activo })),
      setSandbox:    (val) => set({ activo: val }),
    }),
    { name: "kipu:sandbox" }
  )
);