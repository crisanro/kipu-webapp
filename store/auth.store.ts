// store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Suscripcion {
  activa:  boolean;
  estado:  string | null;
  plan:    string | null;
}

interface Empresa {
  id:                 number;
  ruc:                string;
  razon_social:       string;
  nombre_comercial:   string;
  ambiente:           number;
  rol:                string;
  tipo_emisor:        string;
  firma_ok:           boolean;
  suscripcion_activa: boolean;
  suscripcion:        Suscripcion;
  balance_api:        number;
  permisos:           Record<string, boolean>; 
}

interface AuthState {
  uid:          string | null;
  email:        string | null;
  profile_id:   string | null;
  role:         string | null;
  listo:        boolean;
  empresa:      Empresa | null;
  empresas:     Empresa[];
  setUser:      (uid: string, email: string, profile_id: string, role?: string) => void;
  setEmpresa:   (empresa: Empresa) => void;
  setEmpresas:  (empresas: Empresa[]) => void;
  setListo:     (v: boolean) => void;
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
      role:       null,
      listo:      false,
      empresa:    null,
      empresas:   [],

      setUser: (uid, email, profile_id, role) =>
        set({ uid, email, profile_id, role: role ?? null }),

      setEmpresa:  (empresa)  => set({ empresa }),
      setEmpresas: (empresas) => set({ empresas }),
      setListo:    (listo)    => set({ listo }),

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

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("kipu:empresas");
          localStorage.removeItem("kipu-swr-cache");
        }
        set({
          uid:      null,
          email:    null,
          profile_id: null,
          role:     null,
          listo:    false,
          empresa:  null,
          empresas: [],
        });
      },
    }),
    {
      name: "kipu-auth",
      partialize: (state) => ({
        uid:        state.uid,
        email:      state.email,
        profile_id: state.profile_id,
        role:       state.role,
        empresa:    state.empresa,
        empresas:   state.empresas,
        // listo NO se persiste — siempre arranca en false
      }),
    }
  )
);