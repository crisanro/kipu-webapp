// lib/notifications.ts
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import api from "./api";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

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
    const yaRegistrado = sessionStorage.getItem("kipu-fcm-ok");
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
    sessionStorage.setItem("kipu-fcm-ok", "1");
    return true;
  } catch (e) {
    console.error("[FCM] ❌ Error:", e);
    return false;
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