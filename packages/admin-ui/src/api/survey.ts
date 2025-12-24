import apiClient from './client'

export interface SurveyResponse {
  _id: string
  customerId: string
  displayName: string
  groupId: string
  score: number
  createdAt: string
}

export interface SurveyStats {
  totalResponses: number
  averageScore: number
  scoreDistribution: { score: number; count: number }[]
}

export const surveyApi = {
  getStats: async (): Promise<SurveyStats> => {
    const response = await apiClient.get('/admin/survey/stats')
    return response.data
  },

  getResponses: async (): Promise<SurveyResponse[]> => {
    const response = await apiClient.get('/admin/survey/responses')
    return response.data
  },
}
