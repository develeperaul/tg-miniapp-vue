<template>
  <router-view />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { watch } from 'vue'
import { useChatsStore } from '../stores/chats'
import { useMainStore } from '../stores/main'
const route = useRoute()
const chatsStore = useChatsStore()
const mainStore = useMainStore()
watch(() => route.fullPath, async () => {
  try {
    await Promise.all([
      chatsStore.setChats(),
      mainStore.employeesKeys ? Promise.resolve() : mainStore.setEmploye(),
    ])
  } catch {
    console.error('Не удалось обновить список чатов раздела')
  }
}, { immediate: true })
</script>
