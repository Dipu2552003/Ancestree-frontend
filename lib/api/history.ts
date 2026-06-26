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
  /** This viewer performed the action. */
  is_actor:     boolean
  /** This viewer may undo it right now → active Undo button. */
  can_undo:     boolean
  /** Undo blocked for now → disabled "locked" state. */
  undo_locked:  boolean
  /** 'order' = a newer change must be undone first; 'owner' = next in line but
   *  only its actor / an admin may undo it. */
  lock_reason:  'order' | 'owner' | null
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
