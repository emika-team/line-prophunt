import apiClient from './client'

export interface ClickableArea {
  position: number
  x: number
  y: number
  width: number
  height: number
}

export interface HeaderConfig {
  title: string
  subtitle?: string
  bgColor: string
  textColor: string
  height: number
}

export interface ContentConfig {
  layout: string
  labels?: string[]
  borderRadius?: number
  gap?: number
}

export interface GameTemplate {
  _id: string
  name: string
  description: string
  type: 'grid_2x2' | 'question_1_3' | 'tap_zone' | 'compare_1x2'
  header: HeaderConfig
  content: ContentConfig
  clickableAreas: ClickableArea[]
  totalZones: number
  singleAttempt: boolean
  templateImageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const templatesApi = {
  getAll: async (): Promise<GameTemplate[]> => {
    const response = await apiClient.get('/admin/templates')
    return response.data
  },

  getById: async (id: string): Promise<GameTemplate> => {
    const response = await apiClient.get(`/admin/templates/${id}`)
    return response.data
  },
}
