
import ky, { type KyInstance } from 'ky'
import * as Tokens from './tokens'


import { useNotifyStore } from '../stores/notifications' // путь к вашему стору
import { appRouter } from "../router"
export class Server {
  mainKy: KyInstance
  
  constructor(
    url: string,
    option: { prefix: string; timeout?: number | false }
  ) {
    const prefixUrl = url + option.prefix
    const requestSessions = new WeakMap<Request, { session: string | null; authorization: string | null }>()
    const belongsToCurrentSession = (request: Request) => {
      const current = Tokens.getAccessToken()
      const snapshot = requestSessions.get(request)
      const authorization = snapshot?.authorization ?? request.headers.get('Authorization')
      return (!snapshot || snapshot.session === current) &&
        authorization === (current === null ? null : `Bearer ${current}`)
    }
    
    this.mainKy = ky.create({
      prefixUrl: prefixUrl,
      timeout: option.timeout ?? false,
      hooks: {
        beforeRequest: [
          (request) => {
            request.headers.set('X-Requested-With', 'ky')
            const accessToken = Tokens.getAccessToken()
            if (accessToken !== null && !request.headers.has('Authorization'))
              request.headers.set('Authorization', 'Bearer ' + accessToken)
            // Capture the effective credentials, including caller-supplied Authorization.
            if (!requestSessions.has(request)) {
              requestSessions.set(request, {
                session: accessToken,
                authorization: request.headers.get('Authorization'),
              })
            }
          },
        ],
        // Добавляем обработку ответов
        afterResponse: [
          async (_request, _options, response) => {
            if (!response.ok) {
              if (response.status === 401 && !belongsToCurrentSession(_request)) return
              const notify = useNotifyStore()
              
              // Пытаемся достать сообщение из тела ошибки
              let errorMessage = 'Произошла ошибка'
              try {
                const data = await response.clone().json() // .clone() важен, чтобы не "сжечь" поток тела
                errorMessage = data.message || errorMessage
              } catch {
                errorMessage = `Ошибка ${response.status}`
              }

              // Вызываем уведомление в зависимости от статуса
              if (response.status >= 500) {
                notify.add(errorMessage, 'negative')
              } else if (response.status === 401) {
                // Parsing the response is asynchronous; the account may have changed meanwhile.
                if (!belongsToCurrentSession(_request)) return
                Tokens.cleanTokensData()
                appRouter?.push({ name: 'Auth' })
                notify.add('Сессия истекла', 'warning')
              } else {
                notify.add(errorMessage, 'negative')
              }
            }
          }
        ]
      },
    })
  }
}


export const api = new Server(import.meta.env.VITE_API_URL!, {
  prefix: '/api'!,
})

// export const api = ky.create({
//   prefixUrl: import.meta.env.VITE_API_URL || '',
//   timeout: 10000
// })
