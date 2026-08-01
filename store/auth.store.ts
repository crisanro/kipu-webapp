// store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Empresa {
  id:               number;
  ruc:              string;
  razon_social:     string;
  nombre_comercial: string;
  ambiente:         number;
  rol:              string;
  balance_emision:  number;
  balance_recepcion: number;
  firma_ok:         boolean;
}

interface AuthState {
  uid:          string | null;
  email:        string | null;
  profile_id:   string | null;
  empresa:      Empresa | null;
  empresas:     Empresa[];

  // Actions
  setUser:      (uid: string, email: string, profile_id: string) => void;
  setEmpresa:   (empresa: Empresa) => void;
  setEmpresas:  (empresas: Empresa[]) => void;
  updateBalance:(balance_emision: number, balance_recepcion: number) => void;
  logout:       () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      uid:        null,
      email:      null,
      profile_id: null,
      empresa:    null,
      empresas:   [],

      setUser: (uid, email, profile_id) =>
        set({ uid, email, profile_id }),

      setEmpresa: (empresa) =>
        set({ empresa }),

      setEmpresas: (empresas) =>
        set({ empresas }),

      updateBalance: (balance_emision, balance_recepcion) =>
        set((state) => ({
          empresa: state.empresa
            ? { ...state.empresa, balance_emision, balance_recepcion }
            : null,
        })),

      logout: () =>
        set({ uid: null, email: null, profile_id: null, empresa: null, empresas: [] }),
    }),
    {
      name: "kipu-auth",   // clave en localStorage
      partialize: (state) => ({
        // Solo persistimos lo esencial — el token Firebase se refresca solo
        uid:        state.uid,
        email:      state.email,
        profile_id: state.profile_id,
        empresa:    state.empresa,
      }),
    }
  )
);