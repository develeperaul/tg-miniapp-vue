
 

import { type DataObj, type EmployeeT, type ProfileT } from '../models/api';
import { api } from './index'
import * as Tokens from './tokens'

export const setFRB =  (
  token: string
) => {
  const body = new FormData()
  body.append('token', token)
  return api.mainKy.post('firebase/token', { body }).json()
}

export const uploadFile = (
  file: File
): Promise<DataObj<{  uuid: string; url: string } >> => {
  const body = new FormData()
  body.append('media', file)
  return api.mainKy.post('temp-media', { body }).json()
}

export const uploadFileWithProgress = (
  file: File,
  onProgress?: (percent: number) => void
): Promise<DataObj<{ uuid: string; url: string }>> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('media', file)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.open('POST', import.meta.env.VITE_API_URL + '/api/temp-media')
    xhr.setRequestHeader('Authorization', 'Bearer ' + Tokens.getAccessToken())
    xhr.send(formData)
  })
}
export const getEmployees = (): Promise<DataObj<EmployeeT[] >> => {
  return api.mainKy('employees').json()
}
export const getProfile = (): Promise<DataObj<ProfileT >> => {
  return api.mainKy('profile').json()
}