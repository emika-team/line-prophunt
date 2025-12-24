import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi, type SessionsFilter } from '@/api/sessions'

export function useSessions(filter: SessionsFilter = {}) {
  const queryClient = useQueryClient()

  const sessionsQuery = useQuery({
    queryKey: ['sessions', filter],
    queryFn: () => sessionsApi.getAll(filter),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  return {
    sessions: sessionsQuery.data?.data ?? [],
    total: sessionsQuery.data?.total ?? 0,
    totalPages: sessionsQuery.data?.totalPages ?? 0,
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    markPaid: markPaidMutation.mutate,
    isMarkingPaid: markPaidMutation.isPending,
  }
}
