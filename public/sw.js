const CACHE = "lta-montaje-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || "LTA Montaje", {
      body: data.body || "",
      icon: "/lasttour-logo.png",
      badge: "/lasttour-logo.png",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});
