<template>
  <!-- Используем Teleport, чтобы слой всегда был поверх всех элементов body -->
  <teleport to="body">
    <div v-if="loading" class="overlay">
      <div class="spinner"></div>
    </div>
  </teleport>
</template>

<script setup>
defineProps({
  loading: Boolean
});
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* Черный с прозрачностью 50% */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db; /* Цвет активной части */
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
