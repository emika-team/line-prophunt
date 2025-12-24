import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export function useDashboard() {
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  })

  const recentWinnersQuery = useQuery({
    queryKey: ['dashboard', 'recent-winners'],
    queryFn: () => dashboardApi.getRecentWinners(5),
  })

  const sessionsPerDayQuery = useQuery({
    queryKey: ['dashboard', 'sessions-per-day'],
    queryFn: () => dashboardApi.getSessionsPerDay(7),
  })

  return {
    stats: statsQuery.data,
    recentWinners: recentWinnersQuery.data ?? [],
    sessionsPerDay: sessionsPerDayQuery.data ?? [],
    isLoading:
      statsQuery.isLoading ||
      recentWinnersQuery.isLoading ||
      sessionsPerDayQuery.isLoading,
    error: statsQuery.error || recentWinnersQuery.error || sessionsPerDayQuery.error,
  }
}
