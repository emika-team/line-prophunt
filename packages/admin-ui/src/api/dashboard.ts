import apiClient from './client'

export interface DashboardStats {
  players: {
    total: number
    change: number
  }
  sessions: {
    total: number
    change: number
  }
  winners: {
    total: number
    change: number
  }
}

export interface RecentWinner {
  _id: string
  playerName: string
  gameName: string
  createdAt: string
}

export interface SessionsPerDay {
  date: string
  count: number
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard')
    return response.data
  },

  getRecentWinners: async (limit: number = 5): Promise<RecentWinner[]> => {
    const response = await apiClient.get('/admin/dashboard/recent-winners', {
      params: { limit },
    })
    return response.data
  },

  getSessionsPerDay: async (days: number = 7): Promise<SessionsPerDay[]> => {
    const response = await apiClient.get('/admin/dashboard/sessions-per-day', {
      params: { days },
    })
    return response.data
  },
}
