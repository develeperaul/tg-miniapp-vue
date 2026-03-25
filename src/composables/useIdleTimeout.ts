import { onMounted, onUnmounted, ref, provide, inject } from 'vue';
import { useRouter } from 'vue-router';
import { usePinCode } from './usePinCode';

// Ключ для provide/inject
export const IDLE_TIMEOUT_KEY = Symbol('idle-timeout');

export function useIdleTimeout(timeoutMs: number = 15 * 60 * 1000) {
  const { setSessionAuthenticated } = usePinCode();
  const router = useRouter();
  const idleTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRedirecting = ref(false);

  const excludedPaths = ['/pin', '/auth'];

  const resetTimer = () => {
    const currentPath = router.currentRoute.value.path;
    
    if (excludedPaths.includes(currentPath)) return;
    
    if (idleTimer.value) clearTimeout(idleTimer.value);
    idleTimer.value = setTimeout(() => {
      
      // Повторная проверка, так как путь мог измениться за время ожидания
      if (excludedPaths.includes(router.currentRoute.value.path)) return;

      if (!isIdleRedirecting.value) {
        isIdleRedirecting.value = true;
        const currentFullPath = router.currentRoute.value.fullPath;
        sessionStorage.setItem('redirectAfterPin', currentFullPath);
        setSessionAuthenticated(false);
        router.push('/pin');
      }
    }, timeoutMs);
  };

  const handleActivity = () => {
    const currentPath = router.currentRoute.value.path;
    if (excludedPaths.includes(currentPath)) return;

    isIdleRedirecting.value = false;
    resetTimer();
  };

  // Публичный метод для перезапуска таймера (например, после возврата с PIN)
  const restartTimer = () => {
    console.log('restart');
    
    if (idleTimer.value) clearTimeout(idleTimer.value);
    resetTimer();
  };

  onMounted(() => {
    console.log('ssss');
    
    resetTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
  });

  onUnmounted(() => {
    if (idleTimer.value) clearTimeout(idleTimer.value);
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keydown', handleActivity);
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('touchstart', handleActivity);
  });

  return { restartTimer };
}