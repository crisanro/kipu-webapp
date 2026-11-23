// lib/notifications.ts
import { getToken, deleteToken, onMessage, type MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import api from "./api";
import { rutaInterna } from "./rutas";
import { ES_APP_NATIVA } from "./plataforma";

// En la app de las tiendas no hay service worker: el push lo maneja Firebase
// Messaging nativo (@capacitor-firebase/messaging). Entrega el mismo token FCM
// que la web, así que el backend registra y envía igual (ver sección "App nativa").

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const FLAG_SESION = "kipu-fcm-ok";

// Evento global que escucha el cajón de notificaciones para recargarse
export const EVENTO_NOTIF = "kipu:notificacion";

// ── Generar o recuperar device_id único por dispositivo ───────────────────────
const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem("kipu-device-id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("kipu-device-id", deviceId);
    }
    return deviceId;
  } catch {
    return "default";
  }
};

// ── Estado del permiso ────────────────────────────────────────────────────────
export type PermisoNotificaciones = NotificationPermission | "no-soportado";

export function permisoNotificaciones(): PermisoNotificaciones {
  // App nativa: el permiso lo pide el sistema al entrar (registrarNativo), sin
  // necesidad de un clic. El botón "Activar notificaciones" de la web no aplica.
  if (ES_APP_NATIVA) return "no-soportado";
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return "no-soportado";
  }
  return Notification.permission;
}

// ── Pedir permiso y registrar token FCM ───────────────────────────────────────
// Chrome deja pedir el permiso al cargar. Firefox y Safari solo desde un clic del
// usuario: por eso el layout muestra un botón si el permiso sigue sin decidirse.
// Llamar directo desde el handler del clic (sin awaits antes) para que cuente.
export async function registrarNotificaciones(): Promise<boolean> {
  try {
    // Si ya registramos en esta sesión, no volver a hacerlo
    const yaRegistrado = sessionStorage.getItem(FLAG_SESION);
    if (yaRegistrado) return true;

    if (ES_APP_NATIVA) {
      const ok = await registrarNativo();
      if (ok) sessionStorage.setItem(FLAG_SESION, "1");
      return ok;
    }

    const estado = permisoNotificaciones();
    if (estado === "no-soportado" || estado === "denied") return false;

    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return false;

    const messaging = await getFirebaseMessaging();
    if (!messaging) return false;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey:                  VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return false;

    await api.post("/api/v1/app/notificaciones/fcm-token", {
      token,
      device_id: getDeviceId(),
    });

    // Marcar como registrado para esta sesión
    sessionStorage.setItem(FLAG_SESION, "1");
    return true;
  } catch (e) {
    console.error("[FCM] ❌ Error:", e);
    return false;
  }
}

// ── Dar de baja este dispositivo (llamar ANTES de signOut) ────────────────────
export async function desregistrarNotificaciones(): Promise<void> {
  try {
    sessionStorage.removeItem(FLAG_SESION);
  } catch {}

  // 1. Backend: quitar el token de este dispositivo para este usuario
  try {
    await api.post("/api/v1/app/notificaciones/fcm-token/baja", {
      device_id: getDeviceId(),
    });
  } catch (e) {
    console.warn("[FCM] ⚠️ No se pudo dar de baja en el backend:", e);
  }

  // 2. FCM: invalidar el token del navegador (el próximo login genera uno nuevo).
  // En segundo plano: puede tardar varios segundos y el cierre de sesión no
  // debe esperarlo (antes el botón parecía no responder).
  void olvidarDispositivoLocal();
}

// ── Olvidar el token solo en este navegador (sesión expirada / 401) ───────────
// Sin sesión válida el backend no acepta la baja, y llamarlo desde el
// interceptor del 401 entraría en bucle. Basta con invalidar el token local:
// FCM responde UNREGISTERED en el próximo envío y el backend lo borra. Sin
// esto, un navegador con la sesión vencida seguía recibiendo los avisos.
export async function olvidarDispositivoLocal(): Promise<void> {
  try {
    sessionStorage.removeItem(FLAG_SESION);
  } catch {}
  if (ES_APP_NATIVA) {
    try {
      const { FirebaseMessaging: fm } = await moduloNativo();
      await fm.deleteToken();
    } catch (e) {
      console.warn("[FCM] ⚠️ No se pudo eliminar el token local:", e);
    }
    return;
  }
  try {
    // Sin permiso o sin nuestro service worker no hay token que borrar. Y
    // deleteToken sin registro instala OTRO service worker de Firebase y espera
    // hasta 10 s a que arranque: se le pasa el nuestro con getToken.
    if (permisoNotificaciones() !== "granted") return;
    const registros = await navigator.serviceWorker.getRegistrations();
    const registration = registros.find((r) =>
      (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/firebase-messaging-sw.js"));
    if (!registration) return;
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;
    await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    await deleteToken(messaging);
  } catch (e) {
    console.warn("[FCM] ⚠️ No se pudo eliminar el token local:", e);
  }
}

// ── Mensajes con la app abierta (primer plano) ────────────────────────────────
// Sin esto, si la pestaña está activa el push llega pero no se muestra nada.
// onAbrir: en la app nativa, al tocar una notificación (navegar sin recargar).
export async function escucharPrimerPlano(
  onNueva?: (payload: MessagePayload) => void,
  onAbrir?: (url: string) => void,
): Promise<() => void> {
  if (ES_APP_NATIVA) return escucharNativo(onAbrir);
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    return onMessage(messaging, async (payload) => {
      const d = payload.data ?? {};
      const n = payload.notification ?? {};

      const titulo = n.title || d.title || "Kipu";
      const cuerpo = n.body || d.body || "";
      const url = rutaInterna(d.url || "/dashboard");

      try {
        if (Notification.permission === "granted") {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.showNotification(titulo, {
              body: cuerpo,
              icon: "/icons/icon-192.png",
              badge: "/icon.svg",
              data: { url },
            });
          } else {
            mostrarNotificacionLocal(titulo, cuerpo, url);
          }
        }
      } catch (e) {
        console.warn("[FCM] ⚠️ Error al mostrar notificación en primer plano:", e);
      }

      // Avisar al cajón de notificaciones para que recargue la lista
      window.dispatchEvent(new CustomEvent(EVENTO_NOTIF, { detail: payload }));

      onNueva?.(payload);
    });
  } catch {
    return () => {};
  }
}

// ── Notificación local (app abierta) ──────────────────────────────────────────
export function mostrarNotificacionLocal(titulo: string, cuerpo: string, url?: string) {
  if (Notification.permission !== "granted") return;
  const notif = new Notification(titulo, {
    body: cuerpo,
    icon: "/icons/icon-192.png"
  });
  if (url) notif.onclick = () => window.open(url, "_blank");
}
// ── App nativa (Android / iOS) ────────────────────────────────────────────────
// Import dinámico: el plugin solo se descarga dentro de la app, nunca en la web.
// Ojo: se devuelve el MÓDULO, no el plugin. Los plugins de Capacitor son un
// proxy que responde a cualquier método, también a .then(): si una promesa
// resuelve con el plugin, JS lo trata como otra promesa, llama a .then() y
// falla ("FirebaseMessaging.then() is not implemented"). Nunca se pedía el permiso.
// Uso: `const { FirebaseMessaging: fm } = await moduloNativo();`
const moduloNativo = () => import("@capacitor-firebase/messaging");

async function enviarTokenNativo(token: string): Promise<void> {
  await api.post("/api/v1/app/notificaciones/fcm-token", {
    token,
    device_id: getDeviceId(),
  });
}

// Al entrar: la primera vez el sistema pregunta "¿Permitir que Kipu te envíe
// notificaciones?" (Android 13+ e iOS). Si ya respondió, no vuelve a preguntar.
async function registrarNativo(): Promise<boolean> {
  const { FirebaseMessaging: fm } = await moduloNativo();
  let { receive } = await fm.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    ({ receive } = await fm.requestPermissions());
  }
  if (receive !== "granted") return false;

  const { token } = await fm.getToken();
  if (!token) return false;
  await enviarTokenNativo(token);
  return true;
}

// Destino de una notificación tocada: solo rutas internas
function destinoNotificacion(data: unknown): string {
  const url = (data as Record<string, unknown> | null | undefined)?.url;
  return rutaInterna(typeof url === "string" && url.startsWith("/") ? url : "/dashboard");
}

// Con la app abierta Android no muestra el push (iOS sí: presentationOptions en
// capacitor.config.ts). Se muestra como notificación local, igual que la web.
async function mostrarLocalAndroid(titulo: string, cuerpo: string, data: unknown): Promise<void> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.schedule({
    notifications: [{
      id:    Math.floor(Math.random() * 2_000_000_000),   // entero de 32 bits
      title: titulo,
      body:  cuerpo,
      extra: { url: destinoNotificacion(data) },
    }],
  });
}

async function escucharNativo(onAbrir?: (url: string) => void): Promise<() => void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const esAndroid = Capacitor.getPlatform() === "android";
    const abrir = (destino: string) => {
      if (onAbrir) onAbrir(destino);
      else window.location.assign(destino);
    };

    const { FirebaseMessaging: fm } = await moduloNativo();
    const handles = await Promise.all([
      // Llegó con la app abierta: recargar el cajón (y la campana) y, en Android, mostrar el aviso
      fm.addListener("notificationReceived", (e) => {
        window.dispatchEvent(new CustomEvent(EVENTO_NOTIF, { detail: e.notification }));
        if (esAndroid) {
          const n = e.notification;
          const data = (n.data ?? {}) as Record<string, unknown>;
          const titulo = n.title || (typeof data.title === "string" ? data.title : "") || "Kipu";
          const cuerpo = n.body  || (typeof data.body  === "string" ? data.body  : "");
          mostrarLocalAndroid(titulo, cuerpo, data).catch((err) =>
            console.warn("[FCM] ⚠️ No se pudo mostrar la notificación con la app abierta:", err));
        }
      }),
      // Tocó la notificación: abrir la pantalla que indica
      fm.addListener("notificationActionPerformed", (e) => {
        abrir(destinoNotificacion(e.notification.data));
      }),
      // Android: tocó la notificación local de arriba
      ...(esAndroid ? [
        import("@capacitor/local-notifications").then(({ LocalNotifications }) =>
          LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
            abrir(destinoNotificacion(e.notification.extra));
          })),
      ] : []),
      // Firebase renueva el token de vez en cuando: avisar al backend
      fm.addListener("tokenReceived", (e) => {
        enviarTokenNativo(e.token).catch(() => {});
      }),
    ]);
    return () => handles.forEach((h) => { void h.remove(); });
  } catch {
    return () => {};
  }
}
