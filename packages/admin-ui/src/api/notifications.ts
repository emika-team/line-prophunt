import apiClient from './client'

export interface FlexMessage {
  type: 'flex'
  altText: string
  contents: object
}

export interface TextMessage {
  type: 'text'
  text: string
}

export interface ImageMessage {
  type: 'image'
  originalContentUrl: string
  previewImageUrl: string
}

export type LineMessage = FlexMessage | TextMessage | ImageMessage

export interface SendNotificationDto {
  customKeys: string[]
  messages: LineMessage[]
}

export interface SendNotificationResult {
  total: number
  sent: number
  failed: number
  results: Array<{ customKey: string; success: boolean; error?: string }>
}

export const notificationsApi = {
  send: async (data: SendNotificationDto): Promise<SendNotificationResult> => {
    const response = await apiClient.post('/admin/notifications/send', data)
    return response.data
  },
}
