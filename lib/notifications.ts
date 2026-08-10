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
    console.log("[FCM] Iniciando registro...");

    if (!("Notification" in window)) {
      console.log("[FCM] ❌ Notifications no soportado");
      return false;
    }
    if (!("serviceWorker" in navigator)) {
      console.log("[FCM] ❌ ServiceWorker no soportado");
      return false;
    }

    const permiso = await Notification.requestPermission();
    console.log("[FCM] Permiso:", permiso);
    if (permiso !== "granted") return false;

    const messaging = await getFirebaseMessaging();
    console.log("[FCM] Messaging:", messaging ? "✅" : "❌ null");
    if (!messaging) return false;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("[FCM] SW registrado:", registration.scope);

    const token = await getToken(messaging, {
      vapidKey:                  VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    console.log("[FCM] Token:", token ? token.slice(0, 20) + "..." : "❌ null");
    if (!token) return false;

    // ← Enviar token + device_id
    await api.post("/api/v1/app/notificaciones/fcm-token", {
      token,
      device_id: getDeviceId(),
    });
    console.log("[FCM] ✅ Token guardado en backend");
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