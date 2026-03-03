import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type DialogMessage = {
  id: string
  dialogId: string
  from: 'user' | 'operator'
  authorName: string
  authorRole?: string
  text: string
  createdAt: string // ISO
}

export type DialogItem = {
  id: string
  title: string
  lastMessagePreview: string
  updatedAt: string
}

export const useDialogsStore = defineStore('dialogs', () => {
  const dialogs = ref<DialogItem[]>([])
  const messages = ref<Record<string, DialogMessage[]>>({})
  const loadingDialogs = ref(false)
  const loadingMessages = ref(false)

  const getDialogById = (id: string) =>
    computed(() => dialogs.value.find(d => d.id === id) || null)

  const getMessagesByDialogId = (id: string) =>
    computed(() => messages.value[id] || [])

  async function fetchDialogs() {
    if (dialogs.value.length) return
    loadingDialogs.value = true
    try {
      // пока mock, потом заменишь на API
      dialogs.value = [
        {
          id: '1',
          title: 'Диалог №1',
          lastMessagePreview: 'Последнее сообщение/или результат диалога',
          updatedAt: '2025-08-12T11:33:00'
        },
        {
          id: '2',
          title: 'Диалог №2',
          lastMessagePreview: 'Последнее сообщение/или результат диалога',
          updatedAt: '2025-08-13T20:05:00'
        }
      ]
    } finally {
      loadingDialogs.value = false
    }
  }

  async function fetchMessages(dialogId: string) {
    if (messages.value[dialogId]) return
    loadingMessages.value = true
    try {
      // mock-сообщения
      messages.value[dialogId] = [
        {
          id: 'm1',
          dialogId,
          from: 'operator',
          authorName: 'Петров Тимур',
          authorRole: 'Бухгалтер',
          text:
            'В рамках спецификации современных стандартов, некоторые особенности внутренней политики могут быть рассмотрены исключительно в разрезе маркетинговых и финансовых предпосылок.',
          createdAt: '2025-08-12T10:30:00'
        },
        {
          id: 'm2',
          dialogId,
          from: 'user',
          authorName: 'Вы',
          text:
            'Высокотехнологичная концепция общественного уклада обеспечивает актуальность позиций, занимаемых участниками в отношении поставленных задач.',
          createdAt: '2025-08-12T11:30:00'
        }
      ]
    } finally {
      loadingMessages.value = false
    }
  }

  function sendMessage(dialogId: string, text: string) {
    const msg: DialogMessage = {
      id: crypto.randomUUID(),
      dialogId,
      from: 'user',
      authorName: 'Вы',
      text,
      createdAt: new Date().toISOString()
    }
    if (!messages.value[dialogId]) messages.value[dialogId] = []
    messages.value[dialogId].push(msg)

    const dialog = dialogs.value.find(d => d.id === dialogId)
    if (dialog) {
      dialog.lastMessagePreview = text
      dialog.updatedAt = msg.createdAt
    }
  }

  return {
    dialogs,
    loadingDialogs,
    loadingMessages,
    getDialogById,
    getMessagesByDialogId,
    fetchDialogs,
    fetchMessages,
    sendMessage
  }
})
