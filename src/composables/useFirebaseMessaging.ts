import { isNativeApp } from '../utils/native';
import { escapeHtml } from '../utils/notification';
import { normalizePushPayload } from '../utils/pushPayload';
import { useNotifyStore } from '../stores/notifications';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { setFRB } from '../api/main';
import type { Router } from 'vue-router';

const APP_ICON = '/finclub-icon.png';

type NotificationTarget = {
  chatId?: string | number;
  chat_id?: string | number;
  messageId?: string | number;
  message_id?: string | number;
  url?: string;
};

export function getNotificationPath(payload: unknown): string | null {
  const data = normalizePushPayload(payload);
  const chatId = data.chatId;
  if (chatId !== undefined && chatId !== null && String(chatId).trim()) {
    try {
      const messageId = data.messageId;
      const query = messageId === undefined || messageId === null || !String(messageId).trim()
        ? ''
        : `?messageId=${encodeURIComponent(String(messageId))}`;
      return `/dialogs/${encodeURIComponent(String(chatId))}${query}`;
    } catch {
      // A malformed Unicode identifier must never break the notification listener.
      return null;
    }
  }

  // Accept only same-origin application paths supplied by the backend.
  if (data.url) {
    try {
      const url = new URL(data.url, window.location.origin);
      if (url.origin === window.location.origin && url.pathname.startsWith('/')) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Receives clicks from an already open service-worker controlled window. */
export function setupNotificationClickListener(router: Router) {
  if (isNativeApp() || !('serviceWorker' in navigator)) return () => undefined;

  const onMessage = (event: MessageEvent<{ type?: string; data?: NotificationTarget }>) => {
    if (event.data?.type !== 'NOTIFICATION_CLICK') return;
    const path = getNotificationPath(event.data.data ?? {});
    if (path) router.push(path).catch(console.error);
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Определяем Safari
// const isSafari = () => {
//   if (typeof navigator === 'undefined') return false;
//   const ua = navigator.userAgent;
//   const vendor = navigator.vendor || '';
//   return ua.includes('Safari') &&
//          !ua.includes('Chrome') &&
//          !ua.includes('Chromium') &&
//          vendor.includes('Apple');
// };

async function registerFirebaseSW() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const existingSW = registrations.find(
        reg => reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
      );

      if (existingSW) {
        console.log('Firebase SW уже зарегистрирован');
        return existingSW;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Firebase SW зарегистрирован:', registration);
      return registration;
    } catch (error) {
      console.error('Ошибка регистрации Firebase SW:', error);
    }
  }
  return null;
}


export async function setupFirebaseMessaging() {
  if (isNativeApp()) return false;
  try {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      const isStandalone = () => {
    // Для iOS (Safari)
    const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Для Android, Chrome и Desktop
    const isWebStandalone = window.matchMedia('(display-mode: standalone)').matches;

    return isIOSStandalone || isWebStandalone;
  };

  // Использование:
  if (isStandalone()) {
    console.log('🚀 Запущено как установленное PWA');
  } else {
    console.log('🌐 Открыто просто в браузере');
  }

    // 1. Проверка для iOS: уведомления работают ТОЛЬКО в PWA режиме
    if (isIOS && !isStandalone()) {
      console.log('📱 iOS: Нужно добавить сайт на экран "Домой"');
      return "NEED_INSTALL_PWA";
    }

    // 2. Проверка поддержки API (на iOS в обычном Safari тут будет false)
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.error('🚫 Браузер не поддерживает Push-уведомления');
      return false;
    }

    // 3. Запрос разрешения (Универсальный способ для iOS PWA и Android/Desktop)
    let permission = Notification.permission;

    if (permission === 'default') {
      console.log('🔔 Запрашиваем разрешение...');
      // ВАЖНО: сохраняем результат промиса, не полагаемся на Notification.permission сразу
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('❌ Разрешение не получено. Текущий статус:', permission);
      return false;
    }

    console.log('✅ Разрешение подтверждено');

    // 4. Регистрация Service Worker
    // Убедитесь, что файл лежит в корне: /firebase-messaging-sw.js
    const registration = await registerFirebaseSW();
    if (!registration) {
      console.error('🛠 Ошибка регистрации Service Worker');
      return false;
    }

    // 5. Инициализация Firebase
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('🔑 VAPID ключ отсутствует');
      return false;
    }

    // 6. Получение токена (передаем registration явно для надежности в iOS)
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {

      await setFRB(currentToken);
      return true;
    } else {
      console.warn('🎫 Токен не был получен. Проверьте манифест и SW.');
      return false;
    }

  } catch (error) {
    console.error('Не удалось включить уведомления');
    return false;
  }
}

// Вспомогательная функция (если нет своей)
function isSafari() {
  const ua = navigator.userAgent;
  const vendor = navigator.vendor;
  return vendor && vendor.indexOf('Apple') > -1 &&
         ua && ua.indexOf('CriOS') === -1 &&
         ua.indexOf('FxiOS') === -1;
}

// Слушаем сообщения (вызывается отдельно)
let unsubscribeMessages: (() => void) | undefined;
export function setupMessageListener() {
  if (isNativeApp() || unsubscribeMessages) return;
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    unsubscribeMessages = onMessage(messaging, (payload) => {

      const notify = useNotifyStore();

      if (payload.notification && document.visibilityState === 'visible') {
        notify.add(
          `Новое сообщение от: ${escapeHtml(payload.notification.title ?? "")}<br>Текст сообщения: ${escapeHtml(normalizePushPayload(payload).message)}`,
          'positive'
        );

        new Notification(payload.notification.title || 'Новое сообщение', {
          body: normalizePushPayload(payload).message,
          icon: payload.notification.icon || APP_ICON,
          badge: APP_ICON
        });
      }
    });
  } catch (error) {
    console.error('Ошибка настройки слушателя сообщений:', error);
  }
}

export async function requestNotificationPermission() {
  const result = await setupFirebaseMessaging();


  if (result) {
    setupMessageListener();
  }
  return result;
}
