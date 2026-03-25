import { useNotifyStore } from '../stores/notifications';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { setFRB } from '../api/main';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
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
  try {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
      const isStandalone = () => {
    // Для iOS (Safari)
    const isIOSStandalone = window.navigator.standalone === true;

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
    if (isIOS && !isStandalone) {
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
      console.log('🎫 Токен получен:', currentToken);
      await setFRB(currentToken);
      return true;
    } else {
      console.warn('🎫 Токен не был получен. Проверьте манифест и SW.');
      return false;
    }

  } catch (error) {
    console.error('💥 Критическая ошибка setupFirebaseMessaging:', error);
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
export function setupMessageListener() {
  try {
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    
    onMessage(messaging, (payload) => {
      console.log('Получено сообщение в активном окне:', payload);
      const notify = useNotifyStore();
      
      if (payload.notification && document.visibilityState === 'visible') {
        notify.add(
          `Новое сообщение от: ${payload.notification.title}<br>Текст сообщения: ${payload.notification.body}`,
          'positive'
        );
        
        new Notification(payload.notification.title || 'Новое сообщение', {
          body: payload.notification.body,
          icon: payload.notification.icon || '/icon.png',
          badge: '/badge.png'
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