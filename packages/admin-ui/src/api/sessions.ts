import apiClient from './client'

export interface GameSession {
  _id: string
  player: {
    _id: string
    displayName: string
    customerId: string
  }
  game: {
    _id: string
    name: string
  }
  answer: number
  isCorrect: boolean
  rewardStatus: 'pending' | 'paid'
  createdAt: string
}

export interface SessionsFilter {
  winnersOnly?: boolean
  gameId?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}

export interface SessionsResponse {
  data: GameSession[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const sessionsApi = {
  getAll: async (filter: SessionsFilter = {}): Promise<SessionsResponse> => {
    const response = await apiClient.get('/admin/sessions', { params: filter })
    return response.data
  },

  markPaid: async (id: string): Promise<GameSession> => {
    const response = await apiClient.put(`/admin/sessions/${id}`, {
      rewardStatus: 'paid',
    })
    return response.data
  },

  clear: async (gameId?: string): Promise<{ deleted: number }> => {
    const response = await apiClient.delete('/admin/sessions', {
      params: gameId ? { gameId } : undefined,
    })
    return response.data
  },
}
