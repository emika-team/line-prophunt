import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, type LoginDto } from '@/api/auth'

// Temporary mock credentials for development
const MOCK_CREDENTIALS = { username: 'admin', password: 'admin' }

export function useAuth() {
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: async (data: LoginDto) => {
      // Mock auth for development - bypass API call
      if (data.username === MOCK_CREDENTIALS.username && data.password === MOCK_CREDENTIALS.password) {
        return { token: 'mock-token-dev' }
      }
      // Try real API if mock fails
      try {
        return await authApi.login(data)
      } catch {
        throw new Error('Invalid credentials')
      }
    },
    onSuccess: (response) => {
      localStorage.setItem('token', response.token)
      navigate('/')
    },
  })

  const logout = () => {
    authApi.logout()
    navigate('/login')
  }

  const isAuthenticated = authApi.isAuthenticated()

  return {
    login: loginMutation.mutate,
    logout,
    isAuthenticated,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
  }
}
