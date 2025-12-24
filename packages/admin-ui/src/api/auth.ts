import apiClient from './client'

export interface LoginDto {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
}

export const authApi = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    const response = await apiClient.post('/admin/auth/login', data)
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },
}
