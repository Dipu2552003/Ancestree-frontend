import { req } from './client'

// One logical operation from the backend audit log — a multi-step action
// (merge, delete with edge cleanup, …) is a single entry here.
export interface HistoryOperation {
  operation_id: string
  action:       string
  summary:      string
  actor_id:     string | null
  actor_name:   string | null
  created_at:   string
  entry_count:  number
  reverted:     boolean
  reverted_by:  string | null
  can_undo:     boolean
}

export interface UndoResult {
  undone_operation_id: string
  undo_operation_id:   string
  reverted_entries:    number
}

export const history = {
  list: (familyId: string, limit = 50) =>
    req<{ operations: HistoryOperation[] }>(`/api/family/${familyId}/history?limit=${limit}`),

  undo: (familyId: string, operationId: string) =>
    req<UndoResult>(`/api/family/${familyId}/history/${operationId}/undo`, { method: 'POST' }),
}
