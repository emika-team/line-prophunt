import apiClient from './client'

export interface Game {
  _id: string
  name: string
  imageUrl: string
  correctPosition: 1 | 2 | 3
  isActive: boolean
  sessionsCount?: number
  winRate?: number
  createdAt: string
  updatedAt: string
}

export interface CreateGameDto {
  name: string
  imageUrl: string
  correctPosition: 1 | 2 | 3
  isActive: boolean
}

export interface UpdateGameDto extends Partial<CreateGameDto> {}

export const gamesApi = {
  getAll: async (): Promise<Game[]> => {
    const response = await apiClient.get('/admin/games')
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
}
