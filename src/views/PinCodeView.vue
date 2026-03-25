<template>
  <div class="pin-page">
    <PinCode 
      :mode="mode"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PinCode from '../components/PinCode.vue';
import { IDLE_TIMEOUT_KEY } from '../composables/useIdleTimeout';
const route = useRoute();
const router = useRouter();
const idleTimeout = inject(IDLE_TIMEOUT_KEY);
// Определяем режим из query-параметра
const mode = computed(() => {
  return (route.query.mode as 'force' | 'setup' | 'enter') || 'enter';
});

const handleSuccess = () => {
  const redirectPath = sessionStorage.getItem('redirectAfterPin');
   
  if (redirectPath && redirectPath !== '/pin') {
    sessionStorage.removeItem('redirectAfterPin');
    router.push(redirectPath).then(() => {
      // После возврата на страницу перезапускаем таймер
      idleTimeout?.restartTimer();
    });
  } else {
    router.push('/').then(() => {
      idleTimeout?.restartTimer();
    }); // или другой путь по умолчанию
  }
  // const redirect = route.query.redirect as string || '/';
  // router.push(redirect);
};
</script>

<style scoped>
.pin-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
</style>