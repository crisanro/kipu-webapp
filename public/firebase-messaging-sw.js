// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyDsweXTKVclHZP8O9SGT5IxCVHiIwo-q10",
  authDomain:        "kipu-cdo8wk.firebaseapp.com",
  projectId:         "kipu-cdo8wk",
  storageBucket:     "kipu-cdo8wk.firebasestorage.app",
  messagingSenderId: "264857219159",
  appId:             "1:264857219159:web:b9e58d8e4d1b70a923f312",
});

// Activar la versión nueva del SW de inmediato
self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

// El backend manda mensajes SOLO DE DATOS: aquí decidimos cómo mostrarlos.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};

  // Compatibilidad: si llega un mensaje con bloque "notification" (formato viejo),
  // el SDK ya lo muestra solo. No lo duplicamos.
  if (payload.notification && !d.title) return;

  return self.registration.showNotification(d.title || "Kipu", {
    body:    d.body || "",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-192.png",
    data:    { url: d.url || "/dashboard" },
    vibrate: [200, 100, 200],
    actions: [
      { action: "open",  title: "Ver en Kipu" },
      { action: "close", title: "Cerrar" },
    ],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const ruta    = (event.notification.data && event.notification.data.url) || "/dashboard";
  const destino = new URL(ruta, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      // Si ya hay una pestaña de Kipu abierta (mismo origen) — enfocarla y navegar
      for (const client of lista) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus()
            .then((c) => (c && "navigate" in c ? c.navigate(destino) : c))
            .catch(() => self.clients.openWindow(destino));
        }
      }
      // Si no hay pestaña abierta — abrir una nueva
      return self.clients.openWindow(destino);
    })
  );
});