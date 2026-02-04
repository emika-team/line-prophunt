import apiClient from './client'

export interface DashboardStats {
  game: {
    totalPlayers: number
    totalSessions: number
    totalWinners: number
    winRate: number
  }
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard')
    return response.data
  },
}
