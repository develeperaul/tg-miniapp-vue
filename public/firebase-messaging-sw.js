// public/firebase-messaging-sw.js
// Этот файл должен быть доступен по URL: https://ваш-сайт.ru/firebase-messaging-sw.js

// Импортируем Firebase библиотеки (используем compat версии для Service Worker)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ⚠️ ВАЖНО: Замените эти данные на свои из консоли Firebase
// Они должны совпадать с теми, что в .env файле
firebase.initializeApp({
  apiKey: "AIzaSyDc_chzM3d6T7o8AzIjLrDAAtD3xEOsOMw",
  authDomain: "spgmarket-1499484215126.firebaseapp.com",
  projectId: "spgmarket-1499484215126",
  storageBucket: "spgmarket-1499484215126.firebasestorage.app",
  messagingSenderId: "858305376392",
  appId: "1:858305376392:web:f2994ab3b6ad73d7d2af3d",
  measurementId: "G-MMWPM9MJRZ"
});



// Инициализируем Firebase Messaging
const messaging = firebase.messaging();

// 📨 Обработка фоновых сообщений (когда сайт закрыт)
messaging.onBackgroundMessage((payload) => {
  console.log('🔥 [firebase-messaging-sw.js] Получено фоновое сообщение:', payload);

  // Извлекаем данные из уведомления
  const notificationTitle = 'sss'+payload.notification?.title || 'Новое сообщение';
  const notificationBody = payload.notification?.body || 'У вас новое сообщение в чате';
  const notificationIcon = payload.notification?.icon || '/icon.png';
  
  // Данные для открытия нужного чата при клике
  const chatId = payload.data?.chatId || null;
  const messageId = payload.data?.messageId || null;

  // Настройки уведомления
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/badge.png', // Маленькая иконка в статус-баре
    vibrate: [200, 100, 200], // Вибрация для мобильных устройств
    data: {
      chatId: chatId,
      messageId: messageId,
      url: payload.data?.url || '/', // URL для открытия при клике
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '📱 Открыть чат'
      },
      {
        action: 'close',
        title: '❌ Закрыть'
      }
    ],
    // tag: 'chat-message', // Группировка уведомлений
    tag: 'message-group'
    // renotify: true // Уведомлять даже если есть такое же уведомление
  };

  // Показываем уведомление
    // return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 👆 Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [firebase-messaging-sw.js] Клик по уведомлению:', event);
  
  // Закрываем уведомление
  event.notification.close();

  // Получаем данные из уведомления
  const clickAction = event.action;
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  // Обработка действий
  if (clickAction === 'close') {
    // Просто закрываем уведомление (уже сделано выше)
    return;
  }

  // Для действия 'open' или просто клик по уведомлению
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    })
    .then((windowClients) => {
      // Проверяем, есть ли уже открытое окно нашего приложения
      for (let client of windowClients) {
        // Если окно открыто, фокусируемся на нем и отправляем сообщение
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Отправляем сообщение в открытое окно с данными о чате
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData
          });
          return client.focus();
        }
      }
      
      // Если нет открытого окна, открываем новое
      if (clients.openWindow) {
        // Можно открыть конкретный чат, если есть chatId
        const openUrl = notificationData.chatId 
          ? `/?chat=${notificationData.chatId}` 
          : urlToOpen;
        return clients.openWindow(openUrl);
      }
    })
  );
});

// 🔄 Обработка закрытия уведомления (опционально)
self.addEventListener('notificationclose', (event) => {
  console.log('❌ [firebase-messaging-sw.js] Уведомление закрыто:', event);
  // Можно отправить аналитику или выполнить другие действия
});

// 💪 Обработка push-событий напрямую (на всякий случай)
self.addEventListener('push', (event) => {
  console.log('📦 [firebase-messaging-sw.js] Получено push-событие:', event);
  
  // Firebase уже обрабатывает это через onBackgroundMessage,
  // но можно добавить свою логику если нужно
});

// 🚀 При установке Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ [firebase-messaging-sw.js] Service Worker установлен');
  self.skipWaiting(); // Активируем сразу
});

// 🚀 При активации Service Worker
self.addEventListener('activate', (event) => {
  console.log('✨ [firebase-messaging-sw.js] Service Worker активирован');
  event.waitUntil(clients.claim()); // Начинаем контролировать все клиенты сразу
});
