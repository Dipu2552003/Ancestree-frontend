import { req } from './client'
import type { AppNotification } from './types'

export const notifications = {
  list: () =>
    req<{ notifications: AppNotification[]; unread_count: number }>('/api/notifications'),

  markRead: (id: string) =>
    req<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () =>
    req<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
}
