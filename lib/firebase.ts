// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, type Auth,
} from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import {
  initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, type AppCheck,
} from "firebase/app-check";
import { ES_APP_NATIVA } from "@/lib/plataforma";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// En la app nativa no se usa getAuth(): carga un iframe de authDomain para los
// inicios de sesión con ventana/redirección, y en iOS (capacitor://localhost)
// ese iframe nunca responde, así que onAuthStateChanged no llega y la app se
// queda en blanco cargando. La app no usa ventana ni redirección: sin ellos.
function crearAuth(): Auth {
  if (typeof window === "undefined" || !ES_APP_NATIVA) return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    return getAuth(app); // ya estaba iniciado (recarga en caliente)
  }
}

export const auth = crearAuth();

// ── App Check ────────────────────────────────────────────────────────────────
// Prueba ante el backend que la petición sale de Kipu: en la web, esta página en
// un navegador real (reCAPTCHA); en la app de las tiendas, la app original en un
// teléfono real (Play Integrity en Android, App Attest en iOS, con el plugin
// nativo: reCAPTCHA no funciona dentro de la app).
// Web: sin NEXT_PUBLIC_RECAPTCHA_SITE_KEY queda apagado.
//   NEXT_PUBLIC_APP_CHECK_PROVEEDOR: "enterprise" (por defecto) | "v3"
//   NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN: solo en desarrollo (localhost), registrado
//   en la consola de Firebase → App Check → Administrar tokens de depuración.
//   En la app, cualquier valor activa el proveedor de depuración (emulador): el
//   token sale en el log nativo y se registra igual en la consola.
const SITE_KEY_APP_CHECK = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
let appCheck: AppCheck | null = null;

if (typeof window !== "undefined" && SITE_KEY_APP_CHECK && !ES_APP_NATIVA) {
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

// App nativa: el plugin se inicia una sola vez, la primera vez que se pide un token.
// Si el teléfono o la consola de Firebase todavía no están listos, no hay token
// (null) y la petición sale sin él, como antes.
let appCheckNativo: Promise<typeof import("@capacitor-firebase/app-check").FirebaseAppCheck | null> | null = null;

function iniciarAppCheckNativo() {
  appCheckNativo ??= import("@capacitor-firebase/app-check")
    .then(async ({ FirebaseAppCheck }) => {
      await FirebaseAppCheck.initialize({
        isTokenAutoRefreshEnabled: true,
        debugToken: !!process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN,
      });
      return FirebaseAppCheck;
    })
    .catch(e => {
      console.warn("[AppCheck] no se pudo iniciar en la app", e);
      return null;
    });
  return appCheckNativo;
}

/** Token de App Check para mandar al backend, o null si está apagado o falló. */
export async function tokenAppCheck(): Promise<string | null> {
  if (ES_APP_NATIVA && typeof window !== "undefined") {
    // Se pide en cada petición: si la atestación se cuelga, no puede frenar la app
    const limite = new Promise<null>(resolver => setTimeout(() => resolver(null), 4000));
    const token = (async () => {
      const plugin = await iniciarAppCheckNativo();
      return plugin ? (await plugin.getToken({ forceRefresh: false })).token : null;
    })().catch(() => null);
    return Promise.race([token, limite]);
  }
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
