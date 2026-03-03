// stores/notifications.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotifyStore = defineStore('notify', () => {
  const items = ref([]);

  const add = (message, type = 'positive', duration = 3000) => {
    
    const id = Date.now();
    items.value.push({ id, message, type });
    console.log(items.value);
    setTimeout(() => remove(id), duration);
  };

  const remove = (id) => {
    items.value = items.value.filter(n => n.id !== id);
  };

  return { items, add, remove };
});
