import { useQuery } from '@tanstack/react-query'
import { surveyApi } from '@/api/survey'

export function useSurvey() {
  const statsQuery = useQuery({
    queryKey: ['survey', 'stats'],
    queryFn: surveyApi.getStats,
  })

  const responsesQuery = useQuery({
    queryKey: ['survey', 'responses'],
    queryFn: surveyApi.getResponses,
  })

  return {
    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,
    responses: responsesQuery.data ?? [],
    isResponsesLoading: responsesQuery.isLoading,
  }
}
