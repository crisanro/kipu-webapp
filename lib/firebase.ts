// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import {
  initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// ── App Check ────────────────────────────────────────────────────────────────
// Prueba ante el backend que la petición sale de esta página en un navegador
// real. Sin NEXT_PUBLIC_RECAPTCHA_SITE_KEY queda apagado.
//   NEXT_PUBLIC_APP_CHECK_PROVEEDOR: "enterprise" (por defecto) | "v3"
//   NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN: solo en desarrollo (localhost), registrado
//   en la consola de Firebase → App Check → Administrar tokens de depuración.
const SITE_KEY_APP_CHECK = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
let appCheck: AppCheck | null = null;

if (typeof window !== "undefined" && SITE_KEY_APP_CHECK) {
  const debug = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
  if (debug) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debug === "true" ? true : debug;
  }
  try {
    appCheck = initializeAppCheck(app, {
      provider: process.env.NEXT_PUBLIC_APP_CHECK_PROVEEDOR === "v3"
        ? new ReCaptchaV3Provider(SITE_KEY_APP_CHECK)
        : new ReCaptchaEnterpriseProvider(SITE_KEY_APP_CHECK),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn("[AppCheck] no se pudo iniciar", e);
  }
}

/** Token de App Check para mandar al backend, o null si está apagado o falló. */
export async function tokenAppCheck(): Promise<string | null> {
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck, false)).token;
  } catch {
    return null;
  }
}

// Messaging — solo en browser, no en SSR
export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;