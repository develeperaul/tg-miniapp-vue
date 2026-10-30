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

function internalDestination(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  try {
    const base = new URL(window.location.href || window.location.origin);
    const url = new URL(value, base);
    const routePath = url.pathname.replace(/\/+$/, '').toLowerCase();
    if (url.protocol !== base.protocol || url.host !== base.host || ['/pin', '/auth'].includes(routePath)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

const handleSuccess = () => {
  // A newly tapped notification wins over the page saved by an older idle lock.
  const destination = internalDestination(route.query.redirect)
    ?? internalDestination(sessionStorage.getItem('redirectAfterPin'))
    ?? '/';
  sessionStorage.removeItem('redirectAfterPin');
  router.push(destination).then(() => {
    idleTimeout?.restartTimer();
  });
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
