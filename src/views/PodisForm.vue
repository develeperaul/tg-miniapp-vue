<template>
  <div class=" pt grid min-h-screen" >

    <Card class="container  mt-3" title=" Подписать документы">
      <div class=" grid   gap-5">
        
        <DocsForm btntitle="Отправить"  @send="send"/>
        <div>
          <div class=" h2 mb-15">
            Активные чаты
          </div>
          <div class=" grid gap-15">
            <SdelkaItem theme="blue" :chat="value" v-for="value in chats.data"/>
          </div>
        </div>
      </div>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { chat, sendMess } from '../api/chats';
import Card from '../components/Card.vue';
  import PaymentForm from '../components/PaymentForm.vue';
import SdelkaItem from '../components/SdelkaItem.vue';
import { useMainStore } from '../stores/main';
import { storeToRefs } from 'pinia';
import { useChatsStore } from '../stores/chats';
import { ref } from 'vue';
import DocsForm from '../components/DocsForm.vue';
const { chats, messages } = storeToRefs(useChatsStore())

const props = defineProps<{
  type: string
  title: string
}>()
const store = useMainStore()
const router = useRouter()

const toChat = async () => {
  if (store.currentEmpl) {
    store.load = true
    try {
      messages.value = []
      const chatsRes = (await chat(store.currentEmpl)).data;
        if (chatsRes.uuid) {
          router.push({ name: 'Dialog', params: {uuid: chatsRes.uuid}})
        }

    } catch (e) { throw e }
    finally {store.load = false}
    
  }
}

const send = async (vals: { text: string, images: { uuid: string }[] }) => {
  
  if (store.currentEmpl) {
    store.load = true
    try {
      messages.value = []
      const chatsRes = (await chat(store.currentEmpl)).data;
      if (chatsRes.uuid) {
  
        await sendMess(chatsRes.uuid, { ...vals, text: `${vals.text}` })
        router.push({ name: 'Dialog', params: {uuid: chatsRes.uuid}})
      }

    } catch (e) { throw e }
    finally {store.load = false}
    
  }
  }
</script>
