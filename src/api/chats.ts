import { type ChatT, type DataObj, type FNST, type MessageT } from '../models/api'
import { api } from './index'

export const getChats = (): Promise<DataObj<ChatT[]>> => {
  return api.mainKy
    ('chats')
    .json()
}
export const chat = (connector_uuid: string): Promise<DataObj<{
        "uuid": string,
        "id": number
    }>> => {
  return api.mainKy
    .post(`chats/${connector_uuid}`)
    .json()
}
export const getMessgs = (chat_uuid: string): Promise<DataObj<MessageT[]>> => {
  return api.mainKy(`chats/${chat_uuid}/messages`)
    .json()
}
export const sendMess = (chat_uuid: string, obj:{
  text: string,
  images: {uuid: string}[]
}): Promise<DataObj<'ok'>> => {
  return api.mainKy
    .post(`chats/${chat_uuid}/messages`, {json: {...obj}})
    .json()
}
export const sendFNS = (telegram_chat_id: string, file: File): Promise<DataObj<FNST>> => {
  const body = new FormData();
  body.append('telegram_chat_id', telegram_chat_id)
  body.append('file', file)
  return api.mainKy
    .post(`fns`, {body})
    .json()
}