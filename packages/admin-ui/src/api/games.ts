import apiClient from './client'
import type { GameTemplate } from './templates'

export interface CustomZone {
  x: number
  y: number
  width: number
  height: number
}

export interface WinMessageConfig {
  reward?: string
  message?: string
  buttonText?: string
  buttonUrl?: string
}

export interface LoseMessageConfig {
  message?: string
  buttonText?: string
  buttonUrl?: string
}

export interface Game {
  _id: string
  name: string
  templateId: GameTemplate | string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  correctPosition: number
  customZone?: CustomZone
  missionTagId?: number | null
  winMessageConfig?: WinMessageConfig | null
  loseMessageConfig?: LoseMessageConfig | null
  isActive: boolean
  sessionsCount?: number
  winRate?: number
  createdAt: string
  updatedAt: string
}

export interface CreateGameDto {
  name: string
  templateId: string
  imageUrl: string
  imageWidth?: number
  imageHeight?: number
  correctPosition: number
  customZone?: CustomZone
  missionTagId?: number | null
  winMessageConfig?: WinMessageConfig | null
  loseMessageConfig?: LoseMessageConfig | null
  isActive: boolean
}

export interface MissionTag {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface UpdateGameDto extends Partial<CreateGameDto> {}

export interface BroadcastGameDto {
  customKeys: string[]
  customMessage?: string
}

export interface BroadcastResult {
  total: number
  sent: number
  failed: number
  sessionsCreated: number
  results: Array<{ customKey: string; success: boolean; error?: string }>
}

export const gamesApi = {
  getAll: async (): Promise<Game[]> => {
    const response = await apiClient.get('/admin/games')
    return response.data
  },

  getMissionTags: async (): Promise<MissionTag[]> => {
    const response = await apiClient.get('/admin/mission-tags')
    return response.data
  },

  getById: async (id: string): Promise<Game> => {
    const response = await apiClient.get(`/admin/games/${id}`)
    return response.data
  },

  create: async (data: CreateGameDto): Promise<Game> => {
    const response = await apiClient.post('/admin/games', data)
    return response.data
  },

  update: async (id: string, data: UpdateGameDto): Promise<Game> => {
    const response = await apiClient.put(`/admin/games/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/games/${id}`)
  },

  broadcast: async (id: string, data: BroadcastGameDto): Promise<BroadcastResult> => {
    const response = await apiClient.post(`/admin/games/${id}/broadcast`, data)
    return response.data
  },
}
