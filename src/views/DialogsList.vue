<template>
  <div class="h-full flex flex-col bg-[#F4F5F9]">
    <!-- header -->
    <header class="px-5 pt-5 pb-3 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Диалоги</h1>
      <button
        class="flex items-center gap-1 text-xs text-[#28348A]"
        @click="goBack"
      >
        <span>Назад</span>
        <span
          class="w-6 h-6 rounded-full border border-[#28348A] flex items-center justify-center text-[10px]"
        >
          ←
        </span>
      </button>
    </header>

    <!-- list -->
    <section class="bg-white flex-1">
      <div v-if="chats.loading" class="px-5 py-4 text-sm text-gray-500">
        Загрузка…
      </div>

      <ul v-else class="divide-y divide-gray-200">
        <li
          v-for="d in chats.data"
          :key="d.id"
          class="px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-100"
          @click="openDialog(d.uuid)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-6 h-6 mt-1 rounded bg-[#28348A] flex items-center justify-center"
            >
              <span class="text-white text-xs">💬</span>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-semibold">{{ d.id }}</p>
              <p class="text-[11px] text-gray-500">
                {{ d.message.sender.type }}
              </p>
            </div>
          </div>
          <div class="text-[10px] text-gray-400 whitespace-nowrap ml-2">
            {{ formatDateTime(d.message.created_at) }}
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { backButton } from '@telegram-apps/sdk'
import { useChatsStore } from '../stores/chats';
import { storeToRefs } from 'pinia';
const { chats } = storeToRefs(useChatsStore())
const router = useRouter()


onMounted(async () => {
  // await store.fetchDialogs()

  // на этом экране backButton лучше спрятать (это «верхний» уровень)
  if (backButton.mount.isAvailable()) {
    backButton.mount()
    if (backButton.hide.isAvailable()) backButton.hide()
  }
})

function openDialog(id: string) {
  
  router.push({ name: 'Dialog', params: {uuid: id}})
}

function goBack() {
  router.back()
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>
