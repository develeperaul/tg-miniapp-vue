<template>
  <div class="pin-container">
    <h2>{{ title }}</h2>
    <p v-if="description" class="description">{{ description }}</p>
    
    <div class="pin-inputs">
      <input
        v-for="(_, index) in 4"
        :key="index"
        ref="inputs"
        type="password"
        inputmode="numeric"
        maxlength="1"
        v-model="digits[index]"
        @input="onInput(index)"
        @keydown.delete="onDelete(index)"
        class="pin-digit"
        :class="{ error: showError }"
      />
    </div>

    <p v-if="showError" class="error-message">{{ errorMessage }}</p>

    <button
      v-if="isPinComplete"
      @click="handleSubmit"
      class="confirm-btn"
      :disabled="loading"
    >
      {{ loading ? 'Обработка...' : buttonText }}
    </button>
    <button
      v-if="showError"
      @click="logout"
      class="confirm-btn"
      :disabled="loading"
    >
      Выйти
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { usePinCode } from '../composables/usePinCode';
import { cleanTokensData } from '../api/tokens';
import { storeToRefs } from 'pinia';
import { useMainStore } from '../stores/main';
import { useRouter } from 'vue-router';

const props = defineProps<{
  mode: 'force' | 'setup' | 'enter';
}>();

const emit = defineEmits(['success']);

const { savePin, verifyPin, setSessionAuthenticated } = usePinCode();

const digits = ref(['', '', '', '']);
const inputs = ref<HTMLInputElement[]>([]);
const loading = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const router = useRouter()
const store = storeToRefs(useMainStore())
// Заголовок в зависимости от режима
const title = computed(() => {
  switch (props.mode) {
    case 'force':
    case 'setup':
      return 'Установите 4-значный код';
    case 'enter':
      return 'Введите код';
  }
});

// Описание
const description = computed(() => {
  switch (props.mode) {
    case 'force':
      return 'Для защиты аккаунта установите пин-код';
    case 'setup':
      return 'Придумайте пин-код для входа';
    case 'enter':
      return 'Введите ваш пин-код для продолжения';
    default:
      return '';
  }
});

// Текст кнопки
const buttonText = computed(() => {
  switch (props.mode) {
    case 'force':
    case 'setup':
      return 'Установить код';
    case 'enter':
      return 'Войти';
  }
});

// Проверка, заполнен ли пин
const isPinComplete = computed(() => digits.value.every(d => d));

// Выход
const logout = () => {
  const {resetPinOnLogout} = usePinCode()
  cleanTokensData()
  store.profile.value = null;
  resetPinOnLogout()
  router.push({name:'Auth'})
}
onMounted(() => {
  inputs.value[0]?.focus();
});

// Следим за сменой режима
watch(() => props.mode, () => {
  digits.value = ['', '', '', ''];
  showError.value = false;
  nextTick(() => {
    inputs.value[0]?.focus();
  });
});

const onInput = (index: number) => {
  if (digits.value[index] && index < 3) {
    nextTick(() => {
      inputs.value[index + 1]?.focus();
    });
  }
  showError.value = false;
};

const onDelete = (index: number) => {
  if (!digits.value[index] && index > 0) {
    digits.value[index - 1] = '';
    nextTick(() => {
      inputs.value[index - 1]?.focus();
    });
  }
};

const handleSubmit = async () => {
  loading.value = true;
  const pin = digits.value.join('');
  
  // Режимы установки (force или setup)
  if (props.mode === 'force' || props.mode === 'setup') {
    savePin(pin);
    setSessionAuthenticated(true);
    emit('success');
  }
  
  // Режим входа
  if (props.mode === 'enter') {
    if (verifyPin(pin)) {
      setSessionAuthenticated(true);
      emit('success');
    } else {
      showError.value = true;
      errorMessage.value = 'Неверный пин-код';
      digits.value = ['', '', '', ''];
      inputs.value[0]?.focus();
    }
  }
  
  loading.value = false;
};
</script>

<style scoped>
.pin-container {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.description {
  color: #666;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.pin-inputs {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.pin-digit {
  width: 60px;
  height: 70px;
  text-align: center;
  font-size: 2rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  outline: none;
  transition: all 0.2s;
}

.pin-digit:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.pin-digit.error {
  border-color: #dc2626;
  animation: shake 0.2s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.confirm-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
}

.confirm-btn:hover:not(:disabled) {
  background: #2563eb;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>