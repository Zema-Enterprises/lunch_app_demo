/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data: any = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  const title = data.title || 'LunchSync';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    data,
  };

  const notifyPromise = self.registration.showNotification(title, options);
  const broadcastPromise = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      const message = {
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload: {
          notificationId: data.notificationId || data.id,
          type: data.type,
          url: options.data?.url,
          receivedAt: new Date().toISOString(),
        },
      };
      clients.forEach((client) => {
        if (typeof client.postMessage === 'function') {
          client.postMessage(message);
        }
      });
    })
    .catch(() => undefined);

  event.waitUntil(Promise.all([notifyPromise, broadcastPromise]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          (client as WindowClient).postMessage({
            type: 'PUSH_NOTIFICATION_CLICK',
            payload: event.notification.data,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
