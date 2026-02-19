import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messageTemplatesApi, type CreateMessageTemplateDto, type SendTemplateDto } from '@/api/message-templates'

export function useMessageTemplates(category?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['message-templates', category],
    queryFn: () => messageTemplatesApi.getAll(category),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateMessageTemplateDto) => messageTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMessageTemplateDto> }) =>
      messageTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messageTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })

  const seedMutation = useMutation({
    mutationFn: () => messageTemplatesApi.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] })
    },
  })

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTemplate: createMutation.mutate,
    updateTemplate: updateMutation.mutate,
    deleteTemplate: deleteMutation.mutate,
    seedTemplates: seedMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSeeding: seedMutation.isPending,
  }
}

export function useSendTemplate() {
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SendTemplateDto }) =>
      messageTemplatesApi.send(id, data),
  })

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  }
}

export function useRenderTemplate() {
  const mutation = useMutation({
    mutationFn: ({ id, variables }: { id: string; variables: Record<string, string> }) =>
      messageTemplatesApi.render(id, variables),
  })

  return {
    render: mutation.mutateAsync,
    isRendering: mutation.isPending,
  }
}
