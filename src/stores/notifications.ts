// stores/notifications.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotifyStore = defineStore('notify', () => {
  const items = ref<{ id: number; message: string; type: string }[]>([]);

  const add = (message: string, type = 'positive', duration = 3000) => {
    
    const id = Date.now();
    items.value.push({ id, message, type });
    console.log(items.value);
    setTimeout(() => remove(id), duration);
  };

  const remove = (id: number) => {
    items.value = items.value.filter(n => n.id !== id);
  };

  return { items, add, remove };
});
