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
  let messageRequest = 0
  let activeChat = ''
  const setMessgs = async (chat_uuid: string) => {
    const request = ++messageRequest
    if (activeChat !== chat_uuid) {
      activeChat = chat_uuid
      messages.value = []
    }
    try {
      const result = await getMessgs(chat_uuid)
      // A late response from the previously open chat must not replace the push destination.
      if (request === messageRequest) messages.value = result.data
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
