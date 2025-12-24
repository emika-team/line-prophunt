import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, type LoginDto } from '@/api/auth'

export function useAuth() {
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),
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
