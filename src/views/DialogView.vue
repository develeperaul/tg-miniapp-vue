<template>
  <div class="flex flex-col bg-white h-screen">
    <!-- header -->
    <header class="px-5 pt-5 pb-[46px] flex items-center justify-between fixed top-0 left-0 w-full bg-white">
      <div>
        <h1 class="text-2xl  font-bold">
          {{ dialog?.title ?? 'Диалог' }}
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

    <!-- messages -->
    <main ref="chatContainer" class="flex-1 overflow-y-auto px-5 pt-[100px] pb-[270px] space-y-3">
      <div
        v-if="!storeChat.messages.length"
        class="text-xs text-gray-400 mt-4"
      >
        Сообщений пока нет.
      </div>
      <div
        v-for="m in storeChat.messages"
        :key="m.uuid"
        class="flex"
        :class="{ 'justify-end': m.sender.type === 'mini_app' }"
      >
        <div
          class="max-w-[85%] rounded-[18px] px-4 py-3 space-y-1"
          :class="m.sender.type === 'bitrix'
            ? 'bg-white text-[#283048] border border-[#98C7F1]'
            : 'bg-[#E5F0FF] text-[#283048] '
          "
        >
          <div v-for="value in m.media" :key="value.url" class="grid-cols-2">
              <!-- Если это картинка -->
              <img 
                v-if="/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(value.url)" 
                :src="value.url" 
                style="width: 50px; height: 50px; border-radius: 16px; object-fit: cover;" 
                alt="Preview"
              >
              
              <!-- Если это документ (svg иконка) -->
              <div v-else style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border-radius: 16px;">
                <svg style="width: 100%; height: 100%;" viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org">
        
                    <path d="M60 20C37.9086 20 20 37.9086 20 60V400C20 422.091 37.9086 440 60 440H340C362.091 440 380 422.091 380 400V133.137C380 122.528 375.786 112.354 368.284 104.853L295.147 31.7157C287.646 24.2143 277.472 20 266.863 20H60Z" stroke="#231531" stroke-width="40" stroke-linejoin="round"/>
                    
                    
                    <path d="M260 20V100C260 122.091 277.909 140 300 140H380" stroke="#231531" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
                    
                    
                    <text x="50%" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="110" fill="#231531">DOC</text>
                  </svg>
              </div>

              <a :href="value.url" v-if="m.sender.type === 'bitrix'" class=" my-3 underline  text-blue-500 text-center text-sm" target="_blank">
                Скачать
              </a>
            </div>
          <p class="text-[13px] leading-snug">
            {{ m.text }}
          </p>
          <p class="text-[10px] text-gray-400">
            <!-- {{ dayjs(m.created_at).locale('ru').format('D MMMM (dd) HH:mm') }} -->
            {{ formatDate(m.created_at) }}
            <!-- <template v-if="m.authorName">
              &nbsp;•&nbsp;{{ m.authorName }}
            </template>
            <template v-if="m.authorRole">
              &nbsp;—&nbsp;{{ m.authorRole }}
            </template> -->
          </p>
        </div>
      </div>
      

    </main>

    <!-- input area -->
    <section
      class="border-t border-[#B6B6B6] bg-white px-4 pt-6 space-y-2 pb-[120px] fixed bottom-0 left-0 w-full"
    >
      <!-- прикреплённые файлы -->
      <div v-if="attachmentTiles.length" class="flex gap-2 flex-wrap">
        <FileTile
          v-for="f in attachmentTiles"
          :key="f.id"
          :id="f.id"
          :url="f.preview"
          :noimg="f.noimg"
          :loading="f.loading"
          @deleteFile="deleteAttachment"
        />
      </div>

      <div class="flex items-center gap-2">
        <!-- плюс (кнопка выбрать файл) -->
        <div class="w-[48px] h-[48px] flex items-center justify-center">
          <FileTile other @fileLoad="handleAttachFile" />
        </div>

        <!-- поле ввода -->
        <div class="flex-1 flex items-center rounded-[18px] ">
          <input
            v-model="messageText"
            type="text"
            placeholder="Напишите свое сообщение…"
            class="flex-1 text-sm outline-none border-none bg-transparent"
          />
        </div>

        <!-- отправить -->
        <button
          type="button"
          class="w-10 h-10 rounded-full flex items-center justify-center disabled:bg-gray-300"
          :disabled="!messageText.trim() && !attachmentTiles.length"
          @click="send"
        >
          <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.37732 24.9677L27.3452 14.2672L2.37732 3.56665V11.8895L20.2115 14.2672L2.37732 16.6449V24.9677Z" fill="#242F9B"/>
          </svg>

        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialogsStore } from '../stores/dialogs'
import FileTile from '../components/FileTile.vue'
import { storeToRefs } from 'pinia';
import { backButton } from '@telegram-apps/sdk'
import { getMessgs, sendMess } from '../api/chats'
import { useMainStore } from '../stores/main'
import { useChatsStore } from '../stores/chats'
import { uploadFile } from '../api/main'
import dayjs from 'dayjs';
import { formatDate } from '../utils/date';

interface ChatMessage {
  uuid: string;
  message: string | null;
  id: number;
}

type UiFile = {
  id: string
  preview: string
  noimg: boolean
  loading: boolean
  serverId?: string
}
const props = defineProps<{
  uuid: string
}>()

const storeChat = useChatsStore()
const mainStore = useMainStore()
const { profile } = storeToRefs(mainStore)
onMounted(async () => {
  await storeChat.setMessgs(props.uuid)
  await scrollToBottom()
  if (backButton.mount.isAvailable()) {
    backButton.mount()
    if (backButton.show.isAvailable()) backButton.show()
    if (backButton.onClick.isAvailable()) {
      offBack = backButton.onClick(() => {
        router.back()
      })
    }
  }  
  if(profile.value) 
  sse()
})
onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
});



const route = useRoute()
const router = useRouter()
const store = useDialogsStore()

const dialogId = route.params.id as string
const dialog = computed(() => store.getDialogById(dialogId).value)
const dialogMessages = computed(() => store.getMessagesByDialogId(dialogId).value)

const messageText = ref('')

// локальные прикрепления (пока нигде не используем, только UI)
const attachmentTiles = ref<UiFile[]>([])

let offBack: (() => void) | null = null

onBeforeUnmount(() => {
  if (backButton.hide.isAvailable()) backButton.hide()
  offBack?.()
})
const chatContainer = ref(null)
const scrollToBottom = async () => {
  
  
  await nextTick()
  if (chatContainer.value) {
    
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const messages = ref<ChatMessage[]>([]);
let eventSource: EventSource | null = null;
function sse() {
  // Открываем соединение при монтировании
  eventSource = new EventSource(`${import.meta.env.VITE_API_URL!}/events/chats/${profile.value?.uuid}`);

  // Слушаем стандартные сообщения
  eventSource.onmessage = (event: MessageEvent) => {
    try {
      console.log(event);
      
      // Парсим данные. Важно: в SSE данные приходят в поле 'data'
      const rawData = event.data as "ping" | string;
      if (rawData !== 'ping') {
        storeChat.setMessgs(props.uuid)
      }
      // const newMessage: ChatMessage = rawData.data || rawData;
      
      // messages.value.push(newMessage);
    } catch (err) {
      console.error('Ошибка парсинга SSE:', err);
    }
  };

  // Если сервер шлет кастомные события (например, event: typing)
   eventSource.addEventListener('typing', (event: MessageEvent) => {
    const typingData = JSON.parse(event.data);
    console.log('Печатает:', typingData);
  });

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
  };
  console.log(

    import.meta.env.VITE_API_URL!
  );
}
function goBack() {
  router.back()
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) +
    ', ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  )
}

// фейковый аплоад; сюда потом подключишь реальный API
async function uploadAttachment(file: File): Promise<{ id: string; url?: string }> {
  const res = (await uploadFile(file)).data
  
  return {
    id: res.uuid,
    url: res.url
  }
}

async function handleAttachFile(file: File) {
  const id = crypto.randomUUID()
  const isImage = file.type.startsWith('image/')
  const preview = isImage ? URL.createObjectURL(file) : file.name

  const item: UiFile = {
    id,
    preview,
    noimg: !isImage,
    loading: true
  }
  attachmentTiles.value.push(item)

  try {
    const uploaded = await uploadAttachment(file)
    const target = attachmentTiles.value.find(f => f.id === id)
    if (target) {
      target.loading = false
      target.serverId = uploaded.id
      if (uploaded.url && isImage) target.preview = uploaded.url
    }
  } catch {
    attachmentTiles.value = attachmentTiles.value.filter(f => f.id !== id)
  }
}

function deleteAttachment(id: string) {
  attachmentTiles.value = attachmentTiles.value.filter(f => f.id !== id)
}

// function send() {
  
//   const text = messageText.value.trim()
//   if (!text && !attachmentTiles.value.length) return
  
//   if (text) {
//     store.sendMessage(dialogId, text)
//   }
//   // файлы сейчас только в UI; логику отправки на сервер добавишь позже

//   messageText.value = ''
//   attachmentTiles.value = []
// }

const send = async () => {
  
  const text = messageText.value.trim()
  // if (!text && !attachmentTiles.value.length) return
  const imgUrls = attachmentTiles.value.map(f => { return { uuid: f.serverId || '' } })
  mainStore.load= true
  try {
    await sendMess(props.uuid, { images: imgUrls, text })
  } catch (e) {
      throw e
  } finally {
      mainStore.load= false
    }
    messageText.value = ''
    attachmentTiles.value = []
    storeChat.setMessgs(props.uuid)
}
</script>
