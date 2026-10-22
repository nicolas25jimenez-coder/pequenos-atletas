/// <reference lib="webworker" />
// Service worker: caché de la app (PWA) + notificaciones push en segundo plano (FCM).
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from './lib/config';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });

if (!firebaseConfig.projectId.startsWith('demo-')) {
  const messaging = getMessaging(initializeApp(firebaseConfig));
  onBackgroundMessage(messaging, (payload) => {
    const d = payload.data ?? {};
    self.registration.showNotification(d.titulo ?? 'Pequeños Atletas', {
      body: d.cuerpo ?? '',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      data: { enlace: d.enlace ?? '/' },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.enlace as string) ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});
