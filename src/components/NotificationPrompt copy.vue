<template>
  <div v-if="shouldShowPrompt" class="notification-prompt">
    <div class="prompt-content">
      <p class="prompt-text">
        🔔 Разрешите уведомления, чтобы не пропустить сообщения от менеджера.
      </p>
      <div class="prompt-actions">
        <button
          @click="handleAllow"
          class="btn btn-allow"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Запрос...' : 'Разрешить' }}
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

// Firebase зарегистрирован, если есть разрешение на уведомления
const isFirebaseRegistered = computed(() => {
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
});

// Показываем баннер
const shouldShowPrompt = computed(() => {
  return isSafari.value && !isFirebaseRegistered.value && !dismissed.value;
});

onMounted(() => {
  const val = localStorage.getItem(DISMISSED_KEY);
  dismissed.value = val === 'true';
});

const handleAllow = async () => {
  isLoading.value = true;
  try {
    const success = await requestNotificationPermission();
    
    if (success) {
      console.log('✅ Уведомления включены, обновляем страницу...');
      setTimeout(() => window.location.reload(), 500);
    } else {
      console.log('❌ Не удалось включить уведомления');
      isLoading.value = false;
    }
  } catch (error) {
    console.error('Ошибка:', error);
    isLoading.value = false;
  }
};

const handleDismiss = () => {
  dismissed.value = true;
  localStorage.setItem(DISMISSED_KEY, 'true');
};
</script>

<style scoped>
/* стили остаются без изменений */
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
  padding: 1rem;
  pointer-events: auto;
}

.prompt-text {
  font-size: 0.875rem;
  line-height: 100%;
  text-align: center;
  color: #374151;
  margin-bottom: 0.75rem;
}

.prompt-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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

.btn-dismiss {
  background-color: #f3f4f6;
  color: #4b5563;
}

.btn-dismiss:hover:not(:disabled) {
  background-color: #e5e7eb;
}


</style>