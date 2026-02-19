import { useMutation } from '@tanstack/react-query'
import { notificationsApi, type SendNotificationDto } from '@/api/notifications'

export function useSendNotification() {
  const mutation = useMutation({
    mutationFn: (data: SendNotificationDto) => notificationsApi.send(data),
  })

  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  }
}
