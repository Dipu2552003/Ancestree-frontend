import { req } from './client'

export const relationships = {
  create: (b: {
    from_person_id: string
    to_person_id: string
    rel_type: 'PARENT_OF' | 'SPOUSE_OF' | 'SIBLING_OF'
    sub_type?: string
    union_year?: number
    separation_year?: number
  }) => req<{ id: string }>('/api/relationships', {
    method: 'POST', body: JSON.stringify(b),
  }),

  update: (id: string, b: {
    sub_type?: string
    union_year?: number | null
    separation_year?: number | null
    notes?: string | null
  }) => req<{ id: string }>(`/api/relationships/${id}`, {
    method: 'PATCH', body: JSON.stringify(b),
  }),

  delete: (id: string) =>
    req<{ success: boolean }>(`/api/relationships/${id}`, { method: 'DELETE' }),
}
