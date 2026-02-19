import apiClient from './client'

export interface MessageTemplate {
  _id: string
  name: string
  description: string | null
  category: string
  type: string
  content: object
  variables: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateMessageTemplateDto {
  name: string
  description?: string
  category: string
  type?: string
  content: object
  variables?: string[]
}

export interface SendTemplateDto {
  customKeys: string[]
  variables: Record<string, string>
  altText?: string
}

export interface SendResult {
  total: number
  sent: number
  failed: number
  results: Array<{ customKey: string; success: boolean; error?: string }>
}

export const messageTemplatesApi = {
  getAll: async (category?: string): Promise<MessageTemplate[]> => {
    const url = category 
      ? `/admin/message-templates?category=${category}`
      : '/admin/message-templates'
    const response = await apiClient.get(url)
    return response.data
  },

  getById: async (id: string): Promise<MessageTemplate> => {
    const response = await apiClient.get(`/admin/message-templates/${id}`)
    return response.data
  },

  create: async (data: CreateMessageTemplateDto): Promise<MessageTemplate> => {
    const response = await apiClient.post('/admin/message-templates', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateMessageTemplateDto>): Promise<MessageTemplate> => {
    const response = await apiClient.put(`/admin/message-templates/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/message-templates/${id}`)
  },

  seed: async (): Promise<{ created: number; skipped: number }> => {
    const response = await apiClient.post('/admin/message-templates/seed')
    return response.data
  },

  render: async (id: string, variables: Record<string, string>): Promise<{ content: object }> => {
    const response = await apiClient.post(`/admin/message-templates/${id}/render`, { variables })
    return response.data
  },

  send: async (id: string, data: SendTemplateDto): Promise<SendResult> => {
    const response = await apiClient.post(`/admin/message-templates/${id}/send`, data)
    return response.data
  },
}
