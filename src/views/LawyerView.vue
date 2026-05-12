<template>
  <div class=" pt grid  min-h-screen" >

    <Card class="container  mt-3" title="Юрист">
      <div class=" grid gap-5">

        <div class=" grid gap-5">
          <router-link :to="{name: 'FNS'}" class="item-link">
            <div class=" item-link__content">
              <div class="item-link__title">
                Автоответ на требование
              </div>
              
            </div>
            <img class="item-link__bg" src="/create-order.png" alt="">  
          </router-link>
          <router-link :to="{name:'PodisFormLawyer',}" class="item-link">

            <div class=" item-link__content">
              <div class="item-link__title">
                Отправить документы
              </div>
              <div class="item-link__text">
                Cформировав пакет документов в ответ на требование продублируйте его нам, что б мы в случае запроса могли предоставить такие же
              </div>
            </div>
            <img class="item-link__bg" src="/podpis.png" alt="">  
          </router-link>
  
  
          
        </div>
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
  import Card from '../components/Card.vue';
import SdelkaItem from '../components/SdelkaItem.vue';
  import { storeToRefs } from 'pinia';
import { useChatsStore } from '../stores/chats';

import { useMainStore } from '../stores/main';
const { chats, messages } = storeToRefs(useChatsStore())
import { chat } from '../api/chats';
import { useRouter } from 'vue-router';
const store = storeToRefs(useMainStore())
const router = useRouter()
const toChat = async () => {
  if (store.currentEmpl.value) {
    store.load.value = true
    try {
      messages.value = []
      const chatsRes = (await chat(store.currentEmpl.value)).data;
        if (chatsRes.uuid) {
          router.push({ name: 'Dialog', params: {uuid: chatsRes.uuid}})
        }

    } catch (e) { throw e }
    finally {store.load.value = false}
    
  }
}
</script>
