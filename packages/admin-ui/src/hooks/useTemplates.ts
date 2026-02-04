import { useQuery } from '@tanstack/react-query'
import { templatesApi } from '@/api/templates'

export function useTemplates() {
  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll,
  })

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
  }
}
