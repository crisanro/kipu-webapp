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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Notificación background:", payload);
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "Kipu", {
    body:    body ?? "",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-192.png",
    image:   "/icons/icon-512.png",
    data:    payload.data ?? {},
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "Ver en Kipu" },
      { action: "close", title: "Cerrar" },
    ],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña de Kipu abierta — enfocarla
      for (const client of clientList) {
        if (client.url.includes("kipu.ec") && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Si no hay pestaña abierta — abrir una nueva
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});