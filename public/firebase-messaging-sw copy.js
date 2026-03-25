// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Счетчик для отладки
let swMessageCounter = 0;

firebase.initializeApp({
  apiKey: "AIzaSyDc_chzM3d6T7o8AzIjLrDAAtD3xEOsOMw",
  authDomain: "spgmarket-1499484215126.firebaseapp.com",
  projectId: "spgmarket-1499484215126",
  storageBucket: "spgmarket-1499484215126.firebasestorage.app",
  messagingSenderId: "858305376392",
  appId: "1:858305376392:web:f2994ab3b6ad73d7d2af3d",
  measurementId: "G-MMWPM9MJRZ"
});

const messaging = firebase.messaging();

// ЕДИНСТВЕННЫЙ обработчик фоновых сообщений
messaging.onBackgroundMessage((payload) => {
  swMessageCounter++;
  
  // Добавляем идентификатор в само уведомление
  const uniqueId = `sw-${Date.now()}-${swMessageCounter}`;
  
  console.log(`🔥 [SW #${swMessageCounter}] Фоновое сообщение:`, payload);

  const notificationTitle = `[SW] ${payload.notification?.title || 'Новое сообщение'}`;
  const notificationBody = payload.notification?.body || 'У вас новое сообщение в чате';
  const notificationIcon = payload.notification?.icon || '/icon.png';
  
  const chatId = payload.data?.chatId || null;
  const messageId = payload.data?.messageId || null;

  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: {
      chatId: chatId,
      messageId: messageId,
      url: payload.data?.url || '/',
      timestamp: Date.now(),
      source: 'service-worker', // 👈 МЕТКА ИСТОЧНИКА
      uniqueId: uniqueId        // 👈 УНИКАЛЬНЫЙ ID
    },
    actions: [
      { action: 'open', title: '📱 Открыть чат' },
      { action: 'close', title: '❌ Закрыть' }
    ],
    tag: 'chat-message',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Клик по уведомлению:', event.notification.data);
  event.notification.close();
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ 
              type: 'NOTIFICATION_CLICK', 
              data: event.notification.data 
            });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          const url = event.notification.data?.chatId 
            ? `/?chat=${event.notification.data.chatId}` 
            : '/';
          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker установлен');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker активирован');
  event.waitUntil(clients.claim());
});