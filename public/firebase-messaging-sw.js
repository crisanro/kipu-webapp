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
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? "Kipu", {
    body:  body  ?? "",
    icon:  icon  ?? "/icon-192.png",
    badge: "/icon-192.png",
    data:  payload.data ?? {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});