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

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

// El backend manda mensajes SOLO DE DATOS — aquí decidimos cómo mostrarlos.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  if (!d.title) return;

  return self.registration.showNotification(d.title, {
    body:    d.body || "",
    icon:    "/icon.svg",
    badge:   "/icon.svg",
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
      for (const client of lista) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus()
            .then((c) => (c && "navigate" in c ? c.navigate(destino) : c))
            .catch(() => self.clients.openWindow(destino));
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});