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
  const loadingMessages = ref(false)
  const loadingMessagesProgress = ref(0)
  const setMessgs = async (chat_uuid: string) => {
    loadingMessages.value = true
    loadingMessagesProgress.value = 0
    try {
      const loadedMessages: MessageT[] = []
      let page = 1
      let lastPage = 1

      do {
        const response = await getMessgs(chat_uuid, page)
        loadedMessages.push(...response.data)
        lastPage = response.last_page ?? response.meta?.last_page ?? page
        loadingMessagesProgress.value = Math.round((page / lastPage) * 100)
        page = (response.current_page ?? response.meta?.current_page ?? page) + 1
      } while (page <= lastPage)

      messages.value = loadedMessages
    } catch (e) {
      throw e
    } finally {
      loadingMessages.value = false
    }
  }

  return {
    chats,
    setChats,
    messages,
    loadingMessages,
    loadingMessagesProgress,
    setMessgs
  }
})
