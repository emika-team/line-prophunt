import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi, type CreateGameDto, type UpdateGameDto, type BroadcastGameDto } from '@/api/games'

export function useGames() {
  const queryClient = useQueryClient()

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGameDto) => gamesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGameDto }) =>
      gamesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gamesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })

  const broadcastMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BroadcastGameDto }) =>
      gamesApi.broadcast(id, data),
  })

  return {
    games: gamesQuery.data ?? [],
    isLoading: gamesQuery.isLoading,
    error: gamesQuery.error,
    createGame: createMutation.mutate,
    updateGame: updateMutation.mutate,
    deleteGame: deleteMutation.mutate,
    broadcastGame: broadcastMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBroadcasting: broadcastMutation.isPending,
  }
}
