// lib/notifications.ts
import { getToken, deleteToken, onMessage, type MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import api from "./api";

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

// ── Pedir permiso y registrar token FCM ───────────────────────────────────────
export async function registrarNotificaciones(): Promise<boolean> {
  try {
    // Si ya registramos en esta sesión, no volver a hacerlo
    const yaRegistrado = sessionStorage.getItem(FLAG_SESION);
    if (yaRegistrado) return true;

    if (!("Notification" in window)) return false;
    if (!("serviceWorker" in navigator)) return false;

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

  // 2. FCM: invalidar el token del navegador (el próximo login genera uno nuevo)
  try {
    const messaging = await getFirebaseMessaging();
    if (messaging) await deleteToken(messaging);
  } catch (e) {
    console.warn("[FCM] ⚠️ No se pudo eliminar el token local:", e);
  }
}

// ── Mensajes con la app abierta (primer plano) ────────────────────────────────
// Sin esto, si la pestaña está activa el push llega pero no se muestra nada.
export async function escucharPrimerPlano(
  onNueva?: (payload: MessagePayload) => void
): Promise<() => void> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    return onMessage(messaging, async (payload) => {
      const d      = payload.data ?? {};
      const titulo = d.title ?? payload.notification?.title ?? "Kipu";
      const cuerpo = d.body  ?? payload.notification?.body  ?? "";
      const url    = d.url   ?? "/dashboard";

      try {
        if (Notification.permission === "granted") {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.showNotification(titulo, {
              body:  cuerpo,
              icon:  "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              data:  { url },
            });
          } else {
            mostrarNotificacionLocal(titulo, cuerpo, url);
          }
        }
      } catch {}

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
    icon: "/icons/icon-192.png",
  });
  if (url) notif.onclick = () => window.open(url, "_blank");
}