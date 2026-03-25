<template>
  <div class=" container pt-5 pb-[120px] space-y-5 ">
    <svg class=" absolute top-0 left-0" width="299" height="336" viewBox="0 0 299 336" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="41" cy="78" r="258" fill="#3A44A5"/>
    </svg>
    <svg class=" absolute bottom-0 right-0" width="354" height="415" viewBox="0 0 354 415" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="258" cy="258" r="258" fill="#3A44A5"/>
    </svg>

    <div class=" relative">

      <div class=" flex justify-between items-center mb-[42px]">
        <div class=" h1 text-white ">
          Привет,
          <br/>
          {{ nameP }}
        </div>
        
  
      </div>
      <div class=" grid   ">
        <div class=" flex justify-between items-center mb-4">
    
          <div class=" h2 text-white">
            Обращения
          </div>
          <router-link   :to="{name:'DialogsList'}" class=" underline txt-lg text-white">
            Просмотреть
          </router-link>
        </div>
        <div class=" grid gap-5">
          <div  class=" grid grid-cols-2 gap-5">
            <router-link v-if="store.employeesKeys.value?.manager"  :to="{name:'Operator'}" class=" max-w-[160px] bg-white grid gap-2.5 rounded-[10px] overflow-hidden">
              <div class=" max-h-[169px] rounded-[10px] overflow-hidden" style="box-shadow: 0px 4px 17px 0px #00000033;">
                <img src="/operator.png" alt="">  
              </div>
              <div  class=" text-center grid gap-1.5 justify-center pt-2.5 pb-3 px-3">
                <div class=" txt-lg2 font-semibold">
                  Оператор
                </div>
                <div class=" text-gray2">Создание заявок</div>
              </div>
            </router-link>
            <router-link v-if="store.employeesKeys.value?.accountant" :to="{name:'Buhg'}" class=" max-w-[160px] bg-white grid gap-2.5  rounded-[10px] overflow-hidden">
              <div class=" max-h-[169px] rounded-[10px] overflow-hidden" style="box-shadow: 0px 4px 17px 0px #00000033;">
                <img src="/buhg.jpg" alt="">  
              </div>
              <div class=" text-center grid gap-1.5 justify-center pt-2.5 pb-3 px-3">
                <div class=" txt-lg2 font-semibold">
                  Бухгалтерия
                </div>
                <div class=" text-gray2">Работа с УПД и подписи</div>
              </div>
            </router-link>
          </div>
          
          <div class=" flex  gap-5">
            
            <router-link v-if="store.employeesKeys.value?.lawyer" :to="{name:'FNS'}"   class=" tab " >
              Юрист
            </router-link>
            <div  v-if="store.employeesKeys.value?.economist" class=" tab " @click="startOtherChat(store.employeesKeys.value?.economist)" >
              Экономист
            </div>
            <div  v-if="store.employeesKeys.value?.reconciliation" class=" tab " @click="toChat(store.employeesKeys.value?.reconciliation)" >
              Сверка
            </div>
            <div  v-if="store.employeesKeys.value?.alihorka" class=" tab " @click="toChat(store.employeesKeys.value?.alihorka)" >
              Алехорка
            </div>
            
          </div>

        </div>
        <div class=" mt-5">
          <div class=" h2 text-white mb-15">
            Активные чаты
          </div>
          <div class=" grid gap-15">
            <SdelkaItem :chat="value" v-for="value in chats.data"/>
          </div>
        </div>
        
      </div>
      <div @click="logout" class=" mt-3 text-white border h-10 flex items-center justify-center border-white text-lg  rounded-full hover:text-black hover:bg-white">
          Выйти
        </div>
    </div>
    
  </div>
  <NotificationPrompt/>
</template>

<script setup lang="ts">
import NotificationPrompt from '../components/NotificationPrompt.vue';
import { chat } from '../api/chats';
  import { storeToRefs } from 'pinia';
import SdelkaItem from '../components/SdelkaItem.vue';
import { useMainStore } from '../stores/main';
import { computed } from '@vue/reactivity';
import { useChatsStore } from '../stores/chats';
import { useRouter } from 'vue-router';
import { cleanTokensData } from '../api/tokens';
import { usePinCode } from '../composables/usePinCode';
const { chats, messages } = storeToRefs(useChatsStore())
const store = storeToRefs(useMainStore())
const storeChat = useChatsStore()
const objKeys = computed(() => {
    return store.employeesKeys.value
})
const router = useRouter();
const startOtherChat = async (uuid: string) => {
  console.log(uuid);
  
  store.load.value = true;
  console.log(store.load.value);
  try {
    const chatsRes = (await chat(uuid)).data;
    router.push({ name: 'Dialog', params: {uuid: chatsRes.uuid}})
  } 
  catch (e) {
    
    throw e
  } finally {
    store.load.value = false;
   }
}
const nameP = computed(() => {
  if (store.profile.value) return store.profile.value.name
  return ''
})
const logout = () => {
  const {resetPinOnLogout} = usePinCode()
  cleanTokensData()
  store.profile.value = null;
  resetPinOnLogout()
  router.push({name:'Auth'})
}

const toChat = async (id:string) => {
  if (store.currentEmpl) {
    store.load.value = true
    try {
      messages.value = []
      const chatsRes = (await chat(id)).data;
        if (chatsRes.uuid) {
          router.push({ name: 'Dialog', params: {uuid: chatsRes.uuid}})
        }

    } catch (e) { throw e }
    finally {store.load.value = false}
    
  }
}

  
</script>
