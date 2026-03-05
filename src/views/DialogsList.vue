<template>
  <div class=" h-full min-h-screen bg-white">
    <!-- header -->
    <header class="px-5 pt-5 pb-[46px] flex items-center justify-between fixed top-0 left-0 w-full bg-white">
      <div>
        <h1 class="text-2xl  font-bold">
          Диалоги
        </h1>
      </div>
      <button
        class="flex items-center gap-1 text-xs text-[#242F9B33]"
        @click="goBack"
      >
        <span>Назад</span>
        <span
          class="w-[26px] h-[26px] rounded-full bg-[#242F9B33] text-[#B6B6B6] flex items-center justify-center text-[10px]"
        >
          <svg width="17" height="8" viewBox="0 0 17 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.146446 3.32845C-0.0488148 3.52372 -0.0488148 3.8403 0.146446 4.03556L3.32843 7.21754C3.52369 7.4128 3.84027 7.4128 4.03553 7.21754C4.2308 7.02228 4.2308 6.7057 4.03553 6.51044L1.20711 3.68201L4.03553 0.853581C4.2308 0.658319 4.2308 0.341736 4.03553 0.146474C3.84027 -0.0487882 3.52369 -0.0487881 3.32843 0.146474L0.146446 3.32845ZM16.5 3.68201L16.5 3.18201L0.5 3.18201L0.5 3.68201L0.5 4.18201L16.5 4.18201L16.5 3.68201Z" fill="#B6B6B6"/>
          </svg>

        </span>
      </button>
    </header>
    <main ref="chatContainer" class="flex-1 overflow-y-auto px-5 pt-[100px] pb-[170px] space-y-3">

      <!-- list -->
      <section class="bg-white flex-1">
        <div v-if="chats.loading" class="px-5 py-4 text-sm text-gray-500">
          Загрузка…
        </div>
  
        <ul v-else class="divide-y divide-[#B6B6B6]">
          <li
            v-for="d in chats.data"
            :key="d.id"
            class="px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-100"
            @click="openDialog(d.uuid)"
          >
            <div class="flex items-start gap-3">
              <div
                class=""
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M4.0588e-06 0.775032V10.2369C-0.000326143 10.3387 0.0194943 10.4397 0.0583246 10.5338C0.0971548 10.628 0.154228 10.7136 0.226259 10.7856C0.29829 10.8577 0.383856 10.9147 0.478032 10.9536C0.572208 10.9924 0.673134 11.0122 0.775 11.0119H10.32C10.5243 11.0158 10.7201 11.0948 10.8699 11.2339L14.2584 14.87C14.319 14.9319 14.3968 14.9742 14.4817 14.9914C14.5666 15.0086 14.6547 14.9999 14.7346 14.9664C14.8144 14.933 14.8825 14.8763 14.9298 14.8038C14.9771 14.7312 15.0015 14.6461 14.9999 14.5595V0.775032C15.0003 0.673161 14.9804 0.572231 14.9416 0.478051C14.9028 0.383871 14.8457 0.298302 14.7737 0.226268C14.7016 0.154234 14.6161 0.0971588 14.5219 0.0583269C14.4277 0.0194951 14.3268 -0.000326156 14.2249 4.05897e-06H0.775C0.673134 -0.000326156 0.572208 0.0194951 0.478032 0.0583269C0.383856 0.0971588 0.29829 0.154234 0.226259 0.226268C0.154228 0.298302 0.0971548 0.383871 0.0583246 0.478051C0.0194943 0.572231 -0.000326143 0.673161 4.0588e-06 0.775032Z" fill="#242F9B"/>
                </svg>
  
              </div>
              <div class="space-y-1">
                <p class="text-sm font-semibold">Чат №{{ d.id }}</p>
                <div class="text-[10px] text-gray-400 whitespace-nowrap" v-if="d.message">
                  {{ formatDateTime(d.message.created_at) }}
                </div>
                <!-- <p class="text-[11px] text-gray-500" v-if="d.message">
                  {{ d.message.sender.type }}
                </p> -->
              </div>
            </div>
            <!-- <div class="text-[10px] text-gray-400 whitespace-nowrap ml-2" v-if="d.message">
              {{ formatDateTime(d.message.created_at) }}
            </div> -->
          </li>
        </ul>
      </section>
    </main>
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
  // await useChatsStore().fetchDialogs()

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
