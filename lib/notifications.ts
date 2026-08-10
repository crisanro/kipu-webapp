// lib/notifications.ts
import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import api from "./api";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Pedir permiso y registrar token FCM en el backend
export async function registrarNotificaciones(): Promise<boolean> {
  try {
    // Verificar soporte
    if (!("Notification" in window)) return false;
    if (!("serviceWorker" in navigator)) return false;

    // Pedir permiso
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return false;

    // Obtener messaging
    const messaging = await getFirebaseMessaging();
    if (!messaging) return false;

    // Registrar service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    // Obtener token FCM
    const token = await getToken(messaging, {
      vapidKey:           VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return false;

    // Guardar token en backend
    await api.post("/api/v1/app/notificaciones/fcm-token", { token });
    console.log("[FCM] Token registrado:", token.slice(0, 20) + "...");
    return true;

  } catch (e) {
    console.error("[FCM] Error registrando notificaciones:", e);
    return false;
  }
}

// Mostrar notificación local (cuando la app está abierta)
export function mostrarNotificacionLocal(titulo: string, cuerpo: string, url?: string) {
  if (Notification.permission !== "granted") return;
  const notif = new Notification(titulo, {
    body: cuerpo,
    icon: "/icon-192.png",
  });
  if (url) notif.onclick = () => window.open(url, "_blank");
}