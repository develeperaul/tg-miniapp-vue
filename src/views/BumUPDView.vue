<template>
  <div class=" pt grid min-h-screen" >

    <Card class="container  mt-3" title="Бумажный УПД">
      <div class=" grid   gap-5">

        <div class=" grid grid-cols-2 gap-5">
          <div class="item-linkvert">
            <img class="item-linkvert__bg" src="/oplatayest.png" alt="">  
            <div class=" item-linkvert__content">
              <div class="item-linkvert__title">
                С оплатой
              </div>
              <div class="item-linkvert__text">
                Краткое описание
              </div>
            </div>
          </div>
          <div class="item-linkvert">
            <img class="item-linkvert__bg" src="/oplatanet.png" alt="">  
            <div class=" item-linkvert__content">
              <div class="item-linkvert__title">
                Без оплаты
              </div>
              <div class="item-linkvert__text">
                Краткое описание
              </div>
            </div>
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
import SdelkaItem from '../components/SdelkaItem.vue';
  import { storeToRefs } from 'pinia';
import { useChatsStore } from '../stores/chats';
const { chats } = storeToRefs(useChatsStore())
</script>
