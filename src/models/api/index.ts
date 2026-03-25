export type DataObj<T> = {
  data: T
}

export type EmployeeT = {
  uuid: string; type: string
}
export type ProfileT = {
  uuid: string; name: string, telegram_chat_id: string
}

export type ChatT = {
  id: number,
  uuid: string,
  message: MessageT,
  name: string,
  unread_messages_count: number
}

export type MessageT = {
    "uuid": string
    "text": string
    "sender": {
        "uuid": string
        "type": 'mini_app' | 'bitrix'
    },
    "created_at": string
    "media":
        {
            "url": string
        }[]
}

export type FNST = {
  id: string,
  message: {
    "text": string,
    "uuid": string,
    "sender": {
        "uuid": string,
        "type": "mini_app" | "bitrix"
      },
      "created_at": string,

    "media"?: 
          {
              "url": string
          }[]
  },
  uuid: string
  
    
}