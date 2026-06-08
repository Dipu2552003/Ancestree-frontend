import { req } from './client'
import type { PotentialMatch, SentMergeRequest, MergeConflict } from './types'

export const merges = {
  searchDuplicates: (name: string) =>
    req<{ results: PotentialMatch[] }>(`/api/merges/search?name=${encodeURIComponent(name)}`),

  getById: (id: string) =>
    req<{
      id: string; status: string
      canonical_person_id: string; canonical_person_name: string
      canonical_family_id: string; canonical_family_name: string
      merged_person_id:    string; merged_person_name:    string
      merged_family_id:    string; merged_family_name:    string
      created_at: string
    }>(`/api/merges/${id}`),

  create: (b: { new_person_id: string; canonical_person_id: string }) =>
    req<{ merge_record_id: string }>('/api/merges', {
      method: 'POST', body: JSON.stringify(b),
    }),

  listSent: () =>
    req<{ requests: SentMergeRequest[] }>('/api/merges/sent'),

  accept: (mergeRecordId: string) =>
    req<{ canonical_person_id: string; conflicts: MergeConflict[] }>(
      `/api/merges/${mergeRecordId}/accept`, { method: 'POST' },
    ),

  reject: (mergeRecordId: string) =>
    req<{ success: boolean }>(`/api/merges/${mergeRecordId}/reject`, { method: 'POST' }),
}
