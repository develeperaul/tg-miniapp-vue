<template>
  <div class=" pt grid  min-h-screen" >

    <Card class="container  mt-3" title="Создание заявки">
      <div class=" grid   gap-5">
        <!-- для Бухгалтерия -->
        <!-- <a href="/" class=" text-blue-500 underline text-center text-lg  ">
            Скачать образец реестра
          </a> -->
        <PaymentForm @send="send"/>
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
import { chat, sendMess } from '../api/chats';
import Card from '../components/Card.vue';
import PaymentForm from '../components/PaymentForm.vue';
import SdelkaItem from '../components/SdelkaItem.vue';
import { storeToRefs } from 'pinia';
import { useChatsStore } from '../stores/chats';
const { chats } = storeToRefs(useChatsStore())
const send = async (vals: { text: string, images: { uuid: string }[]}) => {
  const chatsRes = (await chat("accountant")).data;
  if (chatsRes.uuid) {
    sendMess(chatsRes.uuid, vals)
  }
  }
</script>
