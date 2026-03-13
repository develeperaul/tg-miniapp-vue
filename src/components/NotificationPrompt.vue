<template>
  <div v-if="shouldShowPrompt" class="notification-prompt">
    <div class="prompt-content">
      <p class="prompt-text">
        🔔 Разрешите уведомления, чтобы не пропустить сообщения от менеджера.
      </p>
      
      <!-- Специальное сообщение для iOS без PWA -->
      <div v-if="isIOS && !isStandalone" class="ios-message">
        <p>📱 На iPhone/iPad:</p>
        <ol class="ios-instructions">
          <li>Нажмите "Поделиться" <span class="icon">⎙</span></li>
          <li>Выберите "На экран «Домой»"</li>
          <li>Откройте приложение с главного экрана</li>
        </ol>
      </div>
      
      <div class="prompt-actions">
        <button
          @click="handleAllow"
          class="btn btn-allow"
          :disabled="isLoading || (isIOS && !isStandalone)"
        >
          {{ getButtonText() }}
        </button>
        <button
          @click="handleDismiss"
          class="btn btn-dismiss"
          :disabled="isLoading"
        >
          Не разрешать
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { requestNotificationPermission } from '../composables/useFirebaseMessaging';

const DISMISSED_KEY = 'notification_prompt_dismissed';

const isLoading = ref(false);
const dismissed = ref(false);

// Определяем Safari
const isSafari = computed(() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const vendor = navigator.vendor || '';
  return ua.includes('Safari') && 
         !ua.includes('Chrome') && 
         !ua.includes('Chromium') &&
         vendor.includes('Apple');
});

// Определяем iOS
const isIOS = computed(() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || 
         (ua.includes('Mac') && 'ontouchend' in document);
});

// Определяем, установлено ли приложение как PWA
const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone || 
         window.matchMedia('(display-mode: standalone)').matches;
});

// Firebase зарегистрирован
const isFirebaseRegistered = computed(() => {
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
});

// Показываем баннер
const shouldShowPrompt = computed(() => {
  // Всегда показываем на iOS без PWA
  if (isIOS.value && !isStandalone.value && !dismissed.value) {
    return true;
  }
  // Для остальных случаев
  return isSafari.value && !isFirebaseRegistered.value && !dismissed.value;
});

// Текст кнопки
const getButtonText = () => {
  if (isLoading.value) return 'Запрос...';
  if (isIOS.value && !isStandalone.value) return 'Установите PWA';
  return 'Разрешить';
};

onMounted(() => {
  const val = localStorage.getItem(DISMISSED_KEY);
  dismissed.value = val === 'true';
  
  console.log('📱 Состояние:', {
    isIOS: isIOS.value,
    isStandalone: isStandalone.value,
    permission: Notification.permission,
    showPrompt: shouldShowPrompt.value
  });
});

const handleAllow = async () => {
  // Для iOS без PWA - просто показываем инструкцию, кнопка disabled
  if (isIOS.value && !isStandalone.value) {
    return;
  }
  
  isLoading.value = true;
  try {
    const success = await requestNotificationPermission();
    
    
    if (success) {
      console.log('✅ Уведомления включены');
      setTimeout(() => window.location.reload(), 500);
    } else {
      console.log('❌ Не удалось включить уведомления');
      isLoading.value = false;
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    isLoading.value = false;
  }
};

const handleDismiss = () => {
  dismissed.value = true;
  localStorage.setItem(DISMISSED_KEY, 'true');
};
</script>

<style scoped>
.notification-prompt {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 50;
  display: grid;
  place-content: center;
  margin: 0 auto;
  padding: 20px;
  pointer-events: none;
}

.prompt-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  pointer-events: auto;
  max-width: 320px;
  width: 100%;
}

.prompt-text {
  font-size: 1rem;
  line-height: 1.4;
  text-align: center;
  color: #374151;
  margin-bottom: 1rem;
  font-weight: 500;
}

/* Стили для iOS инструкции */
.ios-message {
  background: #f0f9ff;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #bae6fd;
}

.ios-message p {
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.ios-instructions {
  margin: 0;
  padding-left: 1.2rem;
  color: #075985;
  font-size: 0.85rem;
}

.ios-instructions li {
  margin-bottom: 0.3rem;
}

.icon {
  font-size: 1.2rem;
}

.prompt-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  font-weight: 500;
  padding: 0.75rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  transition: background-color 0.2s, opacity 0.2s;
  border: none;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-allow {
  background-color: #3b82f6;
  color: white;
}

.btn-allow:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-allow:disabled {
  background-color: #94a3b8;
}

.btn-dismiss {
  background-color: #f3f4f6;
  color: #4b5563;
}

.btn-dismiss:hover:not(:disabled) {
  background-color: #e5e7eb;
}
</style>