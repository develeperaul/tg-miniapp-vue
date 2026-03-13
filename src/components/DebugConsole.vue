<!-- components/DebugConsole.vue -->
<template>
  <div v-if="show" class="debug-console">
    <div class="debug-header" @click="minimized = !minimized">
      🐞 Консоль {{ minimized ? '🔽' : '🔼' }}
      <button @click.stop="clearLogs" class="debug-clear">🗑️</button>
    </div>
    <div v-if="!minimized" class="debug-logs">
      <div v-for="(log, i) in logs" :key="i" :class="'debug-' + log.type">
        <span class="debug-time">{{ log.time }}</span>
        <span class="debug-text">{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const show = ref(true);
const minimized = ref(false);
const logs = ref([]);

// Перехватываем console.log
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  addLog('log', args.join(' '));
  originalLog.apply(console, args);
};

console.error = (...args) => {
  addLog('error', args.join(' '));
  originalError.apply(console, args);
};

console.warn = (...args) => {
  addLog('warn', args.join(' '));
  originalWarn.apply(console, args);
};

const addLog = (type, text) => {
  logs.value.push({
    type,
    text,
    time: new Date().toLocaleTimeString()
  });
  // Ограничим количество логов
  if (logs.value.length > 50) logs.value.shift();
};

const clearLogs = () => {
  logs.value = [];
};

onMounted(() => {
  console.log('✅ DebugConsole загружен');
});
</script>

<style scoped>
.debug-console {
  position: fixed;
  bottom: 10px;
  left: 10px;
  right: 10px;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.9);
  color: #00ff00;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

.debug-header {
  padding: 8px;
  background: #333;
  color: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.debug-clear {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
}

.debug-logs {
  padding: 8px;
  overflow-y: auto;
  max-height: 150px;
}

.debug-log {
  color: #00ff00;
}

.debug-error {
  color: #ff6b6b;
}

.debug-warn {
  color: #ffd93d;
}

.debug-time {
  color: #888;
  margin-right: 5px;
}

.debug-text {
  word-break: break-word;
}
</style>