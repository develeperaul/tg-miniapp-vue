<template>
  <div class=" pt grid min-h-screen" >

    <Card class="container  mt-3" title="Запрос номера УПД">
      <div class=" grid   gap-5">

        <div class=" grid grid-cols-2 gap-5">
          <router-link :to="{name:'Form1', params:{ title: 'Бумажный УПД',type: 'bum'}}" class="item-linkvert">
            <img class="item-linkvert__bg" src="/bum.png" alt="">  
            <div class=" item-linkvert__content">
              <div class="item-linkvert__title">
                Бумажный
              </div>
              <div class="item-linkvert__text">
                Краткое описание
              </div>
            </div>
          </router-link>
          <router-link :to="{name:'Form1', params:{ title: 'Электронный УПД',type: 'opl'}}" class="item-linkvert">
            <img class="item-linkvert__bg" src="/electr.png" alt="">  
            <div class=" item-linkvert__content">
              <div class="item-linkvert__title">
                Электронный
              </div>
              <div class="item-linkvert__text">
                Краткое описание
              </div>
            </div>
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
  const { chats } = storeToRefs(useChatsStore())
</script>
