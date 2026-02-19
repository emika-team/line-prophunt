import apiClient from './client'

// ============ Types ============

export interface Channel {
  _id: string
  channelId: string
  channelName: string
  isActive: boolean
  playerCount: number
  createdAt: string
  updatedAt: string
}

export interface Group {
  _id: string
  name: string
  description: string | null
  channelId: string | null
  isActive: boolean
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  _id: string
  customerId: string
  customKey: string
  displayName: string
  groupId: string
  state: string
  createdAt: string
}

export interface BroadcastJob {
  _id: string
  gameId: string
  game?: { id: string; name: string }
  targetType: 'all' | 'channel' | 'group' | 'custom'
  targetId: string | null
  customMessage: string | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  totalRecipients: number
  processed: number
  sent: number
  failed: number
  progress: number
  batchSize: number
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface BroadcastResult {
  _id: string
  customKey: string
  success: boolean
  errorMessage: string | null
  sentAt: string
}

export interface CreateChannelDto {
  channelId: string
  channelName: string
  channelSecret?: string
  accessToken?: string
}

export interface CreateGroupDto {
  name: string
  description?: string
  channelId?: string
}

export interface CreateBroadcastJobDto {
  gameId: string
  targetType: 'all' | 'channel' | 'group' | 'custom'
  targetId?: string
  customKeys?: string[]
  customMessage?: string
  batchSize?: number
  processImmediately?: boolean
}

export interface QuickBroadcastDto {
  gameId: string
  targetType: 'all' | 'channel' | 'group' | 'custom'
  targetId?: string
  customKeys?: string[]
  customMessage?: string
  // Send mode options
  channelId?: string
  groupId?: string
}

// ============ Channels API ============

export const channelsApi = {
  getAll: async (): Promise<Channel[]> => {
    const response = await apiClient.get('/admin/broadcast/channels')
    return response.data
  },

  getById: async (id: string): Promise<Channel> => {
    const response = await apiClient.get(`/admin/broadcast/channels/${id}`)
    return response.data
  },

  create: async (data: CreateChannelDto): Promise<Channel> => {
    const response = await apiClient.post('/admin/broadcast/channels', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateChannelDto & { isActive: boolean }>): Promise<Channel> => {
    const response = await apiClient.put(`/admin/broadcast/channels/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/broadcast/channels/${id}`)
  },
}

// ============ Groups API ============

export const groupsApi = {
  getAll: async (channelId?: string): Promise<Group[]> => {
    const params = channelId ? { channelId } : {}
    const response = await apiClient.get('/admin/broadcast/groups', { params })
    return response.data
  },

  getById: async (id: string): Promise<Group> => {
    const response = await apiClient.get(`/admin/broadcast/groups/${id}`)
    return response.data
  },

  create: async (data: CreateGroupDto): Promise<Group> => {
    const response = await apiClient.post('/admin/broadcast/groups', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateGroupDto & { isActive: boolean }>): Promise<Group> => {
    const response = await apiClient.put(`/admin/broadcast/groups/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/broadcast/groups/${id}`)
  },

  // Members
  getMembers: async (groupId: string): Promise<GroupMember[]> => {
    const response = await apiClient.get(`/admin/broadcast/groups/${groupId}/members`)
    return response.data
  },

  addMembers: async (groupId: string, data: { playerIds?: string[]; customKeys?: string[] }): Promise<{ added: number; skipped: number; notFound?: number }> => {
    const response = await apiClient.post(`/admin/broadcast/groups/${groupId}/members`, data)
    return response.data
  },

  removeMembers: async (groupId: string, data: { playerId?: string; customKey?: string; clearAll?: boolean }): Promise<{ success?: boolean; removed?: number }> => {
    const response = await apiClient.delete(`/admin/broadcast/groups/${groupId}/members`, { data })
    return response.data
  },
}

// ============ Jobs API ============

export const jobsApi = {
  getAll: async (filters?: { status?: string; gameId?: string; limit?: number }): Promise<BroadcastJob[]> => {
    const response = await apiClient.get('/admin/broadcast/jobs', { params: filters })
    return response.data
  },

  getById: async (id: string): Promise<BroadcastJob> => {
    const response = await apiClient.get(`/admin/broadcast/jobs/${id}`)
    return response.data
  },

  create: async (data: CreateBroadcastJobDto): Promise<BroadcastJob> => {
    const response = await apiClient.post('/admin/broadcast/jobs', data)
    return response.data
  },

  process: async (id: string): Promise<{ hasMore: boolean; processed: number; sent: number; failed: number }> => {
    const response = await apiClient.post(`/admin/broadcast/jobs/${id}/process`)
    return response.data
  },

  cancel: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/broadcast/jobs/${id}/cancel`)
    return response.data
  },

  getResults: async (id: string, filters?: { success?: boolean; limit?: number; offset?: number }): Promise<{ data: BroadcastResult[]; total: number; limit: number; offset: number }> => {
    const response = await apiClient.get(`/admin/broadcast/jobs/${id}/results`, { params: filters })
    return response.data
  },
}

// ============ Quick Broadcast API ============

export const broadcastApi = {
  quick: async (data: QuickBroadcastDto): Promise<{ total: number; sent: number; failed: number; jobId: string }> => {
    const response = await apiClient.post('/admin/broadcast/quick', data)
    return response.data
  },
}
