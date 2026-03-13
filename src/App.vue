<template>
  <div class="min-h-screen flex flex-col bg-primary">
    
    <main class="flex-1 ">
      <RouterView />
    </main>
    <FooterNav v-if="route.name !== 'Auth' && route.name !== 'PinCode'" class=" fixed bottom-0 w-full z-50" />
    <div v-if="load" class=" fixed top-0 left-0 w-full h-full bg-black/80 z-50 grid place-content-center">
      <svg width="60" height="60" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff">
        <g fill="none" fill-rule="evenodd">
          <g transform="translate(1 1)" stroke-width="3">
            <circle stroke-opacity=".2" cx="18" cy="18" r="18"/>
            <path d="M36 18c0-9.94-8.06-18-18-18">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 18 18"
                to="360 18 18"
                dur="1s"
                repeatCount="indefinite"/>
            </path>
          </g>
        </g>
      </svg>
    </div>
    
    <TheNotifications/>
    <DebugConsole v-if="showDebug" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { requestNotificationPermission } from './composables/useFirebaseMessaging';
import FooterNav from './components/FooterNav.vue'
import { useMainStore } from './stores/main';
import { useChatsStore } from './stores/chats';
import { getAccessToken } from './api/tokens';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import TheNotifications from './components/TheNotifications.vue';

import DebugConsole from './components/DebugConsole.vue';
const showDebug = ref(true); // Включите для отладки

const route = useRoute()
const { load } = storeToRefs(useMainStore())


onMounted(async () => {
  if (getAccessToken()) {
    await useMainStore().setProfile()
    await useMainStore().setEmploye()
    await useChatsStore().setChats()
    
  }
  
})

const enableNotifications = async () => {
  await requestNotificationPermission();
};
</script>
