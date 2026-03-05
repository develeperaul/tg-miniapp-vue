<template>
  <div class=" pt  grid min-h-screen" >

    <Card class="container   mt-3" title="Оператор">
      <div class=" grid gap-5">
        <div class=" grid gap-5">
          <!-- <div @click="setOrder "   class="item-link"> -->
          <router-link :to="{name:'Form1', params:{ title: 'Создать заявку', type: 'op'}}" class="item-link">
            <div class=" item-link__content">
              <div class="item-link__title">
                Создать заявку
              </div>
              <div class="item-link__text">
                Сформировать заявку с указанием суммы и темы оплаты.
                <!-- Здесь описание - консультация с <br> широким активом представляет <br> собой интересный эксперимент. -->
              </div>
            </div>
            <img class="item-link__bg" src="/create-order.png" alt="">  
          </router-link>
          <div class="item-link">
            <div class=" item-link__content" @click="toChat">
              <div class="item-link__title">
                Написать сообщение
              </div>
              <div class="item-link__text">
                Перейти в диалог с оператором.
              </div>
            </div>
            <img class="item-link__bg" src="/pen.png" alt="">  
          </div>
  
  
          
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
import { storeToRefs } from 'pinia';
import SdelkaItem from '../components/SdelkaItem.vue';
import { useMainStore } from '../stores/main';
import { computed } from '@vue/reactivity';
import { useRouter } from 'vue-router';
import { useChatsStore } from '../stores/chats';
const { chats, messages} = storeToRefs(useChatsStore())
import { chat } from '../api/chats';
const router = useRouter()
const store = storeToRefs(useMainStore())
const objKeys = computed(() => {
    return store.employeesKeys.value
})
const setOrder = () => {
 
  router.push({name:'Order'})
}
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
