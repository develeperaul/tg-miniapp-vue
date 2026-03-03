import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getChats, getMessgs, } from '../api/chats'
import type { ChatT, MessageT } from '../models/api'
import type { DataVal } from '../models'
export const useChatsStore = defineStore('chats', () => {
  const chats = ref<DataVal<ChatT[]>>({ loading: false, data: [] })
  const setChats = async () => {
    try {
      chats.value.data  = (await getChats()).data
    } catch (e) {
      throw e
    }
  }

  const messages = ref<MessageT[]>([])
  const setMessgs = async (chat_uuid: string) => {
    try {
     messages.value =  (await getMessgs(chat_uuid)).data
    } catch (e) {
      throw e
    }
  }

  return {
    chats,
    setChats,
    messages,
    setMessgs
  }
})
