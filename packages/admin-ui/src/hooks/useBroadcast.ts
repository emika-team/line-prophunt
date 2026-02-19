import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  channelsApi,
  groupsApi,
  jobsApi,
  broadcastApi,
  type CreateChannelDto,
  type CreateGroupDto,
  type CreateBroadcastJobDto,
  type QuickBroadcastDto,
} from '@/api/broadcast'

// ============ Channels Hook ============

export function useChannels() {
  const queryClient = useQueryClient()

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: channelsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateChannelDto) => channelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateChannelDto & { isActive: boolean }> }) =>
      channelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => channelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  return {
    channels: channelsQuery.data ?? [],
    isLoading: channelsQuery.isLoading,
    error: channelsQuery.error,
    refetch: channelsQuery.refetch,
    createChannel: createMutation.mutate,
    updateChannel: updateMutation.mutate,
    deleteChannel: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// ============ Groups Hook ============

export function useGroups(channelId?: string) {
  const queryClient = useQueryClient()

  const groupsQuery = useQuery({
    queryKey: ['groups', channelId],
    queryFn: () => groupsApi.getAll(channelId),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupDto) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGroupDto & { isActive: boolean }> }) =>
      groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isLoading,
    error: groupsQuery.error,
    refetch: groupsQuery.refetch,
    createGroup: createMutation.mutate,
    updateGroup: updateMutation.mutate,
    deleteGroup: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// ============ Group Members Hook ============

export function useGroupMembers(groupId: string) {
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupsApi.getMembers(groupId),
    enabled: !!groupId,
  })

  const addMembersMutation = useMutation({
    mutationFn: (data: { playerIds?: string[]; customKeys?: string[] }) =>
      groupsApi.addMembers(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const removeMembersMutation = useMutation({
    mutationFn: (data: { playerId?: string; customKey?: string; clearAll?: boolean }) =>
      groupsApi.removeMembers(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    refetch: membersQuery.refetch,
    addMembers: addMembersMutation.mutateAsync,
    removeMembers: removeMembersMutation.mutateAsync,
    isAdding: addMembersMutation.isPending,
    isRemoving: removeMembersMutation.isPending,
  }
}

// ============ Broadcast Jobs Hook ============

export function useBroadcastJobs(filters?: { status?: string; gameId?: string; limit?: number }) {
  const queryClient = useQueryClient()

  const jobsQuery = useQuery({
    queryKey: ['broadcast-jobs', filters],
    queryFn: () => jobsApi.getAll(filters),
    refetchInterval: 5000, // Poll every 5 seconds for job updates
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateBroadcastJobDto) => jobsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-jobs'] })
    },
  })

  const processMutation = useMutation({
    mutationFn: (id: string) => jobsApi.process(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-jobs'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-jobs'] })
    },
  })

  return {
    jobs: jobsQuery.data ?? [],
    isLoading: jobsQuery.isLoading,
    error: jobsQuery.error,
    refetch: jobsQuery.refetch,
    createJob: createMutation.mutateAsync,
    processJob: processMutation.mutateAsync,
    cancelJob: cancelMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isProcessing: processMutation.isPending,
    isCancelling: cancelMutation.isPending,
  }
}

// ============ Job Results Hook ============

export function useJobResults(jobId: string, filters?: { success?: boolean; limit?: number; offset?: number }) {
  const resultsQuery = useQuery({
    queryKey: ['job-results', jobId, filters],
    queryFn: () => jobsApi.getResults(jobId, filters),
    enabled: !!jobId,
  })

  return {
    results: resultsQuery.data?.data ?? [],
    total: resultsQuery.data?.total ?? 0,
    isLoading: resultsQuery.isLoading,
    error: resultsQuery.error,
    refetch: resultsQuery.refetch,
  }
}

// ============ Quick Broadcast Hook ============

export function useQuickBroadcast() {
  const queryClient = useQueryClient()

  const broadcastMutation = useMutation({
    mutationFn: (data: QuickBroadcastDto) => broadcastApi.quick(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-jobs'] })
    },
  })

  return {
    broadcast: broadcastMutation.mutateAsync,
    isBroadcasting: broadcastMutation.isPending,
    error: broadcastMutation.error,
  }
}
