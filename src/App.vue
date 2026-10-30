<template>
  <div>


  </div>
  <div v-if="useMainStore().isOnline" class="min-h-screen flex flex-col bg-primary" :style="{ '--footer-nav-height': `${footerHeight}px` }">
    <main class="app-content flex-1">
      <!-- <FullScreenLoader :loading="load"/> -->
      <RouterView :key="route.name === 'Dialog' ? String(route.params.uuid) : 'page'" />
    </main>
    <FooterNav v-if="route.name !== 'Auth' && route.name !== 'PinCode'" class=" fixed bottom-0 w-full z-50" @height-change="footerHeight = $event" />
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
  <NoInt v-else/>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref } from 'vue';

import { setupCameraRecovery } from './composables/nativeCameraRecovery';

// Register during root setup, before routed attachment components mount.
setupCameraRecovery();

import FooterNav from './components/FooterNav.vue'
import { useMainStore } from './stores/main';
import { useChatsStore } from './stores/chats';
import { getAccessToken } from './api/tokens';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useIdleTimeout, IDLE_TIMEOUT_KEY } from './composables/useIdleTimeout';
import TheNotifications from './components/TheNotifications.vue';

import DebugConsole from './components/DebugConsole.vue';
import { setupFirebaseMessaging, setupNotificationClickListener } from './composables/useFirebaseMessaging';
import { isNativeApp } from './utils/native';
import { setupNativeMessaging } from './composables/useNativeMessaging';
import FullScreenLoader from './components/FullScreenLoader.vue';
import NoInt from './components/NoInt.vue';
const showDebug = ref(false); // Включите для отладки

const route = useRoute()
const footerHeight = ref(120)
const router = useRouter()
const { load } = storeToRefs(useMainStore())
let removeNativeMessaging: (() => void) | undefined
let removeNotificationClickListener: (() => void) | undefined


onMounted(async () => {
  removeNotificationClickListener = setupNotificationClickListener(router)
  if (isNativeApp()) {
    removeNativeMessaging = setupNativeMessaging(router)
    return
  }
  if (getAccessToken()) {
    
    
    await setupFirebaseMessaging()
  }
  
})

onBeforeUnmount(() => {
  removeNotificationClickListener?.()
  removeNativeMessaging?.()
})



const idleTimeout = useIdleTimeout();
provide(IDLE_TIMEOUT_KEY, idleTimeout);


</script>

<style scoped>
.app-content {
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
</style>
