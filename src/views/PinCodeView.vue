<template>
  <div class="pin-page">
    <PinCode 
      :mode="mode"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PinCode from '../components/PinCode.vue';

const route = useRoute();
const router = useRouter();

// Определяем режим из query-параметра
const mode = computed(() => {
  return (route.query.mode as 'force' | 'setup' | 'enter') || 'enter';
});

const handleSuccess = () => {
  const redirect = route.query.redirect as string || '/';
  router.push(redirect);
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