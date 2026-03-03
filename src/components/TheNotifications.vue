<!-- components/TheNotifications.vue -->
<script setup>
import { useNotifyStore } from '../stores/notifications';
const store = useNotifyStore();
</script>

<template>
  <div class="notification-container">
    <TransitionGroup name="list">
      <div v-for="n in store.items" :key="n.id" :class="['notification', n.type]">
        <span>{{ n.message }}</span>
        <button class="close-btn" @click="store.remove(n.id)">&times;</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.notification {
  min-width: 250px;
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}
.positive { background: #2ecc71; }
.negative { background: #e74c3c; }
.warning  { background: #f1c40f; color: #333; }

.close-btn {
  background: none; border: none; color: inherit;
  font-size: 22px; cursor: pointer; margin-left: 15px;
}

.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from { opacity: 0; transform: translateY(-20px); }
.list-leave-to { opacity: 0; transform: scale(0.9); }
</style>
