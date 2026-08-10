// store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Empresa {
  id:                number;
  ruc:               string;
  razon_social:      string;
  nombre_comercial:  string;
  ambiente:          number;
  rol:               string;
  balance_emision:   number;
  balance_recepcion: number;
  firma_ok:          boolean;
}

interface AuthState {
  uid:          string | null;
  email:        string | null;
  profile_id:   string | null;
  role:         string | null;        // ← nuevo
  empresa:      Empresa | null;
  empresas:     Empresa[];
  setUser:      (uid: string, email: string, profile_id: string, role?: string) => void; // ← nuevo
  setEmpresa:   (empresa: Empresa) => void;
  setEmpresas:  (empresas: Empresa[]) => void;
  updateBalance:(balance_emision: number, balance_recepcion: number) => void;
  addEmpresa:   (empresa: Empresa) => void;
  updateEmpresa:(empresa: Empresa) => void;
  logout:       () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      uid:        null,
      email:      null,
      profile_id: null,
      role:       null,              // ← nuevo
      empresa:    null,
      empresas:   [],

      setUser: (uid, email, profile_id, role) =>
        set({ uid, email, profile_id, role: role ?? null }),

      setEmpresa: (empresa) => set({ empresa }),
      setEmpresas: (empresas) => set({ empresas }),

      addEmpresa: (empresa) =>
        set((state) => ({
          empresas: [...state.empresas, empresa],
          empresa,
        })),

      updateEmpresa: (empresa) =>
        set((state) => ({
          empresas: state.empresas.map(e => e.id === empresa.id ? empresa : e),
          empresa:  state.empresa?.id === empresa.id ? empresa : state.empresa,
        })),

      updateBalance: (balance_emision, balance_recepcion) =>
        set((state) => ({
          empresa: state.empresa
            ? { ...state.empresa, balance_emision, balance_recepcion }
            : null,
          empresas: state.empresas.map(e =>
            e.id === state.empresa?.id
              ? { ...e, balance_emision, balance_recepcion }
              : e
          ),
        })),

      logout: () =>
        set({ uid: null, email: null, profile_id: null, role: null, empresa: null, empresas: [] }),
    }),
    {
      name: "kipu-auth",
      partialize: (state) => ({
        uid:        state.uid,
        email:      state.email,
        profile_id: state.profile_id,
        role:       state.role,       // ← persistir
        empresa:    state.empresa,
        empresas:   state.empresas,
      }),
    }
  )
);